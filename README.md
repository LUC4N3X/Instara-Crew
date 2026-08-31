<p align="center">
  <a href="https://github.com/LUC4N3X/Instara-Crew">
    <img src="public/logo.png" width="100%" style="max-width: 820px; border-radius: 20px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7); display: block; margin: 0 auto;" alt="Instara Crew Banner" />
  </a>
</p>

<p align="center">
  <a href="https://github.com/LUC4N3X/Instara-Crew/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-15+-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" /></a>
  <a href="https://playwright.dev"><img src="https://img.shields.io/badge/Playwright-Stealth_%26_Mobile-45ba4b?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright" /></a>
  <a href="https://developers.facebook.com/docs/instagram-platform"><img src="https://img.shields.io/badge/Meta_Graph_API-OAuth_2.0-0081FB?style=for-the-badge&logo=meta&logoColor=white" alt="Meta Graph API" /></a>
  <a href="https://cloud.google.com/vertex-ai"><img src="https://img.shields.io/badge/Gemini_Multimodal-Vertex_AI-8E75FF?style=for-the-badge&logo=googlecloud&logoColor=white" alt="Gemini Multimodal" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-Strict_Mode-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
</p>

---

<h3 align="center">
  ⚡ <b>Next-Generation Instagram Operations Console & Multi-Account Automation Platform</b> ⚡
</h3>

<p align="center">
  <b>Instara Crew</b> is an enterprise-grade suite engineered for large-scale Instagram workflow management, moderation, and automated operations.<br>
  Featuring a cutting-edge <b>Dual-Engine Hybrid Architecture</b>, it combines the 100% compliance of <b>Official Meta Graph APIs (Zero Ban Risk)</b> with the advanced capabilities of <b>Playwright Mobile Stealth Emulation with Dedicated Proxies</b> and the contextual vision intelligence of <b>Google Gemini AI</b>.
</p>

---

## 🏛️ Dual-Engine Architecture

Instara Crew bridges the gap between official API compliance and multi-account browser automation:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                               INSTARA CREW CORE PLATFORM                                 │
├────────────────────────────────────────────┬─────────────────────────────────────────────┤
│  💎 ENGINE B: Official Meta Graph API      │  📱 ENGINE A: Stealth Browser & Proxies     │
│  (100% Policy Compliant / Zero Risk)       │  (Multi-Account Mobile / Anti-Detection)    │
├────────────────────────────────────────────┼─────────────────────────────────────────────┤
│  • Official Instagram OAuth 2.0 Login      │  • Dedicated HTTP / HTTPS / SOCKS5 Proxies  │
│  • AES-256-GCM Encrypted Long-Lived Tokens │  • Real Pixel 7, Galaxy S24, iPhone Presets │
│  • Official comment moderation & replies   │  • Real Multi-Touch & WebRTC Leak Shield    │
│  • Native Image & Reel publishing          │  • Stochastic Human Pacing & Uniqueness db  │
│  • ZERO risk of captcha, challenge, or ban │  • Isolated Persistent Browser Profiles     │
└────────────────────────────────────────────┴─────────────────────────────────────────────┘
```

---

## 🌟 Key Features

### 1. 💎 Engine B: Official Meta Graph API & OAuth 2.0 (Zero-Risk Engine)
- **Official Instagram OAuth Flow**: Standard authorization for Business & Creator accounts with automatic code exchange for **60-Day Long-Lived Access Tokens**.
- **Hardware-Grade Token Encryption**: Access tokens are encrypted at rest using `AES-256-GCM` before being stored in the database.
- **Zero Passwords Stored**: Fully adheres to Meta Developer Policies.
- **1-Click Token Refresh & Healthcheck**: Real-time validation of API health, permissions, and token expiry countdown in dashboard.

### 2. 📱 Engine A: High-Fidelity Mobile Emulation & Dedicated Proxies
- **Multi-Protocol Proxy Support**: Seamless support for `http://`, `https://`, `socks5://`, and colon-formatted strings (`host:port:user:pass` or `host:port`).
- **Real-Time Proxy Diagnostics**: Live ping and external IP verification directly from the UI before launching browser tasks.
- **Advanced Stealth Fingerprinting**:
  - `navigator.webdriver` completely scrubbed (`undefined`).
  - True mobile touch emulation (`navigator.maxTouchPoints = 5`, `ontouchstart` window events).
  - Consistent Client Hints (`Sec-CH-UA-Platform: Android / iOS`) and native hardware screen aspect ratios.
- **WebRTC IP Leak Defense**: Chromium launch flags enforce UDP blocking to prevent local IP discovery.
- **Responsive Instagram Mobile UI Handlers**: Native automation of mobile comment drawers, bottom sheets, and app-install overlay dismissals.

### 3. ✦ Gemini Multimodal AI Composer
- **Visual Post Comprehension**: Gemini inspects the image or screenshot to extract contextual nuances, mood, lighting, and aesthetic subjects.
- **Unique Semantic Generation**: Produces up to 100 uniquely worded comments per run, customizable by tone (*Natural, Casual, Enthusiastic, Elegant, Minimal*).
- **Atomic Database Constraints**: Every connected account receives an exclusive comment enforced by database-level unique keys (`@@unique([jobId, commentText])`).

