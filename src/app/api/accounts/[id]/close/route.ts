import { db } from "@/lib/db";
import { closeContext } from "@/lib/browser";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const account = await db.account.findUnique({ where: { id } });
  if (!account) return Response.json({ error: "Account non trovato" }, { status: 404 });

  const closed = await closeContext(account.profileKey);
  return Response.json({ ok: true, closed });
}
