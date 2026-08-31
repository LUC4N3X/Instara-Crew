/**
 * Offline end-to-end check of the publication flow, proxy parsing, mobile emulation,
 * security token encryption, and official Meta OAuth client.
 *
 * A mock Instagram post page is served through Playwright route interception,
 * so the whole automation path (field lookup, typing, submit, verification,
 * login/blocked/missing-field detection, mobile device emulation) is exercised
 * without ever touching instagram.com or any real account.
 *
 * Run: npx tsx scripts/selftest.ts
 */
import os from "node:os";
import path from "node:path";
import { getContext, closeAllContexts } from "../src/lib/browser";
import { publishComment } from "../src/lib/instagram";
import { parseProxy, toPlaywrightProxy } from "../src/lib/proxy";
import { resolveDeviceConfig } from "../src/lib/devices";
import { encryptToken, decryptToken } from "../src/lib/security";
import { buildMetaOAuthUrl, getMetaAppConfig } from "../src/lib/meta-client";

process.env.BROWSER_HEADLESS = "true";
process.env.BROWSER_PROFILE_ROOT =
  process.env.SELFTEST_PROFILE_ROOT || path.join(os.tmpdir(), "instara-crew-selftest");

const TARGET = "https://www.instagram.com/p/SELFTEST/";

const POST_PAGE = `<!doctype html><html lang="it"><body>
  <article><h1>Mock post</h1><div id="comments"></div></article>
  <form>
    <textarea aria-label="Aggiungi un commento..." placeholder="Aggiungi un commento..."></textarea>
    <div role="button" tabindex="0">Pubblica</div>
  </form>
  <script>
    const field = document.querySelector("textarea");
    const publish = () => {
      const value = field.value.trim();
      if (!value) return;
      const node = document.createElement("span");
      node.textContent = value;
      document.getElementById("comments").appendChild(node);
      field.value = "";
    };
    document.querySelector('div[role="button"]').addEventListener("click", publish);
    field.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); publish(); } });
  </script>
</body></html>`;

const MOBILE_POST_PAGE = `<!doctype html><html lang="it"><head><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body>
  <article>
    <h1>Mock Mobile Post</h1>
    <div id="comments"></div>
    <div class="actions">
      <button aria-label="Commento" id="open-comments" style="display:block;">💬 Apri commenti</button>
    </div>
  </article>
  <div id="tray" style="display:none;">
    <textarea aria-label="Aggiungi un commento..." placeholder="Aggiungi un commento..."></textarea>
    <button type="submit" id="post-btn">Pubblica</button>
  </div>
  <script>
    document.getElementById("open-comments").addEventListener("click", () => {
      document.getElementById("tray").style.display = "block";
    });
    const field = document.querySelector("textarea");
    const publish = () => {
      const value = field.value.trim();
      if (!value) return;
      const node = document.createElement("span");
      node.textContent = value;
      document.getElementById("comments").appendChild(node);
      field.value = "";
    };
    document.getElementById("post-btn").addEventListener("click", publish);
    field.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); publish(); } });
  </script>
</body></html>`;

const LOGIN_PAGE = `<!doctype html><html lang="it"><body>
  <form><input name="username" /><input name="password" type="password" /></form>
</body></html>`;

const NO_FIELD_PAGE = `<!doctype html><html lang="it"><body><article>Commenti disattivati</article></body></html>`;

let failures = 0;

function check(name: string, condition: boolean, detail: string) {
  if (condition) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.error(`  FAIL  ${name} — ${detail}`);
  }
}

async function scenario(profileKey: string, html: string, run: () => Promise<void>) {
  const context = await getContext(profileKey);
  await context.unrouteAll?.().catch(() => undefined);
  await context.route("**/p/SELFTEST/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: html })
  );
  await run();
}

