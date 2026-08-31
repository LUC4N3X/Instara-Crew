import { db } from "@/lib/db";
import { checkAndroidDevice } from "@/lib/android";

export const runtime = "nodejs";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const account = await db.account.findUnique({ where: { id } });
  if (!account) return Response.json({ error: "Account non trovato" }, { status: 404 });
  if (account.executionEngine !== "ANDROID_ADB") {
    return Response.json({ error: "Questo account non usa il runtime Android ADB." }, { status: 409 });
  }
  if (!account.adbSerial) {
    return Response.json({ error: "Nessun adbSerial associato all'account." }, { status: 409 });
  }

  try {
    const health = await checkAndroidDevice(account.adbSerial, account.androidPackage);
    return Response.json({ ok: health.packageInstalled, health });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 409 });
  }
}
