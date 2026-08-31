import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

async function main() {
  const logoPath = path.resolve(__dirname, "../public/logo.png");
  const logoBase64 = fs.readFileSync(logoPath).toString("base64");
  const logoDataUri = `data:image/png;base64,${logoBase64}`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 1280px;
      height: 420px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #080b11;
    }
    .banner {
      width: 1280px;
      height: 420px;
      position: relative;
      background: radial-gradient(circle at 18% 45%, rgba(124, 58, 237, 0.35), transparent 48%),
                  radial-gradient(circle at 85% 55%, rgba(6, 182, 212, 0.28), transparent 48%),
                  radial-gradient(circle at 50% 90%, rgba(236, 72, 153, 0.15), transparent 50%),
                  #07090e;
      display: flex;
      align-items: center;
      padding: 0 65px;
      gap: 55px;
      border: 1px solid #1e2738;
    }
    .grid-overlay {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(to right, rgba(255, 255, 255, 0.025) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.025) 1px, transparent 1px);
      background-size: 32px 32px;
      pointer-events: none;
    }
    .logo-box {
      position: relative;
      width: 250px;
      height: 250px;
      flex-shrink: 0;
      display: grid;
      place-items: center;
    }
    .logo-glow {
      position: absolute;
      inset: -15px;
      border-radius: 40px;
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.6), rgba(236, 72, 153, 0.4), rgba(6, 182, 212, 0.5));
      filter: blur(24px);
      opacity: 0.75;
    }
    .logo-img {
      position: relative;
      width: 250px;
      height: 250px;
      border-radius: 36px;
      object-fit: cover;
      border: 1.5px solid rgba(255, 255, 255, 0.15);
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px rgba(124, 58, 237, 0.3);
    }
    .content {
      position: relative;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
      justify-content: center;
    }
    .eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      align-self: flex-start;
      padding: 6px 14px;
      border-radius: 999px;
      background: rgba(124, 58, 237, 0.12);
      border: 1px solid rgba(167, 139, 250, 0.35);
      color: #c4b5fd;
      font-size: 11.5px;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .title {
      font-size: 54px;
      font-weight: 900;
      letter-spacing: -2px;
      line-height: 1.05;
      background: linear-gradient(135deg, #ffffff 20%, #f1f5f9 60%, #94a3b8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      font-size: 17.5px;
      line-height: 1.45;
      color: #94a3b8;
      font-weight: 500;
      max-width: 680px;
    }
    .subtitle b {
      color: #f8fafc;
      font-weight: 700;
    }
    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 9px;
      margin-top: 6px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 9px;
      font-size: 11.5px;
      font-weight: 700;
      border: 1px solid rgba(255, 255, 255, 0.08);
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(10px);
      color: #e2e8f0;
    }
    .badge.meta {
      border-color: rgba(6, 182, 212, 0.4);
      background: rgba(6, 182, 212, 0.12);
      color: #67e8f9;
    }
    .badge.stealth {
      border-color: rgba(124, 58, 237, 0.4);
      background: rgba(124, 58, 237, 0.12);
      color: #d8b4fe;
    }
    .badge.gemini {
      border-color: rgba(236, 72, 153, 0.4);
      background: rgba(236, 72, 153, 0.12);
      color: #f472b6;
    }
  </style>
</head>
<body>
  <div class="banner">
    <div class="grid-overlay"></div>
    
    <div class="logo-box">
      <div class="logo-glow"></div>
      <img src="${logoDataUri}" class="logo-img" alt="Logo" />
    </div>

    <div class="content">
      <div class="eyebrow">
        <span>◈</span> DUAL-ENGINE OPERATIONS PLATFORM
      </div>
      <h1 class="title">INSTARA CREW</h1>
      <p class="subtitle">
        Scale Instagram workflows with <b>Official Meta Graph APIs</b> (100% Policy Compliant) or <b>Playwright Mobile Stealth & Dedicated Proxies</b> powered by <b>Gemini Vision AI</b>.
      </p>
      <div class="badges">
        <span class="badge meta">💎 Meta OAuth 2.0 (Zero Ban Risk)</span>
        <span class="badge stealth">📱 Mobile Touch & Proxy Stealth</span>
        <span class="badge gemini">✦ Gemini Multimodal AI</span>
        <span class="badge">🛡️ Circuit-Breaker Guardrails</span>
      </div>
    </div>
  </div>
</body>
</html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 420 },
    deviceScaleFactor: 2, // 2560 x 840 high-DPI retina output
  });

  await page.setContent(html);
  await page.waitForTimeout(300);

  const outPath = path.resolve(__dirname, "../docs/assets/instara-crew-banner.png");
  await page.screenshot({ path: outPath });
  await browser.close();

  console.log(`Banner generated at: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
