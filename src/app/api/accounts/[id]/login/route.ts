import { db } from "@/lib/db";
import { openAccountRuntime } from "@/lib/publisher";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const account = await db.account.findUnique({ where: { id } });
  if (!account) return Response.json({ error: "Account not found" }, { status: 404 });

  try {
    const outcome = await openAccountRuntime(account);
    await db.account.update({ where: { id }, data: { status: "ACTIVE" } });
    return Response.json({ ok: true, engine: account.executionEngine, outcome });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 409 });
  }
}
