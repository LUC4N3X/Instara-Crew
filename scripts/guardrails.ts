/**
 * Instara Crew guardrails.
 *
 * The project performs real comment automation, so the guardrails no longer ban
 * Playwright interaction. They enforce the safety invariants that keep the tool
 * inside its intended scope: commenting only, on instagram.com only, rate
 * limited, with a dry-run path and an operator kill switch.
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

/* 2. Target domain allow-list. */
if (!text.includes("assertInstagramUrl")) {
  errors.push("Missing assertInstagramUrl domain allow-list.");
}
/* 3. Rate limiting must be wired into the publication path. */
if (!text.includes("checkAccountLimits")) {
  errors.push("Rate limiter checkAccountLimits is not used.");
}
const worker = sources.get(path.resolve("src/worker.ts")) ?? "";
if (!worker.includes("checkAccountLimits")) {
  errors.push("Worker publishes without calling checkAccountLimits.");
}

/* 4. Dry-run path must exist and be honoured. */
if (!text.includes("dryRun")) errors.push("Dry-run mode is missing.");
if (!text.includes('code: "DRY_RUN"')) errors.push("Dry-run outcome is missing.");

/* 5. Operator kill switch: pause/cancel must stop a running job. */
if (!worker.includes("jobIsStopped")) {
  errors.push("Worker cannot be stopped by the operator (jobIsStopped missing).");
}

/* 6. Block detection must pause the account instead of retrying. */
if (!text.includes("ACTION_BLOCKED")) {
  errors.push("Missing Instagram action-block detection.");
}

/* 7. Operator-assist flow must remain available. */
if (!text.includes("openTargetForOperator")) {
  errors.push("Missing operator-assist browser flow.");
}

if (errors.length) {
  console.error("Guardrail violations:");
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log("Guardrails OK (comment-only, domain-locked, rate-limited, stoppable).");
