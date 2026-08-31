import { Worker } from "bullmq";
import { redis } from "./lib/redis";
import { db } from "./lib/db";
import { humanDelay, sleep, InstagramError } from "./lib/instagram";
import { closeAccountRuntime, publishCommentForAccount } from "./lib/publisher";
import { checkAccountLimits } from "./lib/limits";

async function log(jobId: string, level: string, message: string) {
  await db.jobLog.create({ data: { jobId, level, message } });
}

const prepWorker = new Worker(
  "instara-crew.prep",
  async (queueJob) => {
    const jobId = String(queueJob.data.jobId);
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: { items: { orderBy: { position: "asc" } } },
    });

    if (!job) throw new Error(`Job ${jobId} not found`);

    await db.job.update({ where: { id: jobId }, data: { status: "PREPARING" } });
    await log(jobId, "info", "Preparation worker started.");

    const accounts = await db.account.findMany({
      where: { status: "ACTIVE", authType: "BROWSER_SESSION" },
      orderBy: { username: "asc" },
    });

    if (!accounts.length) {
      await log(jobId, "warn", "No ACTIVE Browser/Android accounts available for assignment.");
    } else {
      const used = new Map<string, number>();
      let assigned = 0;

      for (const item of job.items) {
        const candidate = accounts
          .filter((a) => a.maxPerRun <= 0 || (used.get(a.id) ?? 0) < a.maxPerRun)
          .sort((a, b) => (used.get(a.id) ?? 0) - (used.get(b.id) ?? 0))[0];

        if (!candidate) {
          await db.jobItem.update({
            where: { id: item.id },
            data: {
              accountId: null,
              status: "SKIPPED",
              lastError: "Nessun account disponibile (limite per run).",
            },
          });
          continue;
        }

        used.set(candidate.id, (used.get(candidate.id) ?? 0) + 1);
        assigned++;
        await db.jobItem.update({
          where: { id: item.id },
          data: { accountId: candidate.id, status: "READY", lastError: null },
        });
      }

      await log(
        jobId,
        "info",
        `Assegnati ${assigned} commenti distinti su ${accounts.length} account interattivi (Browser/Android).`
      );
    }

    await db.job.update({ where: { id: jobId }, data: { status: "READY" } });
    await log(jobId, "info", "Job pronto. Usa 'Pubblica tutti' per avviare l'automazione.");
  },
  { connection: redis, concurrency: 2 }
);

type RunnableItem = {
  id: string;
  position: number;
  commentText: string;
};

type AccountGroup = {
  accountId: string;
  username: string;
  profileKey: string;
  authType: string;
  executionEngine: string;
  adbSerial: string | null;
  androidPackage: string | null;
  proxyUrl: string | null;
  devicePreset: string;
  customUserAgent: string | null;
  viewportWidth: number | null;
  viewportHeight: number | null;
  deviceScaleFactor: number | null;
  isMobile: boolean;
  hasTouch: boolean;
  minDelaySec: number;
  maxDelaySec: number;
  cooldownSec: number;
  items: RunnableItem[];
};

async function jobIsStopped(jobId: string) {
  const current = await db.job.findUnique({ where: { id: jobId }, select: { status: true } });
  return !current || current.status === "PAUSED" || current.status === "CANCELLED";
}

