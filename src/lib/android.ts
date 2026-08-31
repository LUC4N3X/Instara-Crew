import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type AndroidDevice = {
  serial: string;
  state: string;
  model?: string;
  product?: string;
  device?: string;
  transportId?: string;
};

export type AndroidHealth = {
  serial: string;
  package: string;
  packageInstalled: boolean;
  currentPackage?: string | null;
  model?: string | null;
  sdk?: number | null;
  width?: number | null;
  height?: number | null;
};

export type AndroidPostOutcome = {
  ok: boolean;
  code: "POSTED" | "DRY_RUN" | "NEEDS_LOGIN" | "ACTION_BLOCKED" | "NOT_FOUND" | "UNVERIFIED";
  message: string;
};

type BridgeResponse = {
  ok: boolean;
  code?: string;
  error?: string;
  message?: string;
  [key: string]: unknown;
};

const DEFAULT_ANDROID_PACKAGE = "com.instagram.android";
const SAFE_SERIAL = /^[A-Za-z0-9._:-]+$/;
const SAFE_PACKAGE = /^[A-Za-z0-9_.]+$/;

export class AndroidAutomationError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AndroidAutomationError";
    this.code = code;
  }
}

export function validateAdbSerial(serial: string) {
  const clean = serial.trim();
  if (!clean || !SAFE_SERIAL.test(clean)) {
    throw new AndroidAutomationError("DEVICE_UNAVAILABLE", "ADB device serial non valido o mancante.");
  }
  return clean;
}

export function validateAndroidPackage(packageName?: string | null) {
  const clean = (packageName || DEFAULT_ANDROID_PACKAGE).trim();
  if (!SAFE_PACKAGE.test(clean)) {
    throw new AndroidAutomationError("BRIDGE_ERROR", "Android package name non valido.");
  }
  return clean;
}

export function assertInstagramTarget(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("Only https targets are allowed.");
  if (!/(^|\.)instagram\.com$/i.test(url.hostname)) {
    throw new Error("Only instagram.com targets are allowed.");
  }
  return url;
}

export function parseAdbDevicesOutput(raw: string): AndroidDevice[] {
  const rows = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const devices: AndroidDevice[] = [];

  for (const line of rows) {
    if (/^List of devices attached/i.test(line) || line.startsWith("* daemon")) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 2) continue;

    const [serial, state, ...props] = parts;
    const metadata = new Map<string, string>();
    for (const token of props) {
      const index = token.indexOf(":");
      if (index <= 0) continue;
      metadata.set(token.slice(0, index), token.slice(index + 1));
    }

    devices.push({
      serial,
      state,
      model: metadata.get("model")?.replaceAll("_", " "),
      product: metadata.get("product"),
      device: metadata.get("device"),
      transportId: metadata.get("transport_id"),
    });
  }

  return devices;
}

export async function listAndroidDevices(): Promise<AndroidDevice[]> {
  try {
    const { stdout } = await execFileAsync(process.env.ADB_PATH || "adb", ["devices", "-l"], {
      timeout: 8_000,
      windowsHide: true,
      maxBuffer: 512 * 1024,
    });
    return parseAdbDevicesOutput(stdout);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AndroidAutomationError(
      "DEVICE_UNAVAILABLE",
      `ADB non disponibile. Installa Android Platform Tools o imposta ADB_PATH. Dettaglio: ${message}`
    );
  }
}

type PythonCandidate = { command: string; prefix: string[] };

function pythonCandidates(): PythonCandidate[] {
  if (process.env.ANDROID_PYTHON?.trim()) {
    return [{ command: process.env.ANDROID_PYTHON.trim(), prefix: [] }];
  }
  return process.platform === "win32"
    ? [
        { command: "py", prefix: ["-3"] },
        { command: "python", prefix: [] },
        { command: "python3", prefix: [] },
      ]
    : [
        { command: "python3", prefix: [] },
        { command: "python", prefix: [] },
      ];
}

function isCommandMissing(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}

