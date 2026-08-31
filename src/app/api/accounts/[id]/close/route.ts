import { db } from "@/lib/db";
import { closeAccountRuntime } from "@/lib/publisher";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const account = await db.account.findUnique({ where: { id } });
  if (!account) return Response.json({ error: "Account non trovato" }, { status: 404 });

  try {
    const closed = await closeAccountRuntime(account);
    return Response.json({ ok: true, closed, engine: account.executionEngine });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : String(error) }, { status: 409 });
  }
}