async function runAccountGroup(
  jobId: string,
  dryRun: boolean,
  targetUrl: string,
  group: AccountGroup,
  burst: boolean
) {
  let succeeded = 0;

  for (let i = 0; i < group.items.length; i++) {
    if (await jobIsStopped(jobId)) {
      await log(jobId, "warn", `@${group.username}: run interrotto dall'operatore.`);
      break;
    }

    const item = group.items[i];
    const account = await db.account.findUnique({
      where: { id: group.accountId },
      select: { id: true, username: true, lastPostAt: true, status: true },
    });
    if (!account || account.status !== "ACTIVE") {
      await log(jobId, "warn", `@${group.username}: account non più ACTIVE, gruppo interrotto.`);
      break;
    }

    let verdict = await checkAccountLimits(account);
    if (!verdict.allowed && verdict.waitMs) {
      await log(jobId, "info", `@${group.username}: attendo ${Math.round(verdict.waitMs / 1000)}s (intervallo minimo).`);
      await sleep(verdict.waitMs);
      const refreshed = await db.account.findUnique({
        where: { id: group.accountId },
        select: { id: true, username: true, lastPostAt: true, status: true },
      });
      if (!refreshed || refreshed.status !== "ACTIVE") break;
      verdict = await checkAccountLimits(refreshed);
    }
    if (!verdict.allowed) {
      await db.jobItem.update({
        where: { id: item.id },
        data: { status: "SKIPPED", lastError: verdict.reason ?? "Limite raggiunto." },
      });
      await log(jobId, "warn", `${verdict.reason} Item #${item.position + 1} rimandato.`);
      break;
    }

    await db.jobItem.update({
      where: { id: item.id },
      data: { status: "POSTING", attempts: { increment: 1 }, lastError: null },
    });

    try {
      const outcome = await publishCommentForAccount(group, {
        targetUrl,
        commentText: item.commentText,
        dryRun,
      });

      if (outcome.ok) {
        succeeded++;
        await db.jobItem.update({
          where: { id: item.id },
          data: {
            status: dryRun ? "READY" : "COMPLETED",
            postedAt: dryRun ? null : new Date(),
            completedAt: dryRun ? null : new Date(),
            lastError: dryRun ? outcome.message : null,
          },
        });
        if (!dryRun) {
          await db.account.update({ where: { id: group.accountId }, data: { lastPostAt: new Date() } });
        }
        await log(jobId, "info", `@${group.username} · #${item.position + 1}: ${outcome.message}`);
      } else {
        await db.jobItem.update({
          where: { id: item.id },
          data: { status: "FAILED", lastError: outcome.message },
        });
        await log(jobId, "warn", `@${group.username} · #${item.position + 1}: ${outcome.message}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await db.jobItem.update({ where: { id: item.id }, data: { status: "FAILED", lastError: message } });
      await log(jobId, "error", `@${group.username} · #${item.position + 1}: ${message}`);

      if (error instanceof InstagramError && error.code === "NEEDS_LOGIN") {
        await db.account.update({ where: { id: group.accountId }, data: { status: "NEEDS_LOGIN" } });
        break;
      }
      if (error instanceof InstagramError && error.code === "ACTION_BLOCKED") {
        await db.account.update({ where: { id: group.accountId }, data: { status: "PAUSED" } });
        break;
      }
    }

    if (!burst && i < group.items.length - 1) {
      const wait = humanDelay(group.minDelaySec, group.maxDelaySec);
      await log(jobId, "info", `@${group.username}: attesa ${Math.round(wait / 1000)}s prima del prossimo commento.`);
      await sleep(wait);
    }
  }

  if (!burst && group.cooldownSec > 0) await sleep(group.cooldownSec * 1000);
  await closeAccountRuntime(group).catch(() => undefined);
  return succeeded;
}

async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number) {
  const results: T[] = [];
  let cursor = 0;

  async function lane() {
    while (cursor < tasks.length) {
      const index = cursor++;
      results[index] = await tasks[index]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, lane));
  return results;
}

const postWorker = new Worker(
  "instara-crew.post",
  async (queueJob) => {
    const jobId = String(queueJob.data.jobId);

    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        items: {
          where: { status: { in: ["READY", "QUEUED", "OPENED", "FAILED"] } },
          orderBy: { position: "asc" },
          include: { account: true },
        },
      },
    });

    if (!job) throw new Error(`Job ${jobId} not found`);

    await db.job.update({ where: { id: jobId }, data: { status: "RUNNING" } });
    await log(jobId, "info", `Pubblicazione avviata (${job.dryRun ? "DRY-RUN: nessun invio" : "LIVE: invio reale"}).`);

    const groups = new Map<string, AccountGroup>();
    for (const item of job.items) {
      if (!item.account) continue;
      if (item.account.status !== "ACTIVE" || item.account.authType !== "BROWSER_SESSION") {
        await db.jobItem.update({
          where: { id: item.id },
          data: { status: "FAILED", lastError: `Account @${item.account.username} non disponibile per il runtime interattivo.` },
        });
        continue;
      }

      const entry: RunnableItem = { id: item.id, position: item.position, commentText: item.commentText };
      const existing = groups.get(item.account.id);
      if (existing) {
        existing.items.push(entry);
      } else {
        groups.set(item.account.id, {
          accountId: item.account.id,
          username: item.account.username,
          profileKey: item.account.profileKey,
          authType: item.account.authType,
          executionEngine: item.account.executionEngine,
          adbSerial: item.account.adbSerial,
          androidPackage: item.account.androidPackage,
          proxyUrl: item.account.proxyUrl,
          devicePreset: item.account.devicePreset,
          customUserAgent: item.account.customUserAgent,
          viewportWidth: item.account.viewportWidth,
          viewportHeight: item.account.viewportHeight,
          deviceScaleFactor: item.account.deviceScaleFactor,
          isMobile: item.account.isMobile,
          hasTouch: item.account.hasTouch,
          minDelaySec: item.account.minDelaySec,
          maxDelaySec: item.account.maxDelaySec,
          cooldownSec: item.account.cooldownSec,
          items: [entry],
        });
      }
    }

    if (groups.size === 0) {
      await log(jobId, "warn", "Nessun item pubblicabile (account mancanti, Meta OAuth o non attivi).");
      await db.job.update({ where: { id: jobId }, data: { status: "READY" } });
      return;
    }

    const burst = queueJob.data.burst === true || process.env.BURST_MODE === "true";
    const concurrency = burst
      ? Math.max(1, Number(process.env.BURST_CONCURRENCY || groups.size))
      : Math.max(1, Number(process.env.POST_ACCOUNT_CONCURRENCY || 2));

    const tasks = [...groups.values()].map((group, index) => async () => {
      if (!burst) await sleep(index * 1_500);
      return runAccountGroup(jobId, job.dryRun, job.targetUrl, group, burst);
    });

    const succeeded = (await runWithConcurrency(tasks, concurrency)).reduce((a, b) => a + b, 0);
    const remaining = await db.jobItem.count({
      where: { jobId, status: { in: ["READY", "QUEUED", "POSTING", "OPENED"] } },
    });
    const failed = await db.jobItem.count({ where: { jobId, status: "FAILED" } });
    const stopped = await jobIsStopped(jobId);

    const finalStatus = stopped
      ? "PAUSED"
      : job.dryRun
        ? "READY"
        : remaining === 0 && failed === 0
          ? "COMPLETED"
          : remaining === 0
            ? "FAILED"
            : "READY";

    await db.job.update({ where: { id: jobId }, data: { status: finalStatus } });
    await log(jobId, failed > 0 ? "warn" : "info", `Run terminato: ${succeeded} ok, ${failed} falliti, ${remaining} in sospeso. Stato: ${finalStatus}.`);
  },
  { connection: redis, concurrency: 1 }
);

for (const [name, worker] of [["prep", prepWorker], ["post", postWorker]] as const) {
  worker.on("completed", (queueJob) => console.log(`[${name}] completed ${queueJob.id}`));
  worker.on("failed", (queueJob, err) => console.error(`[${name}] failed ${queueJob?.id}`, err));
}

console.log("Instara Crew worker running (prep + post, Browser/Android runtimes).");
