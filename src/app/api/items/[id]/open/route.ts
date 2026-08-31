import { db } from "@/lib/db";
import { openTargetForAccount } from "@/lib/publisher";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const item = await db.jobItem.findUnique({
    where: { id },
    include: { account: true, job: true },
  });

  if (!item) return Response.json({ error: "Item not found" }, { status: 404 });
  if (!item.account) return Response.json({ error: "No account assigned" }, { status: 409 });

  try {
    await openTargetForAccount(item.account, item.job.targetUrl);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 409 });
  }

  await db.jobItem.update({
    where: { id },
    data: { status: "OPENED", openedAt: new Date() },
  });

  await db.jobLog.create({
    data: {
      jobId: item.jobId,
      level: "info",
      message: `Opened target for @${item.account.username} (${item.account.executionEngine}), item ${item.position + 1}.`,
    },
  });

  return Response.json({ ok: true, engine: item.account.executionEngine });
}
