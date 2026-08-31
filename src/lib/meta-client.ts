export type MetaProfile = {
  id?: string;
  user_id?: string;
  username: string;
  account_type?: string;
};

export type MetaMedia = {
  id: string;
  caption?: string;
  media_type: string;
  media_url?: string;
  permalink: string;
  timestamp: string;
};

export type MetaComment = {
  id: string;
  text: string;
  username: string;
  timestamp: string;
  replies?: {
    data: Array<{ id: string; text: string; username: string; timestamp: string }>;
  };
};

export class MetaAPIError extends Error {
  statusCode: number;
  payload?: unknown;

  constructor(statusCode: number, message: string, payload?: unknown) {
    super(`Meta API HTTP ${statusCode}: ${message}`);
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

export function getMetaAppConfig() {
  const appId = process.env.META_APP_ID || process.env.INSTAGRAM_APP_ID || "";
  const appSecret = process.env.META_APP_SECRET || process.env.INSTAGRAM_APP_SECRET || "";
  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
  const redirectUri =
    process.env.META_REDIRECT_URI || `${baseUrl.replace(/\/$/, "")}/api/auth/meta/callback`;

  return {
    appId: appId.trim(),
    appSecret: appSecret.trim(),
    redirectUri: redirectUri.trim(),
    isConfigured: Boolean(appId.trim() && appSecret.trim()),
  };
}

export function buildMetaOAuthUrl(state: string, customRedirectUri?: string): string {
  const config = getMetaAppConfig();
  if (!config.isConfigured) {
    throw new Error("Configura META_APP_ID e META_APP_SECRET nel file .env per usare Meta OAuth.");
  }

  const redirectUri = customRedirectUri || config.redirectUri;
  const scopes = [
    "instagram_business_basic",
    "instagram_business_content_publish",
    "instagram_business_manage_comments",
  ].join(",");

  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: scopes,
    state,
    enable_fb_login: "0",
    force_authentication: "1",
  });

  return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
}

export class MetaInstagramClient {
  private accessToken: string;
  private baseUrl = "https://graph.instagram.com";

  constructor(accessToken: string) {
    this.accessToken = accessToken.trim();
  }

  private async request<T>(
    method: "GET" | "POST" | "DELETE",
    path: string,
    params?: Record<string, string | number | undefined>,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}/${path.replace(/^\//, "")}`);

    const queryParams = { ...params };
    if (method === "GET") {
      queryParams.access_token = this.accessToken;
    }

    Object.entries(queryParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });

    const headers: Record<string, string> = {};
    let reqBody: string | undefined;

    if (method !== "GET" && body) {
      headers["content-type"] = "application/json";
      const payloadWithToken = { ...body, access_token: this.accessToken };
      reqBody = JSON.stringify(payloadWithToken);
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: reqBody,
    });

    const json = (await response.json().catch(() => ({}))) as {
      error?: { message: string; type: string; code: number };
    };

    if (!response.ok) {
      const errorMsg = json.error?.message || response.statusText || "Meta API error";
      throw new MetaAPIError(response.status, errorMsg, json);
    }

