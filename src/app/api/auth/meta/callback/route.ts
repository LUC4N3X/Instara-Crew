import { db } from "@/lib/db";
import { MetaInstagramClient } from "@/lib/meta-client";
import { encryptToken } from "@/lib/security";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error || !code) {
    const message = errorDescription || error || "Autorizzazione Meta annullata o non valida.";
    return Response.redirect(`${url.origin}/?meta_error=${encodeURIComponent(message)}`);
  }

  const redirectUri = `${url.origin}/api/auth/meta/callback`;

  try {
    const { accessToken, expiresInSec, userId } =
      await MetaInstagramClient.exchangeCodeForLongLivedToken(code, redirectUri);

    const client = new MetaInstagramClient(accessToken);
    const profile = await client.getMe();

    const username = profile.username.replace(/^@/, "").trim();
    const profileKey = `${username.toLowerCase().replace(/[^a-z0-9_-]+/g, "_")}_meta`;
    const igUserId = profile.user_id || profile.id || userId || null;
    const encryptedAccessToken = encryptToken(accessToken);
    const tokenExpiresAt = new Date(Date.now() + expiresInSec * 1000);

    // Upsert account
    const existing = await db.account.findFirst({
      where: {
        OR: [{ username }, { profileKey }],
      },
    });

    if (existing) {
      await db.account.update({
        where: { id: existing.id },
        data: {
          username,
          authType: "META_OAUTH",
          status: "ACTIVE",
          igUserId,
          encryptedAccessToken,
          tokenExpiresAt,
          accountType: profile.account_type || "BUSINESS",
        },
      });
    } else {
      await db.account.create({
        data: {
          username,
          profileKey,
          label: "Account Meta Ufficiale",
          authType: "META_OAUTH",
          status: "ACTIVE",
          igUserId,
          encryptedAccessToken,
          tokenExpiresAt,
          accountType: profile.account_type || "BUSINESS",
        },
      });
    }

    return Response.redirect(
      `${url.origin}/?meta_connected=${encodeURIComponent(username)}`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.redirect(`${url.origin}/?meta_error=${encodeURIComponent(msg)}`);
  }
}
