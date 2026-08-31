import { db } from "@/lib/db";

const ALLOWED = ["pause", "resume", "cancel"] as const;
type Action = (typeof ALLOWED)[number];

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { action?: string };
  const action = body.action as Action | undefined;

  if (!action || !ALLOWED.includes(action)) {
    return Response.json({ error: "Azione non valida." }, { status: 400 });
  }

  const job = await db.job.findUnique({ where: { id } });
  if (!job) return Response.json({ error: "Job non trovato" }, { status: 404 });

  const status = action === "pause" ? "PAUSED" : action === "cancel" ? "CANCELLED" : "READY";

  await db.job.update({ where: { id }, data: { status } });
  await db.jobLog.create({
    data: { jobId: id, level: "warn", message: `Operatore: ${action} → stato ${status}.` },
  });

  return Response.json({ ok: true, status });
}
