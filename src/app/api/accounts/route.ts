import { db } from "@/lib/db";
import { z } from "zod";
import { parseProxy } from "@/lib/proxy";
import { validateAdbSerial, validateAndroidPackage } from "@/lib/android";

const inputSchema = z.object({
  username: z.string().trim().min(1).max(80),
  label: z.string().trim().max(120).optional().nullable(),
  executionEngine: z.enum(["BROWSER", "ANDROID_ADB"]).optional(),
  adbSerial: z.string().trim().max(200).optional().nullable(),
  androidPackage: z.string().trim().max(200).optional().nullable(),
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
});

export async function GET() {
  const rows = await db.account.findMany({ orderBy: { username: "asc" } });
  return Response.json(rows);
}

export async function POST(request: Request) {
  let input: z.infer<typeof inputSchema>;
  try {
    input = inputSchema.parse(await request.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues.map((i) => i.message).join(", ") : "Dati non validi.";
    return Response.json({ error: message }, { status: 400 });
  }

  const cleanUsername = input.username.replace(/^@/, "");
  const profileKey = cleanUsername.toLowerCase().replace(/[^a-z0-9_-]+/g, "_");
  const executionEngine = input.executionEngine || "BROWSER";

  let adbSerial: string | null = null;
  let androidPackage = "com.instagram.android";
  if (executionEngine === "ANDROID_ADB") {
    try {
      adbSerial = validateAdbSerial(input.adbSerial || "");
      androidPackage = validateAndroidPackage(input.androidPackage);
    } catch (error) {
      return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 400 });
    }
  }

  let cleanProxyUrl: string | null = null;
  if (executionEngine === "BROWSER" && input.proxyUrl && input.proxyUrl.trim().length > 0) {
    const parsed = parseProxy(input.proxyUrl);
    if (!parsed) {
      return Response.json(
        { error: "Formato proxy non valido. Usa es. http://user:pass@host:port oppure host:port:user:pass" },
        { status: 400 }
      );
    }
    cleanProxyUrl = input.proxyUrl.trim();
  }

  const minDelaySec = input.minDelaySec ?? 20;
  const maxDelaySec = input.maxDelaySec ?? 60;
  if (maxDelaySec < minDelaySec) {
    return Response.json({ error: "maxDelaySec deve essere >= minDelaySec." }, { status: 400 });
  }

  const account = await db.account.create({
    data: {
      username: cleanUsername,
      label: input.label || null,
      profileKey,
      executionEngine,
      adbSerial,
      androidPackage,
      proxyUrl: cleanProxyUrl,
      devicePreset: input.devicePreset || "PIXEL_7",
      customUserAgent: input.customUserAgent || null,
      viewportWidth: input.viewportWidth || null,
      viewportHeight: input.viewportHeight || null,
      deviceScaleFactor: input.deviceScaleFactor || null,
      isMobile: input.isMobile !== undefined ? input.isMobile : true,
      hasTouch: input.hasTouch !== undefined ? input.hasTouch : true,
      minDelaySec,
      maxDelaySec,
      cooldownSec: input.cooldownSec ?? 120,
      maxPerRun: input.maxPerRun ?? 0,
    },
  });

  return Response.json(account, { status: 201 });
}
