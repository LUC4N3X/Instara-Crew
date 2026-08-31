import { getMetaAppConfig } from "@/lib/meta-client";

export async function GET(request: Request) {
  const config = getMetaAppConfig();
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/meta/callback`;

  return Response.json({
    isConfigured: config.isConfigured,
    appId: config.appId ? `${config.appId.slice(0, 4)}...${config.appId.slice(-4)}` : null,
    redirectUri,
  });
}
