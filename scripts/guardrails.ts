/**
 * Instara Crew guardrails.
 *
 * The project performs real comment automation. Guardrails enforce the intended
 * scope across both execution runtimes: commenting only, instagram.com only,
 * rate limited, dry-run capable and stoppable by the operator.
 */
import fs from "node:fs";
import path from "node:path";

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(path.resolve("src")).filter((p) => /\.(ts|tsx)$/.test(p));
const sources = new Map(files.map((p) => [p, fs.readFileSync(p, "utf8")]));
const text = [...sources.values()].join("\n");
const worker = sources.get(path.resolve("src/worker.ts")) ?? "";
const publisher = sources.get(path.resolve("src/lib/publisher.ts")) ?? "";
const androidRuntime = sources.get(path.resolve("src/lib/android.ts")) ?? "";
const bridgePath = path.resolve("scripts/android_bridge.py");
const androidBridge = fs.existsSync(bridgePath) ? fs.readFileSync(bridgePath, "utf8") : "";

const errors: string[] = [];

/* 1. Out-of-scope automation must stay out. */
const forbidden = [
  "unfollow(",
  "massFollow",
  "instagrapi",
  "loginWithPassword",
  "password:",
  'fill("input[name="password"]',
  "scrapeFollowers",
];
for (const needle of forbidden) {
  if (text.includes(needle)) errors.push(`Forbidden capability found: ${needle}`);
}

/* 2. Target domain allow-list on both browser and Android runtimes. */
if (!text.includes("assertInstagramUrl")) {
  errors.push("Missing browser assertInstagramUrl domain allow-list.");
}
if (!androidRuntime.includes("assertInstagramTarget")) {
  errors.push("Missing Android instagram.com domain allow-list.");
}

/* 3. Rate limiting must be wired into the publication path. */
if (!text.includes("checkAccountLimits")) {
  errors.push("Rate limiter checkAccountLimits is not used.");
}
if (!worker.includes("checkAccountLimits")) {
  errors.push("Worker publishes without calling checkAccountLimits.");
}

/* 4. Dry-run path must exist and be honoured by both runtimes. */
if (!text.includes("dryRun")) errors.push("Browser/worker dry-run mode is missing.");
if (!text.includes('code: "DRY_RUN"')) errors.push("Browser dry-run outcome is missing.");
if (!androidBridge.includes("dry_run") || !androidBridge.includes("field.clear_text()")) {
  errors.push("Android bridge must implement a non-submitting dry-run path.");
}

/* 5. Operator kill switch: pause/cancel must stop a running job. */
if (!worker.includes("jobIsStopped")) {
  errors.push("Worker cannot be stopped by the operator (jobIsStopped missing).");
}

/* 6. Block detection must pause the account instead of retrying. */
if (!text.includes("ACTION_BLOCKED") || !androidBridge.includes("ACTION_BLOCKED")) {
  errors.push("Missing action-block detection across Browser/Android runtimes.");
}

/* 7. Operator-assist flow must remain available. */
if (!text.includes("openTargetForOperator")) {
  errors.push("Missing operator-assist browser flow.");
}

/* 8. Android runtime must be dispatched explicitly, never as an implicit fallback. */
if (!publisher.includes('value === "ANDROID_ADB"') || !publisher.includes("publishAndroidComment")) {
  errors.push("Android execution engine is not explicitly dispatched by publisher.ts.");
}
if (!worker.includes('authType: "BROWSER_SESSION"')) {
  errors.push("Preparation worker must exclude Meta OAuth accounts from interactive comment jobs.");
}

/* 9. Python bridge must stay narrow and avoid arbitrary shell execution. */
if (!androidBridge.includes('ALLOWED_ACTIONS = {"health", "open_home", "open_target", "stop", "publish"}')) {
  errors.push("Android bridge action surface changed; review required.");
}
if (/shell\s*=\s*True/.test(androidBridge)) {
  errors.push("Android bridge must not invoke subprocesses with shell=True.");
}
for (const needle of ["unfollow", "mass_follow", "scrape_followers", "send_dm", "direct_message"]) {
  if (androidBridge.toLowerCase().includes(needle)) {
    errors.push(`Forbidden Android bridge capability found: ${needle}`);
  }
}

if (errors.length) {
  console.error("Guardrail violations:");
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log("Guardrails OK (Browser + Android, comment-only, domain-locked, rate-limited, stoppable).");
