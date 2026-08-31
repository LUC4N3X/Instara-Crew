import {
  AndroidAutomationError,
  checkAndroidDevice,
  openAndroidHome,
  openAndroidTarget,
  publishAndroidComment,
  stopAndroidApp,
} from "./android";
import {
  closeContext,
  openAccountLogin,
  openTargetForOperator,
  type AccountBrowserOptions,
} from "./browser";
import { InstagramError, publishComment, type PostOutcome } from "./instagram";

export type ExecutionEngine = "BROWSER" | "ANDROID_ADB";

export type RuntimeAccount = AccountBrowserOptions & {
  profileKey: string;
  authType?: string | null;
  executionEngine?: string | null;
  adbSerial?: string | null;
  androidPackage?: string | null;
};

export function normalizeExecutionEngine(value?: string | null): ExecutionEngine {
  return value === "ANDROID_ADB" ? "ANDROID_ADB" : "BROWSER";
}

function assertInteractiveAccount(account: RuntimeAccount) {
  if (account.authType === "META_OAUTH") {
    throw new Error("Gli account Meta OAuth non usano il runtime interattivo Browser/Android.");
  }
}

function androidConfig(account: RuntimeAccount) {
  const adbSerial = account.adbSerial?.trim();
  if (!adbSerial) {
    throw new Error("Account Android senza adbSerial configurato. Apri /android e associa un device.");
  }
  return { adbSerial, androidPackage: account.androidPackage || "com.instagram.android" };
}

function mapAndroidError(error: unknown): never {
  if (error instanceof AndroidAutomationError) {
    if (
      error.code === "NEEDS_LOGIN" ||
      error.code === "ACTION_BLOCKED" ||
      error.code === "NOT_FOUND" ||
      error.code === "UNVERIFIED"
    ) {
      throw new InstagramError(error.code, error.message);
    }
  }
  throw error;
}

export async function publishCommentForAccount(
  account: RuntimeAccount,
  input: { targetUrl: string; commentText: string; dryRun: boolean }
): Promise<PostOutcome> {
  assertInteractiveAccount(account);

  if (normalizeExecutionEngine(account.executionEngine) === "ANDROID_ADB") {
    const config = androidConfig(account);
    try {
      return await publishAndroidComment({
        ...config,
        targetUrl: input.targetUrl,
        commentText: input.commentText,
        dryRun: input.dryRun,
      });
    } catch (error) {
      mapAndroidError(error);
    }
  }

  return publishComment({
    profileKey: account.profileKey,
    targetUrl: input.targetUrl,
    commentText: input.commentText,
    dryRun: input.dryRun,
    browserOptions: account,
  });
}

export async function openAccountRuntime(account: RuntimeAccount) {
  assertInteractiveAccount(account);

  if (normalizeExecutionEngine(account.executionEngine) === "ANDROID_ADB") {
    const config = androidConfig(account);
    const health = await checkAndroidDevice(config.adbSerial, config.androidPackage);
    if (!health.packageInstalled) {
      throw new Error(`${config.androidPackage} non è installato sul device ${config.adbSerial}.`);
    }
    return openAndroidHome(config.adbSerial, config.androidPackage);
  }

  await openAccountLogin(account.profileKey, account);
  return { ok: true, message: "Browser account opened." };
}

export async function openTargetForAccount(account: RuntimeAccount, targetUrl: string) {
  assertInteractiveAccount(account);

  if (normalizeExecutionEngine(account.executionEngine) === "ANDROID_ADB") {
    const config = androidConfig(account);
    return openAndroidTarget(config.adbSerial, targetUrl, config.androidPackage);
  }

  await openTargetForOperator(account.profileKey, targetUrl, account);
  return { ok: true, message: "Target opened in browser." };
}

export async function closeAccountRuntime(account: RuntimeAccount) {
  if (account.authType === "META_OAUTH") return false;

  if (normalizeExecutionEngine(account.executionEngine) === "ANDROID_ADB") {
    const config = androidConfig(account);
    await stopAndroidApp(config.adbSerial, config.androidPackage);
    return true;
  }

  return closeContext(account.profileKey);
}