### 4. 🛡️ Safety Guardrails & Human Pacing
- **Stochastic Delays**: Natural typing simulation with randomized intervals between `minDelaySec` and `maxDelaySec`.
- **Hourly & Daily Caps**: Automated throttling guards (`ACCOUNT_MAX_PER_HOUR`, `ACCOUNT_MAX_PER_DAY`, `ACTIVE_HOUR_FROM` to `ACTIVE_HOUR_TO`).
- **Dry-Run Mode**: Types comments and tests selector integrity without submitting to live posts.
- **Instant Circuit Breaker**: Live Pause, Resume, and Cancel buttons with immediate account deactivation upon detecting security checkpoints.

---

## 🛠️ Quickstart & Setup Guide

### 1. Prerequisites
- **Node.js**: 20+ LTS
- **Docker & Docker Compose** (for PostgreSQL and Redis)
- **Google Cloud CLI** (for Gemini on Vertex AI)

### 2. Clone & Install
```bash
# Clone the repository
git clone https://github.com/LUC4N3X/Instara-Crew.git
cd Instara-Crew

# Install dependencies and Playwright Chromium
npm install
npx playwright install chromium
```

### 3. Start Database & Cache
```bash
docker compose up -d
```

### 4. Environment Configuration
```bash
cp .env.example .env
```

Generate a 256-bit encryption key for securing OAuth tokens:
```powershell
$key = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($key)
[Convert]::ToBase64String($key)
```
Paste the generated base64 string into `SESSION_ENCRYPTION_KEY_BASE64` in `.env`.

### 5. Authenticate Google Cloud (Gemini Vision AI)
```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable aiplatform.googleapis.com
```

### 6. Run Migrations & Start Console
```bash
npm run prisma:generate
npm run prisma:migrate
npm run dev:all
```
Open your browser at **http://localhost:3000** 🚀

---

## 🧪 Comprehensive Verification Suite

Run the full automated test suite anytime with:

```bash
npm run test
```

```text
> instara-crew@0.1.0 test
> npm run typecheck && npm run test:guardrails && npm run test:selftest

  PASS  Test 1: Proxy Parser & Formats (HTTP, SOCKS5, colon host:port:user:pass)
  PASS  Test 2: Mobile Device Presets (Pixel 7, Galaxy S24, iPhone 15 Pro, Desktop)
  PASS  Test 3: Mobile Stealth in Playwright (navigator.webdriver undefined, maxTouchPoints: 5)
  PASS  Test 4: AES-256 Token Encryption & Meta OAuth Helpers
  PASS  Test 5: Instagram Automation Scenarios (Desktop, Mobile Tray, Dry-Run, Needs-Login)

All automated checks passed successfully!
```

---

## ⚖️ LEGAL DISCLAIMER & LIMITATION OF LIABILITY

> [!IMPORTANT]
> **PLEASE READ THIS SECTION CAREFULLY BEFORE USING THIS SOFTWARE.**

### 1. Non-Affiliation with Meta Platforms, Inc.
**Instara Crew** is an independent, open-source software project developed exclusively for research, educational, and workflow management purposes.
* **Instagram®**, **Meta®**, and all associated trademarks, logos, brand names, and intellectual property are registered trademarks of **Meta Platforms, Inc.**
* This software is **NOT** affiliated, sponsored, authorized, endorsed, maintained, or in any way officially associated with Meta Platforms, Inc., Instagram, or any of their subsidiaries or affiliates.

### 2. Educational & Research Purpose
This software is provided strictly for **educational, academic, testing, and technical evaluation purposes** related to browser automation architectures, artificial intelligence workflows, and official REST APIs. Any operational use of this software to interact with third-party platforms is done entirely at the sole discretion, initiative, and risk of the end user.

### 3. Complete Disclaimer of Warranties & Total Limitation of Liability (AS-IS)
THE SOFTWARE IS PROVIDED **"AS IS"**, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.

UNDER NO CIRCUMSTANCES SHALL THE AUTHORS, DEVELOPERS, MAINTAINERS, OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, LOSSES, OR LIABILITIES, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE, MISUSE, INABILITY TO USE, OR PERFORMANCE OF THE SOFTWARE. THIS INCLUDES, WITHOUT LIMITATION:
- ACCOUNT RESTRICTIONS, TEMPORARY OR PERMANENT BANS, ACTION BLOCKS, OR SECURITY CHALLENGES IMPOSED BY INSTAGRAM/META;
- LOSS OF DATA, REVENUE, GOODWILL, OR BUSINESS INTERRUPTION;
- ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES.

### 4. End-User Compliance & Responsibility
It is the sole and exclusive responsibility of the end user to:
1. Comply with the [Instagram Terms of Use](https://help.instagram.com/581066165581870) and [Community Guidelines](https://help.instagram.com/477434105621119);
2. Ensure full compliance with all applicable local, national, and international laws and regulations regarding data protection, privacy, and automated communications;
3. Use responsible rates, delays, and volumes that do not abuse or degrade third-party server infrastructure.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.
