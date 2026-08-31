import { db } from "@/lib/db";
import { z } from "zod";
import { parseProxy } from "@/lib/proxy";

const patchSchema = z.object({
  label: z.string().trim().max(120).optional().nullable(),
  proxyUrl: z.string().trim().max(500).optional().nullable(),
  devicePreset: z.enum(["PIXEL_7", "GALAXY_S24", "IPHONE_15_PRO", "DESKTOP", "CUSTOM"]).optional(),
  customUserAgent: z.string().trim().max(1000).optional().nullable(),
  viewportWidth: z.number().int().min(200).max(3840).optional().nullable(),
  viewportHeight: z.number().int().min(200).max(3840).optional().nullable(),
  deviceScaleFactor: z.number().min(0.5).max(5).optional().nullable(),
  isMobile: z.boolean().optional(),
  hasTouch: z.boolean().optional(),
  minDelaySec: z.number().int().min(0).max(3600).optional(),
  maxDelaySec: z.number().int().min(0).max(7200).optional(),
  cooldownSec: z.number().int().min(0).max(7200).optional(),
  maxPerRun: z.number().int().min(0).max(1000).optional(),
  status: z.enum(["ACTIVE", "PAUSED", "NEEDS_LOGIN"]).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  let input: z.infer<typeof patchSchema>;
  try {
    input = patchSchema.parse(await request.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues.map((i) => i.message).join(", ") : "Valori non validi.";
    return Response.json({ error: message }, { status: 400 });
  }

  const account = await db.account.findUnique({ where: { id } });
  if (!account) return Response.json({ error: "Account non trovato" }, { status: 404 });

  // Validate proxy format if provided
  if (input.proxyUrl !== undefined && input.proxyUrl !== null && input.proxyUrl.trim().length > 0) {
    const parsed = parseProxy(input.proxyUrl);
    if (!parsed) {
      return Response.json(
        { error: "Formato proxy non valido. Usa es. http://user:pass@host:port oppure host:port:user:pass" },
        { status: 400 }
      );
    }
  }

  const minDelaySec = input.minDelaySec ?? account.minDelaySec;
  const maxDelaySec = input.maxDelaySec ?? account.maxDelaySec;
  if (maxDelaySec < minDelaySec) {
    return Response.json({ error: "maxDelaySec deve essere >= minDelaySec." }, { status: 400 });
  }

  const updated = await db.account.update({
    where: { id },
    data: {
      ...input,
      proxyUrl: input.proxyUrl !== undefined ? (input.proxyUrl?.trim() || null) : account.proxyUrl,
      minDelaySec,
      maxDelaySec,
    },
  });

  return Response.json(updated);
}

export async function DELETE(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  await db.account.delete({ where: { id } }).catch(() => undefined);
  return Response.json({ ok: true });
}
