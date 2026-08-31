<div align="center">

<img src="docs/assets/instara-crew-banner.png" alt="Instara Crew — Dual-Engine Instagram Operations Console" width="100%" style="border-radius: 14px; margin-bottom: 18px;" />

# Scale every workflow. Zero compromises.

**A modern Instagram operations console, official Meta Graph API manager, and stealth automation suite powered by Gemini Multimodal AI.**

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License" /></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-15+-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" /></a>
  <a href="https://developers.facebook.com/docs/instagram-platform"><img src="https://img.shields.io/badge/Meta_Graph_API-OAuth_2.0-0081FB?style=for-the-badge&logo=meta&logoColor=white" alt="Meta Graph API" /></a>
  <a href="https://playwright.dev"><img src="https://img.shields.io/badge/Playwright-Stealth_%26_Mobile-45ba4b?style=for-the-badge&logo=playwright&logoColor=white" alt="Playwright" /></a>
  <a href="https://cloud.google.com/vertex-ai"><img src="https://img.shields.io/badge/Gemini_Multimodal-Vertex_AI-8E75FF?style=for-the-badge&logo=googlecloud&logoColor=white" alt="Gemini Multimodal" /></a>
</p>

<p align="center">
  <code>Dual-Engine Architecture</code> &nbsp;·&nbsp; <code>Meta OAuth 2.0</code> &nbsp;·&nbsp; <code>Dedicated Proxies</code> &nbsp;·&nbsp; <code>Mobile Touch Emulation</code> &nbsp;·&nbsp; <code>Gemini Vision AI</code> &nbsp;·&nbsp; <code>Zero Ban Guardrails</code>
</p>

</div>

---

## ✦ The Dual-Engine Philosophy

<div align="center">

### ⚡ Power meets 100% compliance.

**No single method fits every workload.**

</div>

Instara Crew bridges the gap between official API compliance and multi-account automation by offering two dedicated operational engines:

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

## ✦ Key Capabilities

### 💎 Engine B: Official Meta Graph API (Zero Ban Risk)
- **Official OAuth 2.0 Instagram Login**: Connect Creator/Business accounts officially via Meta OAuth.
- **60-Day Long-Lived Access Tokens**: Automatically exchanged and stored encrypted at rest using **`AES-256-GCM`**.
- **100% Policy Compliant**: Zero passwords stored, zero reverse engineering, zero risk of bans or checkpoints.
- **Official Operations**: Real-time token healthchecks, owned media inspection, comment replies, and direct image/Reel publishing.

### 📱 Engine A: High-Fidelity Mobile Stealth & Dedicated Proxies
- **Dedicated Proxy Isolation**: Assign unique proxies per account (`http://`, `https://`, `socks5://`, or colon `ip:port:user:pass`) with live latency/ping tests.
- **Hardware-Level Mobile Emulation**: Authentic presets for **Google Pixel 7 (Android 14)**, **Galaxy S24**, and **iPhone 15 Pro** with native DPI, viewports, touch points (`maxTouchPoints: 5`), and touch events (`ontouchstart`).
- **WebRTC IP Leak Defense**: Chromium launch flags enforce non-proxied UDP blocking to safeguard operator IP anonymity.
- **Instagram Mobile Web Support**: Responsive interaction handlers manage mobile bottom-sheet trays and dismiss app-install prompts.

### ✦ Gemini Multimodal Vision AI
- **Contextual Understanding**: Gemini analyzes post images or screenshots to understand style, tone, context, and emotion.
- **Semantic Uniqueness**: Generates up to 100 uniquely worded comments per run across customizable tones (*Natural, Casual, Enthusiastic, Elegant, Minimal*).
- **Atomic Database Constraints**: Every connected account receives an exclusive comment enforced by database-level unique keys (`@@unique([jobId, commentText])`).

### 🛡️ Safety Guardrails & Human Pacing
- **Stochastic Delays**: Variable delays (`minDelaySec` - `maxDelaySec`) with realistic keystroke intervals.
- **Rate-Limiting Guards**: Automatic hourly and daily thresholds (`ACCOUNT_MAX_PER_HOUR`, `ACCOUNT_MAX_PER_DAY`, `ACTIVE_HOUR_FROM` to `ACTIVE_HOUR_TO`).
- **Dry-Run Mode**: Inspect element discovery and typing simulation without sending live comments.
- **Emergency Circuit-Breaker**: Instant pause, resume, and cancel buttons with automatic account shutdown on security checkpoints.

---

## ✦ Quickstart & Installation

### 1. Prerequisites
- **Node.js**: 20+ LTS
- **Docker & Docker Compose** (for PostgreSQL and Redis)
- **Google Cloud SDK** (for Gemini Vision AI on Vertex)

### 2. Setup
```bash
# Clone the repository
git clone https://github.com/LUC4N3X/Instara-Crew.git
cd Instara-Crew

# Install dependencies and Playwright Chromium
npm install
npx playwright install chromium
```

### 3. Launch Services
```bash
docker compose up -d
```

### 4. Configure Environment
```bash
cp .env.example .env
```

Generate a 256-bit encryption key for token security:
```powershell
$key = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($key)
[Convert]::ToBase64String($key)
```
Paste into `SESSION_ENCRYPTION_KEY_BASE64` in `.env`.

### 5. Authenticate Google Cloud (Gemini)
```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable aiplatform.googleapis.com
```

### 6. Run Migrations & Start
```bash
npm run prisma:generate
npm run prisma:migrate
npm run dev:all
```
Open your browser at **http://localhost:3000** 🚀

---

## ✦ Verification & Testing Suite

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
**Instara Crew** is an independent open-source software project developed exclusively for research, education, and workflow management.
* **Instagram®**, **Meta®**, and all related logos, marks, and intellectual property are registered trademarks of **Meta Platforms, Inc.**
* This software is **NOT** affiliated, sponsored, authorized, endorsed, maintained, or in any way officially connected with Meta Platforms, Inc., Instagram, or any of their subsidiaries or affiliates.

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

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.
