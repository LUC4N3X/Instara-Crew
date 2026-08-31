import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

async function main() {
  const originalLogoPath = "C:\\Users\\Luca Drogo\\.gemini\\antigravity\\brain\\20953499-c27c-45ce-b306-7df526598f1a\\.user_uploaded\\media_1788179484977.jpg";
  const logoBase64 = fs.readFileSync(originalLogoPath).toString("base64");
  const logoDataUri = `data:image/jpeg;base64,${logoBase64}`;

  // 1200 x 440 widescreen banner that scales the original artwork to fit the landscape format perfectly
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 1200px;
      height: 440px;
      overflow: hidden;
      background: #0b0f19;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .banner-container {
      width: 1200px;
      height: 440px;
      position: relative;
      background: #0b0f19;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .logo-img {
      width: 600px;
      height: 600px;
      object-fit: cover;
      object-position: center 46%;
      filter: contrast(1.05) brightness(1.02);
    }
    /* Soft horizontal fade at edges so it seamlessly blends into the 1200px canvas */
    .fade-overlay {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(ellipse 650px 300px at center, transparent 70%, #0b0f19 98%);
    }
  </style>
</head>
<body>
  <div class="banner-container">
    <img src="${logoDataUri}" class="logo-img" alt="Instara Crew" />
    <div class="fade-overlay"></div>
  </div>
</body>
</html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 440 },
    deviceScaleFactor: 2, // 2400 x 880 retina
  });

  await page.setContent(html);
  await page.waitForTimeout(200);

  const outPath = path.resolve(__dirname, "../docs/assets/instara-crew-banner.png");
  await page.screenshot({ path: outPath });
  await browser.close();

  console.log(`Perfect widescreen banner generated at: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
