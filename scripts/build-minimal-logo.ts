import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

async function main() {
  // Ultra-clean geometric SVG: Infinity loop intersecting with two sleek dialogue nodes
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="1024" height="1024">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bgGlow" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#141126" />
      <stop offset="60%" stop-color="#08090d" />
      <stop offset="100%" stop-color="#050608" />
    </radialGradient>

    <!-- Main Tech Gradient (Violet to Pink to Cyan) -->
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8b5cf6" />
      <stop offset="45%" stop-color="#d946ef" />
      <stop offset="80%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#38bdf8" />
    </linearGradient>

    <!-- Accent Secondary Gradient -->
    <linearGradient id="accentGrad" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="50%" stop-color="#ec4899" />
      <stop offset="100%" stop-color="#7c3aed" />
    </linearGradient>

    <!-- Soft Glow Filter -->
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <filter id="ambientBlur" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="38" />
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="512" height="512" fill="url(#bgGlow)" />
  
  <!-- Subtle Ambient Glow behind logo -->
  <g opacity="0.45" filter="url(#ambientBlur)">
    <circle cx="180" cy="256" r="90" fill="#7c3aed" />
    <circle cx="332" cy="256" r="90" fill="#06b6d4" />
  </g>

  <!-- Fine Vector Geometry -->
  <g transform="translate(0, 0)">
    <!-- Primary Outer Infinity Loop Track -->
    <path 
      d="M 170,256 C 120,200 65,210 65,256 C 65,302 120,312 170,256 C 220,200 292,200 342,256 C 392,312 447,302 447,256 C 447,210 392,200 342,256 C 292,312 220,312 170,256 Z" 
      fill="none" 
      stroke="url(#brandGrad)" 
      stroke-width="32" 
      stroke-linecap="round" 
      stroke-linejoin="round"
      filter="url(#softGlow)"
    />

    <!-- Overlapping Ribbon Layer for 3D depth -->
    <path 
      d="M 140,222 C 85,225 65,245 65,256 C 65,285 95,300 135,275 C 195,230 256,230 315,275" 
      fill="none" 
      stroke="url(#accentGrad)" 
      stroke-width="26" 
      stroke-linecap="round"
      opacity="0.9"
    />

    <!-- Left Speech Bubble Tail / Node -->
    <path 
      d="M 72,275 L 48,305 C 45,308 50,312 54,308 L 88,288 Z" 
      fill="#8b5cf6" 
      opacity="0.95"
    />

    <!-- Right Speech Bubble Tail / Node -->
    <path 
      d="M 440,237 L 464,207 C 467,204 462,200 458,204 L 424,224 Z" 
      fill="#06b6d4" 
      opacity="0.95"
    />

    <!-- Minimal Modern Inner Dots / Core Nodes -->
    <circle cx="160" cy="256" r="8" fill="#ffffff" opacity="0.9" />
    <circle cx="256" cy="256" r="10" fill="#ffffff" opacity="0.95" filter="url(#softGlow)" />
    <circle cx="352" cy="256" r="8" fill="#ffffff" opacity="0.9" />
  </g>
</svg>`;

  const html = `<!doctype html>
<html>
<head>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { width: 1024px; height: 1024px; background: #08090d; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    svg { width: 1024px; height: 1024px; display: block; }
  </style>
</head>
<body>
  ${svgContent}
</body>
</html>`;

  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1024, height: 1024 },
    deviceScaleFactor: 1,
  });

  await page.setContent(html);
  await page.waitForTimeout(200);

  const pngPath = path.resolve(__dirname, "../public/logo.png");
  const jpgPath = path.resolve(__dirname, "../public/logo.jpg");

  await page.screenshot({ path: pngPath, type: "png" });
  await page.screenshot({ path: jpgPath, type: "jpeg", quality: 95 });

  console.log(`Minimal logo saved to: ${pngPath}`);

  // Now regenerate the widescreen banner with this new clean logo
  const logoBase64 = fs.readFileSync(pngPath).toString("base64");
  const logoDataUri = `data:image/png;base64,${logoBase64}`;

  const bannerHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 1200px;
      height: 330px;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
      background: #08090d;
    }
    .banner {
      width: 1200px;
      height: 330px;
      position: relative;
      background: radial-gradient(circle at 18% 50%, rgba(139, 92, 246, 0.16), transparent 45%),
                  radial-gradient(circle at 82% 50%, rgba(6, 182, 212, 0.12), transparent 45%),
                  #08090d;
      display: flex;
      align-items: center;
      padding: 0 54px;
      gap: 46px;
      border: 1px solid #171b26;
    }
    .grid {
      position: absolute;
      inset: 0;
      background-image: 
        linear-gradient(to right, rgba(255, 255, 255, 0.015) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.015) 1px, transparent 1px);
      background-size: 24px 24px;
      pointer-events: none;
    }
    .logo-wrap {
      position: relative;
      width: 175px;
      height: 175px;
      flex-shrink: 0;
    }
    .logo-glow {
      position: absolute;
      inset: -6px;
      border-radius: 36px;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.35), rgba(6, 182, 212, 0.25));
      filter: blur(14px);
      opacity: 0.6;
    }
    .logo-img {
      position: relative;
      width: 175px;
      height: 175px;
      border-radius: 28px;
      object-fit: cover;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.7);
    }
    .content {
      position: relative;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 9px;
    }
    .tag {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .tag .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #06b6d4;
      box-shadow: 0 0 8px #06b6d4;
    }
    .title {
      font-size: 42px;
      font-weight: 800;
      letter-spacing: -1.2px;
      color: #ffffff;
      line-height: 1.1;
    }
    .desc {
      font-size: 15px;
      line-height: 1.45;
      color: #94a3b8;
      font-weight: 450;
      max-width: 640px;
    }
    .pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 3px;
    }
    .pill {
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      background: #10141e;
      border: 1px solid #1e2638;
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
      <img src="${logoDataUri}" class="logo-img" alt="Instara Crew Logo" />
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

  const bannerPage = await browser.newPage({
    viewport: { width: 1200, height: 330 },
    deviceScaleFactor: 2,
  });

  await bannerPage.setContent(bannerHtml);
  await bannerPage.waitForTimeout(200);

  const bannerOutPath = path.resolve(__dirname, "../docs/assets/instara-crew-banner.png");
  await bannerPage.screenshot({ path: bannerOutPath });
  await browser.close();

  console.log(`Banner regenerated at: ${bannerOutPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
