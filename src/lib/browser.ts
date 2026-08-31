import path from "node:path";
import fs from "node:fs/promises";
import { chromium, BrowserContext, Page } from "playwright";
import { parseProxy, toPlaywrightProxy } from "./proxy";
import { resolveDeviceConfig, generateDeviceStealthScript, DeviceConfigInput } from "./devices";

const contexts = new Map<string, BrowserContext>();

export type AccountBrowserOptions = DeviceConfigInput & {
  proxyUrl?: string | null;
};

function profilePath(profileKey: string) {
  const root = process.env.BROWSER_PROFILE_ROOT || "./data/browser-profiles";
  return path.resolve(root, profileKey);
}

function headless() {
  return process.env.BROWSER_HEADLESS === "true";
}

export function assertInstagramUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("Only https targets are allowed.");
  if (!/(^|\.)instagram\.com$/i.test(url.hostname)) {
    throw new Error("Only instagram.com targets are allowed.");
  }
  return url;
}

export async function getContext(profileKey: string, options?: AccountBrowserOptions) {
  const existing = contexts.get(profileKey);
  if (existing) return existing;

  const dir = profilePath(profileKey);
  await fs.mkdir(dir, { recursive: true });

  const device = resolveDeviceConfig(options);
  const parsedProxy = parseProxy(options?.proxyUrl);
  const playwrightProxy = toPlaywrightProxy(parsedProxy);

  const windowArgs: string[] = [];
  if (!headless()) {
    if (device.isMobile) {
      const winW = Math.max(380, device.viewport.width + 18);
      const winH = Math.min(1020, device.viewport.height + 95);
      windowArgs.push(`--window-size=${winW},${winH}`);
    } else {
      windowArgs.push("--start-maximized");
    }
  }

  let context: BrowserContext;
  try {
    context = await chromium.launchPersistentContext(dir, {
      headless: headless(),
      proxy: playwrightProxy,
      viewport: device.viewport,
      userAgent: device.userAgent,
      deviceScaleFactor: device.deviceScaleFactor,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
      locale: "it-IT",
      timezoneId: process.env.BROWSER_TIMEZONE || "Europe/Rome",
      // Real Chrome UA/branding: Playwright's default build is more detectable.
      channel: process.env.BROWSER_CHANNEL || undefined,
      ignoreDefaultArgs: ["--enable-automation"],
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-features=IsolateOrigins,site-per-process",
        "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
        "--enforce-webrtc-ip-permission-check",
        ...windowArgs,
      ],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/SingletonLock|ProcessSingleton|already (in use|running)/i.test(message)) {
      throw new Error(
        `Il profilo browser "${profileKey}" è già aperto in un'altra finestra. Chiudi quella finestra e riprova.`
      );
    }
    throw error;
  }

  // Inject comprehensive mobile & anti-detection stealth script
  await context.addInitScript({ content: generateDeviceStealthScript(device) });

  context.on("close", () => contexts.delete(profileKey));
  contexts.set(profileKey, context);
  return context;
}

export async function closeContext(profileKey: string) {
  const context = contexts.get(profileKey);
  if (!context) return false;
  contexts.delete(profileKey);
  await context.close().catch(() => undefined);
  return true;
}

export async function closeAllContexts() {
  const keys = [...contexts.keys()];
  await Promise.all(keys.map((key) => closeContext(key)));
  return keys.length;
}

export async function openAccountLogin(profileKey: string, options?: AccountBrowserOptions) {
  const context = await getContext(profileKey, options);
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded" });
  await page.bringToFront();
}

export async function openTargetForOperator(
  profileKey: string,
  targetUrl: string,
  options?: AccountBrowserOptions
) {
  const url = assertInstagramUrl(targetUrl);
  const context = await getContext(profileKey, options);
  const page = await context.newPage();
  await page.goto(url.toString(), { waitUntil: "domcontentloaded" });
  await page.bringToFront();
}

export async function withPage<T>(
  profileKey: string,
  targetUrl: string,
  fn: (page: Page) => Promise<T>,
  options?: AccountBrowserOptions
): Promise<T> {
  const url = assertInstagramUrl(targetUrl);
  const context = await getContext(profileKey, options);
  const page = await context.newPage();
  try {
    await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 45_000 });
    return await fn(page);
  } finally {
    await page.close().catch(() => undefined);
  }
}
