import { db } from "@/lib/db";
import { openTargetForOperator } from "@/lib/browser";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const item = await db.jobItem.findUnique({
    where: { id },
    include: { account: true, job: true },
  });

  if (!item) return Response.json({ error: "Item not found" }, { status: 404 });
  if (!item.account) return Response.json({ error: "No account assigned" }, { status: 409 });

  await openTargetForOperator(item.account.profileKey, item.job.targetUrl, item.account);

  await db.jobItem.update({
    where: { id },
    data: { status: "OPENED", openedAt: new Date() },
  });

  await db.jobLog.create({
    data: {
      jobId: item.jobId,
      level: "info",
      message: `Opened target for @${item.account.username}, item ${item.position + 1}.`,
    },
  });

  return Response.json({ ok: true });
}
