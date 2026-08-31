import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

async function main() {
  const originalLogoPath = "C:\\Users\\Luca Drogo\\.gemini\\antigravity\\brain\\20953499-c27c-45ce-b306-7df526598f1a\\.user_uploaded\\media_1788179484977.jpg";
  const logoBase64 = fs.readFileSync(originalLogoPath).toString("base64");
  const logoDataUri = `data:image/jpeg;base64,${logoBase64}`;

  // Clean, seamless widescreen banner containing the real original artwork on matching dark background
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
      background: #090c13;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .banner {
      width: 1280px;
      height: 420px;
      position: relative;
      background: radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.12), transparent 60%),
                  radial-gradient(circle at 50% 50%, rgba(6, 182, 212, 0.08), transparent 70%),
                  #090c13;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .original-logo {
      height: 400px;
      width: 400px;
      object-fit: contain;
      filter: drop-shadow(0 0 40px rgba(124, 58, 237, 0.25));
    }
  </style>
</head>
<body>
  <div class="banner">
    <img src="${logoDataUri}" class="original-logo" alt="Instara Crew Real Logo" />
  </div>
</body>
</html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1280, height: 420 },
    deviceScaleFactor: 2, // 2560 x 840 high-res output
  });

  await page.setContent(html);
  await page.waitForTimeout(200);

  const outPath = path.resolve(__dirname, "../docs/assets/instara-crew-banner.png");
  await page.screenshot({ path: outPath });
  await browser.close();

  console.log(`Clean widescreen banner generated at: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
