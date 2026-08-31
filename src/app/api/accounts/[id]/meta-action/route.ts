import { db } from "@/lib/db";
import { MetaInstagramClient } from "@/lib/meta-client";
import { decryptToken, encryptToken } from "@/lib/security";
import { z } from "zod";

const actionSchema = z.object({
  action: z.enum(["test_connection", "refresh_token", "list_media"]),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  let input: z.infer<typeof actionSchema>;
  try {
    input = actionSchema.parse(await request.json());
  } catch (err) {
    const message = err instanceof z.ZodError ? err.issues[0]?.message || "Azione non valida" : "Dati non validi.";
    return Response.json({ ok: false, error: message }, { status: 400 });
  }

  const account = await db.account.findUnique({ where: { id } });
  if (!account) return Response.json({ ok: false, error: "Account non trovato." }, { status: 404 });
  if (account.authType !== "META_OAUTH" || !account.encryptedAccessToken) {
    return Response.json(
      { ok: false, error: "Questo account non usa l'autenticazione Meta OAuth." },
      { status: 400 }
    );
  }

  try {
    const accessToken = decryptToken(account.encryptedAccessToken);
    const client = new MetaInstagramClient(accessToken);

    if (input.action === "test_connection") {
      const me = await client.getMe();
      return Response.json({
        ok: true,
        data: {
          username: me.username,
          userId: me.user_id || me.id,
          accountType: me.account_type || "BUSINESS",
          expiresAt: account.tokenExpiresAt,
        },
      });
    }

    if (input.action === "refresh_token") {
      const { accessToken: newToken, expiresInSec } = await client.refreshLongLivedToken();
      const encrypted = encryptToken(newToken);
      const tokenExpiresAt = new Date(Date.now() + expiresInSec * 1000);

      await db.account.update({
        where: { id },
        data: {
          encryptedAccessToken: encrypted,
          tokenExpiresAt,
        },
      });

      return Response.json({
        ok: true,
        message: `Token rinnovato con successo! Nuova scadenza: ${tokenExpiresAt.toLocaleDateString("it-IT")}`,
      });
    }

    if (input.action === "list_media") {
      const media = await client.listMedia(10);
      return Response.json({ ok: true, media: media.data });
    }

    return Response.json({ ok: false, error: "Azione non riconosciuta." }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: `Errore Meta API: ${msg}` }, { status: 500 });
  }
}