async function testProxyParser() {
  console.log("--- Test 1: Proxy Parser & Formats ---");

  const p1 = parseProxy("http://alice:secret123@192.168.1.50:8080");
  check("URL http con credenziali", p1?.server === "http://192.168.1.50:8080" && p1?.username === "alice" && p1?.authPass === "secret123", JSON.stringify(p1));

  const p2 = parseProxy("socks5://user:pass@10.0.0.1:1080");
  check("URL socks5", p2?.server === "socks5://10.0.0.1:1080" && p2?.protocol === "socks5", JSON.stringify(p2));

  const p3 = parseProxy("185.220.101.5:9050:proxyuser:proxypass");
  check("Formato colon ip:port:user:pass", p3?.server === "http://185.220.101.5:9050" && p3?.username === "proxyuser" && p3?.authPass === "proxypass", JSON.stringify(p3));

  const p4 = parseProxy("185.220.101.5:8080");
  check("Formato colon ip:port", p4?.server === "http://185.220.101.5:8080" && p4?.username === undefined, JSON.stringify(p4));

  const p5 = parseProxy("invalid-proxy-string");
  check("Proxy non valido rifiutato", p5 === null, String(p5));

  const pw = toPlaywrightProxy(p1);
  check("Generazione config Playwright", pw?.server === "http://192.168.1.50:8080" && pw?.username === "alice", JSON.stringify(pw));
}

async function testDevicePresets() {
  console.log("\n--- Test 2: Mobile Device Presets ---");

  const pixel = resolveDeviceConfig({ devicePreset: "PIXEL_7" });
  check("Pixel 7 viewport e touch", pixel.viewport.width === 412 && pixel.viewport.height === 915 && pixel.hasTouch && pixel.isMobile, JSON.stringify(pixel.viewport));
  check("Pixel 7 platform Android", pixel.platform === "Linux armv81" && pixel.secChUaPlatform === "Android", pixel.platform);

  const iphone = resolveDeviceConfig({ devicePreset: "IPHONE_15_PRO" });
  check("iPhone 15 Pro viewport e touch", iphone.viewport.width === 393 && iphone.viewport.height === 852 && iphone.hasTouch && iphone.isMobile, JSON.stringify(iphone.viewport));
  check("iPhone 15 Pro platform iOS", iphone.platform === "iPhone" && iphone.secChUaPlatform === "iOS", iphone.platform);

  const desktop = resolveDeviceConfig({ devicePreset: "DESKTOP" });
  check("Desktop viewport no touch", desktop.viewport.width === 1280 && !desktop.hasTouch && !desktop.isMobile, JSON.stringify(desktop.viewport));

  const custom = resolveDeviceConfig({ devicePreset: "CUSTOM", viewportWidth: 500, viewportHeight: 1000, isMobile: true });
  check("Custom device resolution", custom.viewport.width === 500 && custom.viewport.height === 1000 && custom.isMobile, JSON.stringify(custom.viewport));
}

async function testMobileStealth() {
  console.log("\n--- Test 3: Mobile Stealth in Playwright Browser ---");

  const context = await getContext("selftest_stealth_mobile", {
    devicePreset: "PIXEL_7",
  });
  const page = await context.newPage();
  await page.goto("data:text/html,<!doctype html><html><body><h1>Stealth Test</h1></body></html>");

  const results = await page.evaluate(() => {
    return {
      webdriver: (navigator as unknown as { webdriver?: boolean }).webdriver,
      maxTouchPoints: navigator.maxTouchPoints,
      platform: navigator.platform,
      screenWidth: screen.width,
      screenHeight: screen.height,
      hasTouchStart: "ontouchstart" in window,
    };
  });

  check("Stealth: navigator.webdriver undefined", results.webdriver === undefined, `got ${results.webdriver}`);
  check("Stealth: maxTouchPoints > 0 su mobile", results.maxTouchPoints === 5, `got ${results.maxTouchPoints}`);
  check("Stealth: platform Linux armv81", results.platform === "Linux armv81", `got ${results.platform}`);
  check("Stealth: screen dimensions match mobile viewport", results.screenWidth === 412 && results.screenHeight === 915, `${results.screenWidth}x${results.screenHeight}`);
  check("Stealth: ontouchstart in window", results.hasTouchStart === true, `got ${results.hasTouchStart}`);

  await page.close();
}

