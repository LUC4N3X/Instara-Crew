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
      width: 1200px;
      height: 350px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
      background: #08090d;
    }
    .banner {
      width: 1200px;
      height: 350px;
      position: relative;
      background: radial-gradient(circle at 20% 50%, rgba(124, 58, 237, 0.18), transparent 40%),
                  radial-gradient(circle at 80% 50%, rgba(6, 182, 212, 0.14), transparent 40%),
                  #08090d;
      display: flex;
      align-items: center;
      padding: 0 56px;
      gap: 48px;
      border: 1px solid #161a23;
    }
    .grid {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(to right, rgba(255, 255, 255, 0.018) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.018) 1px, transparent 1px);
      background-size: 24px 24px;
      pointer-events: none;
    }
    .logo-wrap {
      position: relative;
      width: 190px;
      height: 190px;
      flex-shrink: 0;
    }
    .logo-glow {
      position: absolute;
      inset: -8px;
      border-radius: 36px;
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.4), rgba(6, 182, 212, 0.3));
      filter: blur(16px);
      opacity: 0.6;
    }
    .logo-img {
      position: relative;
      width: 190px;
      height: 190px;
      border-radius: 30px;
      object-fit: cover;
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
    }
    .content {
      position: relative;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .tag {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tag .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 8px #38bdf8;
    }
    .title {
      font-size: 44px;
      font-weight: 800;
      letter-spacing: -1.4px;
      color: #ffffff;
      line-height: 1.1;
    }
    .desc {
      font-size: 15.5px;
      line-height: 1.45;
      color: #94a3b8;
      font-weight: 450;
      max-width: 620px;
    }
    .pills {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin-top: 4px;
    }
    .pill {
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      background: #11151f;
      border: 1px solid #1f2737;
      color: #cbd5e1;
    }
    .pill.accent {
      border-color: #0369a1;
      background: rgba(2, 132, 199, 0.12);
      color: #7dd3fc;
    }
  </style>
</head>
<body>
  <div class="banner">
    <div class="grid"></div>
    
    <div class="logo-wrap">
      <div class="logo-glow"></div>
      <img src="${logoDataUri}" class="logo-img" alt="Logo" />
    </div>

    <div class="content">
      <div class="tag">
        <span class="dot"></span> DUAL-ENGINE INSTAGRAM OPERATIONS
      </div>
      <h1 class="title">Instara Crew</h1>
      <p class="desc">
        A clean-room console for Instagram operations. Connect official Meta Graph APIs for 100% policy compliance, or run mobile stealth browser profiles with dedicated proxies and Gemini vision intelligence.
      </p>
      <div class="pills">
        <span class="pill accent">Meta Graph API OAuth</span>
        <span class="pill">Playwright Mobile Stealth</span>
        <span class="pill">Per-Account Proxies</span>
        <span class="pill">Gemini Multimodal</span>
        <span class="pill">Zero Stored Passwords</span>
      </div>
    </div>
  </div>
</body>
</html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 350 },
    deviceScaleFactor: 2, // crisp retina
  });

  await page.setContent(html);
  await page.waitForTimeout(300);

  const outPath = path.resolve(__dirname, "../docs/assets/instara-crew-banner.png");
  await page.screenshot({ path: outPath });
  await browser.close();

  console.log(`Minimalist banner generated at: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