    return json as T;
  }

  /**
   * Exchanges authorization code for short-lived token, then converts to 60-day Long-Lived Token
   */
  static async exchangeCodeForLongLivedToken(
    code: string,
    redirectUri: string
  ): Promise<{ accessToken: string; expiresInSec: number; userId?: string }> {
    const config = getMetaAppConfig();
    if (!config.isConfigured) {
      throw new Error("META_APP_ID o META_APP_SECRET mancanti.");
    }

    // 1. Short-lived token
    const tokenForm = new URLSearchParams({
      client_id: config.appId,
      client_secret: config.appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    });

    const shortRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body: tokenForm,
    });

    const shortData = (await shortRes.json()) as { access_token?: string; user_id?: string; error_message?: string };
    if (!shortRes.ok || !shortData.access_token) {
      throw new Error(shortData.error_message || "Scambio short-lived access token fallito.");
    }

    // 2. Exchange for 60-day Long-Lived Token
    const longUrl = new URL("https://graph.instagram.com/access_token");
    longUrl.searchParams.set("grant_type", "ig_exchange_token");
    longUrl.searchParams.set("client_secret", config.appSecret);
    longUrl.searchParams.set("access_token", shortData.access_token);

    const longRes = await fetch(longUrl.toString());
    const longData = (await longRes.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: { message: string };
    };

    if (!longRes.ok || !longData.access_token) {
      throw new Error(longData.error?.message || "Conversione a Long-Lived Token (60gg) fallita.");
    }

    return {
      accessToken: longData.access_token,
      expiresInSec: longData.expires_in || 60 * 24 * 60 * 60, // default 60 days
      userId: shortData.user_id,
    };
  }

  /**
   * Refreshes a long-lived token before it expires
   */
  async refreshLongLivedToken(): Promise<{ accessToken: string; expiresInSec: number }> {
    const url = new URL("https://graph.instagram.com/refresh_access_token");
    url.searchParams.set("grant_type", "ig_refresh_token");
    url.searchParams.set("access_token", this.accessToken);

    const res = await fetch(url.toString());
    const data = (await res.json()) as { access_token?: string; expires_in?: number; error?: { message: string } };
    if (!res.ok || !data.access_token) {
      throw new Error(data.error?.message || "Rinnovo token fallito.");
    }

    return {
      accessToken: data.access_token,
      expiresInSec: data.expires_in || 60 * 24 * 60 * 60,
    };
  }

  /**
   * Fetches official profile details
   */
  async getMe(): Promise<MetaProfile> {
    return this.request<MetaProfile>("GET", "me", { fields: "user_id,username,account_type" });
  }

  /**
   * Lists published media
   */
  async listMedia(limit = 25): Promise<{ data: MetaMedia[] }> {
    return this.request<{ data: MetaMedia[] }>("GET", "me/media", {
      fields: "id,caption,media_type,media_url,permalink,timestamp",
      limit: Math.min(Math.max(limit, 1), 100),
    });
  }

  /**
   * Lists comments on a post
   */
  async listComments(mediaId: string, limit = 50): Promise<{ data: MetaComment[] }> {
    return this.request<{ data: MetaComment[] }>("GET", `${mediaId}/comments`, {
      fields: "id,text,username,timestamp,replies{id,text,username,timestamp}",
      limit: Math.min(Math.max(limit, 1), 100),
    });
  }

  /**
   * Officially replies to a comment on owned media
   */
  async replyToComment(commentId: string, message: string): Promise<{ id: string }> {
    return this.request<{ id: string }>("POST", `${commentId}/replies`, undefined, {
      message,
    });
  }

  /**
   * Officially publishes an Image or Reel to Instagram
   */
  async publishMedia(
    igUserId: string,
    mediaUrl: string,
    caption: string,
    mediaType: "IMAGE" | "REELS" = "IMAGE"
  ): Promise<{ id: string }> {
    // 1. Create container
    const payload: Record<string, unknown> = { caption };
    if (mediaType === "IMAGE") {
      payload.image_url = mediaUrl;
    } else {
      payload.video_url = mediaUrl;
      payload.media_type = "REELS";
    }

    const container = await this.request<{ id: string }>("POST", `${igUserId}/media`, undefined, payload);
    const creationId = container.id;

    // 2. Poll until container is finished processing
    let ready = false;
    for (let i = 0; i < 15; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const status = await this.request<{ status_code?: string }>("GET", creationId, {
        fields: "status_code,status",
      });
      if (status.status_code === "FINISHED" || status.status_code === "READY") {
        ready = true;
        break;
      }
      if (status.status_code === "ERROR" || status.status_code === "EXPIRED") {
        throw new Error(`Elaborazione media Meta fallita: ${status.status_code}`);
      }
    }

    if (!ready) {
      throw new Error("Timeout in attesa dell'elaborazione del media container da parte di Meta.");
    }

    // 3. Publish container
    return this.request<{ id: string }>("POST", `${igUserId}/media_publish`, undefined, {
      creation_id: creationId,
    });
  }
}
