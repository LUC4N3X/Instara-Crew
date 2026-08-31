<div align="center">

<img src="docs/assets/instara-crew-banner.png" alt="Instara Crew" width="100%" style="border-radius: 12px; margin-bottom: 16px;" />

# Instara Crew

**A clean-room Instagram operations console and multi-account automation suite.**

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-GPL--3.0-blue.svg?style=flat-square" alt="GPL-3.0 License" /></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-15+-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js" /></a>
  <a href="https://developers.facebook.com/docs/instagram-platform"><img src="https://img.shields.io/badge/Meta_Graph_API-OAuth_2.0-0081FB?style=flat-square&logo=meta&logoColor=white" alt="Meta Graph API" /></a>
  <a href="https://playwright.dev"><img src="https://img.shields.io/badge/Playwright-Stealth_%26_Mobile-45ba4b?style=flat-square&logo=playwright&logoColor=white" alt="Playwright" /></a>
  <a href="https://cloud.google.com/vertex-ai"><img src="https://img.shields.io/badge/Gemini-Vertex_AI-8E75FF?style=flat-square&logo=googlecloud&logoColor=white" alt="Gemini" /></a>
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
</p>

<p align="center">
  <code>Dual-Engine</code> &nbsp;·&nbsp; <code>Meta OAuth 2.0</code> &nbsp;·&nbsp; <code>Dedicated Proxies</code> &nbsp;·&nbsp; <code>Mobile Touch Emulation</code> &nbsp;·&nbsp; <code>Gemini Vision</code> &nbsp;·&nbsp; <code>Zero Stored Passwords</code>
</p>

</div>

---

## Architecture Overview

Instara Crew is built around two operational engines depending on your account type:

```
                      ┌────────────────────────────┐
                      │  Instara Crew Dashboard    │
                      └─────────────┬──────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               │                                         │
               ▼                                         ▼
  ┌─────────────────────────┐               ┌─────────────────────────┐
  │  Engine B: Meta OAuth   │               │  Engine A: Browser Hub  │
  │  (Official Graph API)   │               │  (Stealth + Proxy)      │
  ├─────────────────────────┤               ├─────────────────────────┤
  │ • Instagram OAuth login │               │ • HTTP/SOCKS5 proxy     │
  │ • 60-day encrypted token│               │ • Pixel 7/iPhone touch  │
  │ • Read owned media      │               │ • WebRTC leak shield    │
  │ • Official replies      │               │ • Human pacing & limits │
  │ • Native post publish   │               │ • Unique Gemini text    │
  │ • 100% policy compliant │               │ • Dry-run verification  │
  └─────────────────────────┘               └─────────────────────────┘
```

| Engine | Ideal For | Authentication | Network / IP | Ban Risk |
|---|---|---|---|---|
| **Engine B (Meta API)** | Creator / Business accounts | Official OAuth 2.0 (60-day token) | Direct Graph API | **Zero** (100% official) |
| **Engine A (Browser)** | Personal accounts & multi-profile testing | Persistent session cookie (login once) | Dedicated proxy per account | Mitigated via mobile stealth & pacing |

---

## Core Features

- **Official Meta Graph API (Engine B)**: Connect Creator/Business accounts via standard Instagram OAuth. Access tokens are encrypted at rest using `AES-256-GCM`.
- **Per-Account Proxy Isolation (Engine A)**: Supports HTTP, HTTPS, SOCKS5, and `host:port:user:pass` strings. Built-in latency tester checks connectivity and external IP before launching.
- **Mobile Touch Fingerprinting**: Emulates Google Pixel 7 (Android 14) and iPhone 15 Pro with authentic DPR, viewports, touch points (`maxTouchPoints: 5`), touch events, and WebRTC leak defense (`--force-webrtc-ip-handling-policy=disable_non_proxied_udp`).
- **Gemini Multimodal Composer**: Inspects post screenshots to generate distinct, context-aware comments per account with DB-level uniqueness constraints.
- **Safety Guardrails**: Configurable random delay windows (`minDelaySec`-`maxDelaySec`), hourly/daily caps, active operational hours, and immediate shutdown on security challenge.

---

## Quickstart

### 1. Prerequisites
- **Node.js** 20+ LTS
- **Docker Desktop** (for PostgreSQL & Redis)
- **Google Cloud CLI** (for Vertex AI ADC login)

### 2. Installation
```bash
git clone https://github.com/LUC4N3X/Instara-Crew.git
cd Instara-Crew

npm install
npx playwright install chromium
```

### 3. Start Database & Cache
```bash
docker compose up -d
```

### 4. Configuration
```bash
cp .env.example .env
```

Generate a 256-bit key for encrypting OAuth tokens:
```powershell
$key = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($key)
[Convert]::ToBase64String($key)
```
Paste it into `SESSION_ENCRYPTION_KEY_BASE64` in `.env`.

### 5. Google Cloud Auth (Gemini)
```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable aiplatform.googleapis.com
```

### 6. Run & Open
```bash
npm run prisma:generate
npm run prisma:migrate
npm run dev:all
```
Open **http://localhost:3000**.

---

## Testing & Verification

Run the automated test suite:

```bash
npm run test
```

- `typecheck`: Strict TypeScript checks (0 errors).
- `test:guardrails`: Safety invariants (domain lock, rate limits, dry-run).
- `test:selftest`: End-to-end simulation against mock Instagram responses (proxy parser, mobile touch stealth, AES-256 cipher, desktop/mobile comment flows).

---

## Legal Disclaimer & Limitation of Liability

> [!IMPORTANT]
> **READ CAREFULLY BEFORE USING THIS SOFTWARE.**

### 1. Non-Affiliation with Meta Platforms, Inc.
**Instara Crew** is an independent open-source tool developed for research, education, and workflow management.
* **Instagram®** and **Meta®** are registered trademarks of **Meta Platforms, Inc.**
* This software is **not** affiliated with, endorsed, sponsored, or certified by Meta Platforms, Inc. or Instagram.

### 2. Educational & Research Purpose
This repository is distributed strictly for **technical study, educational purposes, and testing** of browser automation, multimodal LLMs, and REST API architectures.

### 3. Total Disclaimer of Warranties & Limitation of Liability (AS-IS)
THE SOFTWARE IS PROVIDED **"AS IS"**, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NONINFRINGEMENT.

IN NO EVENT SHALL THE AUTHORS, MAINTAINERS, OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY (INCLUDING, WITHOUT LIMITATION: ACCOUNT RESTRICTIONS, ACTION BLOCKS, SUSPENSIONS BY INSTAGRAM/META, LOSS OF DATA, REVENUE, OR BUSINESS INTERRUPTION) ARISING FROM, OUT OF, OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### 4. User Responsibility
It is the sole responsibility of the end user to comply with [Instagram Terms of Use](https://help.instagram.com/581066165581870), [Community Guidelines](https://help.instagram.com/477434105621119), and all applicable local privacy and communication laws.

---

## License
 
Released under the **GNU General Public License v3.0 (GPL-3.0)**. See [`LICENSE`](LICENSE) for details.
