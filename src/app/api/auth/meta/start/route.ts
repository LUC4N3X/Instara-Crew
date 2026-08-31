import crypto from "node:crypto";
import { buildMetaOAuthUrl, getMetaAppConfig } from "@/lib/meta-client";

export async function GET(request: Request) {
  const config = getMetaAppConfig();
  if (!config.isConfigured) {
    return Response.json(
      {
        ok: false,
        error:
          "Configurazione Meta mancante. Imposta META_APP_ID e META_APP_SECRET nel file .env (vedi .env.example).",
      },
      { status: 503 }
    );
  }

  const state = crypto.randomBytes(16).toString("hex");

  // Derive redirect URI from current request origin if not statically set
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/meta/callback`;

  const authUrl = buildMetaOAuthUrl(state, redirectUri);

  return Response.redirect(authUrl);
}
