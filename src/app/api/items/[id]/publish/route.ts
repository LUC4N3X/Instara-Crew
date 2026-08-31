import { db } from "@/lib/db";
import { publishComment } from "@/lib/instagram";
import { checkAccountLimits } from "@/lib/limits";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const item = await db.jobItem.findUnique({
    where: { id },
    include: { account: true, job: true },
  });

  if (!item) return Response.json({ error: "Item non trovato" }, { status: 404 });
  if (!item.account) return Response.json({ error: "Nessun account assegnato" }, { status: 409 });
  if (item.account.status !== "ACTIVE") {
    return Response.json({ error: `Account @${item.account.username} non ACTIVE.` }, { status: 409 });
  }

  let dryRun = item.job.dryRun;
  try {
    const body = (await request.json()) as { dryRun?: boolean };
    if (typeof body?.dryRun === "boolean") dryRun = body.dryRun;
  } catch {
    /* no body */
  }

  if (!dryRun) {
    const verdict = await checkAccountLimits(item.account);
    if (!verdict.allowed) {
      return Response.json({ error: verdict.reason ?? "Limite raggiunto." }, { status: 429 });
    }
  }

  await db.jobItem.update({
    where: { id },
    data: { status: "POSTING", attempts: { increment: 1 }, lastError: null },
  });

  try {
    const outcome = await publishComment({
      profileKey: item.account.profileKey,
      targetUrl: item.job.targetUrl,
      commentText: item.commentText,
      dryRun,
      browserOptions: item.account,
    });

    await db.jobItem.update({
      where: { id },
      data: outcome.ok
        ? {
            status: dryRun ? "READY" : "COMPLETED",
            postedAt: dryRun ? null : new Date(),
            completedAt: dryRun ? null : new Date(),
            lastError: dryRun ? outcome.message : null,
          }
        : { status: "FAILED", lastError: outcome.message },
    });

    await db.jobLog.create({
      data: {
        jobId: item.jobId,
        level: outcome.ok ? "info" : "warn",
        message: `@${item.account.username} · #${item.position + 1}: ${outcome.message}`,
      },
    });

    return Response.json({ ok: outcome.ok, code: outcome.code, message: outcome.message });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db.jobItem.update({ where: { id }, data: { status: "FAILED", lastError: message } });
    await db.jobLog.create({
      data: { jobId: item.jobId, level: "error", message: `@${item.account.username}: ${message}` },
    });
    return Response.json({ error: message }, { status: 500 });
  }
}
