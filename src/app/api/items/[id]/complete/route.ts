import { db } from "@/lib/db";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const item = await db.jobItem.findUnique({ where: { id } });
  if (!item) return Response.json({ error: "Item not found" }, { status: 404 });

  await db.jobItem.update({
    where: { id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  const remaining = await db.jobItem.count({
    where: { jobId: item.jobId, status: { not: "COMPLETED" } },
  });

  if (remaining === 0) {
    await db.job.update({
      where: { id: item.jobId },
      data: { status: "COMPLETED" },
    });
  }

  return Response.json({ ok: true, remaining });
}
