import { db } from "@/lib/db";
import { generateCommentsFromImage } from "@/lib/gemini";
import { enqueuePreparation } from "@/lib/queue";

export async function GET() {
  const rows = await db.job.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        orderBy: { position: "asc" },
        include: { account: true },
      },
      logs: {
        orderBy: { createdAt: "desc" },
        take: 25,
      },
    },
  });
  return Response.json(rows);
}

export async function POST(request: Request) {
  const form = await request.formData();

  const clientName = String(form.get("clientName") || "").trim();
  const targetUrl = String(form.get("targetUrl") || "").trim();
  const quantity = Number(form.get("quantity") || 0);
  const tone = String(form.get("tone") || "naturale").trim();
  const context = String(form.get("context") || "").trim();
  const image = form.get("image");

  if (!clientName || !targetUrl) {
    return Response.json({ error: "Missing client or target URL." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return Response.json({ error: "Invalid URL." }, { status: 400 });
  }
  if (!/(^|\.)instagram\.com$/i.test(parsed.hostname)) {
    return Response.json({ error: "Target must be instagram.com." }, { status: 400 });
  }

  if (!(image instanceof File) || !image.type.startsWith("image/")) {
    return Response.json({ error: "A valid image is required." }, { status: 400 });
  }

  const bytes = Buffer.from(await image.arrayBuffer());
  if (bytes.byteLength > 15 * 1024 * 1024) {
    return Response.json({ error: "Image too large (max 15 MB)." }, { status: 400 });
  }

  const pack = await generateCommentsFromImage({
    bytes,
    mimeType: image.type,
    quantity,
    tone,
    context,
  });

  if (pack.comments.length === 0) {
    return Response.json({ error: "Gemini returned no usable comments." }, { status: 400 });
  }

  const job = await db.job.create({
    data: {
      clientName,
      targetUrl,
      imageName: image.name,
      quantity: pack.comments.length,
      tone,
      context: context || null,
      dryRun: process.env.DRY_RUN !== "false",
      status: "DRAFT",
      items: {
        create: pack.comments.map((commentText, position) => ({
          position,
          commentText,
        })),
      },
      logs: {
        create: {
          level: "info",
          message: `Gemini generated ${pack.comments.length} comments. Analysis: ${pack.analysis.summary}`,
        },
      },
    },
    include: {
      items: { include: { account: true }, orderBy: { position: "asc" } },
    },
  });

  await enqueuePreparation(job.id);
  return Response.json(job, { status: 201 });
}
