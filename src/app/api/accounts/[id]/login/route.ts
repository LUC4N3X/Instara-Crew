import { db } from "@/lib/db";
import { openAccountLogin } from "@/lib/browser";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const account = await db.account.findUnique({ where: { id } });
  if (!account) return Response.json({ error: "Account not found" }, { status: 404 });

  await openAccountLogin(account.profileKey, account);

  await db.account.update({
    where: { id },
    data: { status: "ACTIVE" },
  });

  return Response.json({ ok: true });
}
