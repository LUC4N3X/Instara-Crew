import { db } from "@/lib/db";
import { enqueuePublication } from "@/lib/queue";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  const job = await db.job.findUnique({
    where: { id },
    include: { items: { include: { account: true } } },
  });
  if (!job) return Response.json({ error: "Job non trovato" }, { status: 404 });

  if (job.status === "RUNNING") {
    return Response.json({ error: "Job già in esecuzione." }, { status: 409 });
  }

  let dryRun = job.dryRun;
  let burst = process.env.BURST_MODE === "true";
  try {
    const body = (await request.json()) as { dryRun?: boolean; burst?: boolean };
    if (typeof body?.dryRun === "boolean") dryRun = body.dryRun;
    if (typeof body?.burst === "boolean") burst = body.burst;
  } catch {
    /* no body: keep stored values */
  }

  const runnable = job.items.filter(
    (item) =>
      item.account &&
      item.account.status === "ACTIVE" &&
      ["READY", "QUEUED", "OPENED", "FAILED"].includes(item.status)
  );

  if (runnable.length === 0) {
    return Response.json(
      { error: "Nessun item pubblicabile: assegna account ACTIVE e riprova." },
      { status: 409 }
    );
  }

  const texts = new Set(runnable.map((item) => item.commentText.trim().toLowerCase()));
  if (texts.size !== runnable.length) {
    return Response.json(
      { error: "Commenti duplicati rilevati: ogni account deve avere un testo diverso." },
      { status: 409 }
    );
  }

  await db.jobItem.updateMany({
    where: { id: { in: runnable.map((item) => item.id) } },
    data: { status: "QUEUED", lastError: null },
  });

  await db.job.update({ where: { id }, data: { dryRun, status: "RUNNING" } });

  await db.jobLog.create({
    data: {
      jobId: id,
      level: "info",
      message: `Run richiesto dall'operatore: ${runnable.length} commenti, modalità ${
        dryRun ? "DRY-RUN" : "LIVE"
      }${burst ? " · BURST (nessuna pausa, account in parallelo)" : ""}.`,
    },
  });

  const runId = Date.now().toString(36);
  await enqueuePublication(id, runId, burst);

  return Response.json({ ok: true, queued: runnable.length, dryRun, burst, runId });
}
