import { listAndroidDevices } from "@/lib/android";

export const runtime = "nodejs";

export async function GET() {
  try {
    const devices = await listAndroidDevices();
    return Response.json({ ok: true, devices });
  } catch (error) {
    return Response.json({
      ok: false,
      devices: [],
      warning: error instanceof Error ? error.message : String(error),
    });
  }
}