async function testSecurityAndMeta() {
  console.log("\n--- Test 4: AES-256 Token Encryption & Meta OAuth Helpers ---");

  const testToken = "EAAGNO4a7r2...mock_long_lived_token_60d_secret";
  const encrypted = encryptToken(testToken);
  check("Token cifrato in formato iv:authTag:hex", encrypted.split(":").length === 3, encrypted);

  const decrypted = decryptToken(encrypted);
  check("Decifratura token identica al valore originale", decrypted === testToken, decrypted);

  process.env.META_APP_ID = "123456789012345";
  process.env.META_APP_SECRET = "mock_secret_abcdef123456";

  const config = getMetaAppConfig();
  check("Meta App Config rilevato da env", config.isConfigured && config.appId === "123456789012345", JSON.stringify(config));

  const authUrl = buildMetaOAuthUrl("selftest_state_123", "http://localhost:3000/api/auth/meta/callback");
  check("URL Meta OAuth corretto con scope ufficiali", authUrl.includes("instagram_business_content_publish") && authUrl.includes("client_id=123456789012345"), authUrl);
}

async function main() {
  console.log("Instara Crew selftest (mock Instagram, no real account)\n");

  await testProxyParser();
  await testDevicePresets();
  await testMobileStealth();
  await testSecurityAndMeta();

  console.log("\n--- Test 5: Instagram Automation Scenarios ---");

  await scenario("selftest_desktop", POST_PAGE, async () => {
    const dry = await publishComment({
      profileKey: "selftest_desktop",
      targetUrl: TARGET,
      commentText: "bella luce in questo scatto",
      dryRun: true,
      browserOptions: { devicePreset: "DESKTOP" },
    });
    check("Desktop: dry-run non pubblica", dry.ok && dry.code === "DRY_RUN", JSON.stringify(dry));

    const live = await publishComment({
      profileKey: "selftest_desktop",
      targetUrl: TARGET,
      commentText: "composizione davvero pulita",
      dryRun: false,
      browserOptions: { devicePreset: "DESKTOP" },
    });
    check("Desktop: pubblicazione live verificata", live.ok && live.code === "POSTED", JSON.stringify(live));
  });

  await scenario("selftest_mobile", MOBILE_POST_PAGE, async () => {
    const mobileLive = await publishComment({
      profileKey: "selftest_mobile",
      targetUrl: TARGET,
      commentText: "scatto magnifico su mobile",
      dryRun: false,
      browserOptions: { devicePreset: "PIXEL_7" },
    });
    check("Mobile: apertura tray e pubblicazione live", mobileLive.ok && mobileLive.code === "POSTED", JSON.stringify(mobileLive));
  });

  await scenario("selftest_login", LOGIN_PAGE, async () => {
    const outcome = await publishComment({
      profileKey: "selftest_login",
      targetUrl: TARGET,
      commentText: "test",
      dryRun: false,
      browserOptions: { devicePreset: "PIXEL_7" },
    }).catch((error: Error & { code?: string }) => error);
    check(
      "sessione scaduta rilevata",
      outcome instanceof Error && (outcome as { code?: string }).code === "NEEDS_LOGIN",
      String(outcome)
    );
  });

  await scenario("selftest_nofield", NO_FIELD_PAGE, async () => {
    const outcome = await publishComment({
      profileKey: "selftest_nofield",
      targetUrl: TARGET,
      commentText: "test",
      dryRun: false,
      browserOptions: { devicePreset: "PIXEL_7" },
    }).catch((error: Error & { code?: string }) => error);
    check(
      "campo commento assente rilevato",
      outcome instanceof Error && (outcome as { code?: string }).code === "NOT_FOUND",
      String(outcome)
    );
  });

  const blocked = await publishComment({
    profileKey: "selftest_blocked",
    targetUrl: "https://example.com/p/SELFTEST/",
    commentText: "test",
    dryRun: true,
  }).catch((error: Error) => error);
  check(
    "dominio non Instagram rifiutato",
    blocked instanceof Error && /instagram\.com/i.test(blocked.message),
    String(blocked)
  );

  await closeAllContexts();

  console.log(failures ? `\n${failures} check falliti.` : "\nTutti i check superati con successo!");
  process.exit(failures ? 1 : 0);
}

main().catch(async (error) => {
  await closeAllContexts();
  console.error(error);
  process.exit(1);
});
