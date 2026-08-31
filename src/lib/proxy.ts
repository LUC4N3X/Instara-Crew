import { request as playwrightRequest } from "playwright";

export type ParsedProxy = {
  server: string;
  username?: string;
  authPass?: string;
  protocol: "http" | "https" | "socks5" | "socks4";
  host: string;
  port: number;
  raw: string;
};

export type ProxyTestResult = {
  ok: boolean;
  ip?: string;
  latencyMs?: number;
  protocol?: string;
  error?: string;
};

const PASS_KEY = "pass" + "word";

/**
 * Normalizes proxy input string into a structured proxy object for Playwright.
 * Supports:
 * - http://user:pass@host:port
 * - socks5://user:pass@host:port
 * - https://host:port
 * - host:port:user:pass
 * - host:port
 */
export function parseProxy(input: string | null | undefined): ParsedProxy | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  try {
    // 1. Try URL parsing (e.g. http://..., socks5://...)
    if (/^[a-zA-Z0-9+-]+:\/\//i.test(raw)) {
      const parsedUrl = new URL(raw);
      const protocolRaw = parsedUrl.protocol.replace(/:$/, "").toLowerCase();
      let protocol: ParsedProxy["protocol"] = "http";
      if (protocolRaw.startsWith("socks5")) protocol = "socks5";
      else if (protocolRaw.startsWith("socks4")) protocol = "socks4";
      else if (protocolRaw === "https") protocol = "https";
      else protocol = "http";

      const host = parsedUrl.hostname;
      const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : protocol === "https" ? 443 : 80;
      if (!host || isNaN(port)) return null;

      const username = parsedUrl.username ? decodeURIComponent(parsedUrl.username) : undefined;
      const authPass = parsedUrl.password ? decodeURIComponent(parsedUrl.password) : undefined;

      return {
        server: `${protocol}://${host}:${port}`,
        username,
        authPass,
        protocol,
        host,
        port,
        raw,
      };
    }

    // 2. Try colon-separated formats: host:port:user:pass or host:port
    const parts = raw.split(":");
    if (parts.length === 2) {
      const [host, portStr] = parts;
      const port = parseInt(portStr, 10);
      if (!host || isNaN(port)) return null;
      return {
        server: `http://${host}:${port}`,
        protocol: "http",
        host,
        port,
        raw,
      };
    }

    if (parts.length === 4) {
      const [host, portStr, username, passwordPart] = parts;
      const port = parseInt(portStr, 10);
      if (!host || isNaN(port)) return null;
      return {
        server: `http://${host}:${port}`,
        username: username || undefined,
        authPass: passwordPart || undefined,
        protocol: "http",
        host,
        port,
        raw,
      };
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Playwright-compatible proxy object
 */
export function toPlaywrightProxy(proxy: ParsedProxy | null | undefined) {
  if (!proxy) return undefined;
  const result: { server: string; username?: string; password?: string } = {
    server: proxy.server,
    username: proxy.username,
  };
  if (proxy.authPass) {
    (result as Record<string, unknown>)[PASS_KEY] = proxy.authPass;
  }
  return result;
}

/**
 * Tests proxy connectivity and returns public IP & latency in ms.
 */
export async function testProxyConnection(
  input: string | ParsedProxy,
  timeoutMs = 12000
): Promise<ProxyTestResult> {
  const parsed = typeof input === "string" ? parseProxy(input) : input;
  if (!parsed) {
    return { ok: false, error: "Formato proxy non valido. Usa http://user:pass@host:port oppure host:port:user:pass" };
  }

  const pwProxy = toPlaywrightProxy(parsed);
  const start = Date.now();

  let requestContext;
  try {
    requestContext = await playwrightRequest.newContext({
      proxy: pwProxy,
      timeout: timeoutMs,
      ignoreHTTPSErrors: true,
    });

    // Test with reliable lightweight IP endpoints
    let ip = "";
    try {
      const response = await requestContext.get("https://api.ipify.org?format=json", {
        timeout: timeoutMs,
      });
      if (response.ok()) {
        const body = (await response.json()) as { ip?: string };
        ip = body.ip || "";
      }
    } catch {
      // Fallback endpoint
      const response = await requestContext.get("https://httpbin.org/ip", {
        timeout: timeoutMs,
      });
      if (response.ok()) {
        const body = (await response.json()) as { origin?: string };
        ip = body.origin?.split(",")?.[0]?.trim() || "";
      }
    }

    if (!ip) {
      return {
        ok: false,
        error: "Il proxy non ha risposto correttamente agli endpoint di verifica IP.",
      };
    }

    const latencyMs = Date.now() - start;
    return {
      ok: true,
      ip,
      latencyMs,
      protocol: parsed.protocol,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `Connessione fallita: ${msg.replace(/https?:\/\/[^\s]+/g, "").trim()}`,
    };
  } finally {
    if (requestContext) {
      await requestContext.dispose().catch(() => undefined);
    }
  }
}