async function runBridgeCandidate(
  candidate: PythonCandidate,
  payload: Record<string, unknown>,
  timeoutMs: number
): Promise<BridgeResponse> {
  const bridgePath = path.resolve(process.cwd(), "scripts/android_bridge.py");

  return new Promise((resolve, reject) => {
    const child = spawn(candidate.command, [...candidate.prefix, bridgePath], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const finishReject = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };

    const timer = setTimeout(() => {
      child.kill();
      finishReject(new AndroidAutomationError("BRIDGE_ERROR", `Android bridge timeout dopo ${timeoutMs}ms.`));
    }, timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (stdout.length > 1024 * 1024) child.kill();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
      if (stderr.length > 512 * 1024) child.kill();
    });

    child.on("error", (error) => finishReject(error));
    child.on("close", () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      const lines = stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const jsonLine = [...lines].reverse().find((line) => line.startsWith("{") && line.endsWith("}"));
      if (!jsonLine) {
        reject(
          new AndroidAutomationError(
            "BRIDGE_ERROR",
            `Risposta non valida dal bridge Android.${stderr.trim() ? ` ${stderr.trim().slice(0, 300)}` : ""}`
          )
        );
        return;
      }

      try {
        resolve(JSON.parse(jsonLine) as BridgeResponse);
      } catch (error) {
        reject(
          new AndroidAutomationError(
            "BRIDGE_ERROR",
            `JSON non valido dal bridge Android: ${error instanceof Error ? error.message : String(error)}`
          )
        );
      }
    });

    child.stdin.end(JSON.stringify(payload));
  });
}

async function invokeBridge(payload: Record<string, unknown>, timeoutMs = 60_000): Promise<BridgeResponse> {
  let lastMissing: unknown = null;

  for (const candidate of pythonCandidates()) {
    try {
      const response = await runBridgeCandidate(candidate, payload, timeoutMs);
      if (!response.ok) {
        throw new AndroidAutomationError(
          String(response.code || "BRIDGE_ERROR"),
          String(response.error || response.message || "Android bridge error")
        );
      }
      return response;
    } catch (error) {
      if (isCommandMissing(error)) {
        lastMissing = error;
        continue;
      }
      throw error;
    }
  }

  throw new AndroidAutomationError(
    "BRIDGE_UNAVAILABLE",
    `Python non trovato per il runtime Android.${lastMissing instanceof Error ? ` ${lastMissing.message}` : ""}`
  );
}

function runtimeInput(serial: string, packageName?: string | null) {
  return {
    serial: validateAdbSerial(serial),
    package: validateAndroidPackage(packageName),
  };
}

export async function checkAndroidDevice(serial: string, packageName?: string | null): Promise<AndroidHealth> {
  const base = runtimeInput(serial, packageName);
  const response = await invokeBridge({ action: "health", ...base }, 20_000);
  return response as unknown as AndroidHealth;
}

export async function openAndroidHome(serial: string, packageName?: string | null) {
  const base = runtimeInput(serial, packageName);
  return invokeBridge({ action: "open_home", ...base }, 25_000);
}

export async function openAndroidTarget(serial: string, targetUrl: string, packageName?: string | null) {
  const base = runtimeInput(serial, packageName);
  const target = assertInstagramTarget(targetUrl);
  return invokeBridge({ action: "open_target", targetUrl: target.toString(), ...base }, 35_000);
}

export async function stopAndroidApp(serial: string, packageName?: string | null) {
  const base = runtimeInput(serial, packageName);
  return invokeBridge({ action: "stop", ...base }, 20_000);
}

export async function publishAndroidComment(input: {
  adbSerial: string;
  androidPackage?: string | null;
  targetUrl: string;
  commentText: string;
  dryRun: boolean;
}): Promise<AndroidPostOutcome> {
  const base = runtimeInput(input.adbSerial, input.androidPackage);
  const target = assertInstagramTarget(input.targetUrl);
  const response = await invokeBridge(
    {
      action: "publish",
      targetUrl: target.toString(),
      commentText: input.commentText,
      dryRun: input.dryRun,
      ...base,
    },
    75_000
  );

  return {
    ok: Boolean(response.ok),
    code: String(response.code) as AndroidPostOutcome["code"],
    message: String(response.message || "Android publication completed."),
  };
}
