<div align="center">

<img src="docs/assets/instara-crew-banner.png" alt="Instara Crew banner" width="100%" />

<br />

# ✦ Instara Crew

🚧 **Active development · Experimental software**

### One control center for multi-account Instagram workflows, AI-assisted comment preparation and operator-controlled execution.

**Self-hosted · Multi-account · Gemini-assisted · Dry-run first**

<br />

[![Status](https://img.shields.io/badge/Status-Active_Development-orange?style=for-the-badge)](#-development-status)
[![Self Hosted](https://img.shields.io/badge/Self--Hosted-Yes-2ea44f?style=for-the-badge)](#-quick-start)
[![GPL v3](https://img.shields.io/badge/GPL-v3-blue?style=for-the-badge)](LICENSE)

<br />

[🎯 What it does](#-what-instara-crew-does) · [🔄 How it works](#-how-it-works) · [✨ Features](#-what-you-can-do) · [🚀 Quick Start](#-quick-start) · [⚖️ Legal](#️-legal--responsible-use)

</div>

---

## 🎯 What Instara Crew Does

**Instara Crew is a self-hosted workspace designed to coordinate Instagram workflows across multiple authorized accounts from one dashboard.**

The idea is simple: instead of opening profiles one by one, preparing every comment separately and losing track of what has already been done, Instara Crew keeps the whole operation together.

From the same console you can manage accounts, create a job for a target post, prepare different comments with Gemini, distribute them across available profiles, start the run and follow what happens item by item.

### In practice, Instara Crew can:

- 👥 manage multiple Instagram profiles from one place;
- 🔐 keep an isolated persistent browser session for each account;
- 🌍 attach optional proxy configuration to individual profiles;
- 📱 use configurable mobile browser profiles for browser-based sessions;
- 💎 use the official Meta Graph API where the requested workflow is supported;
- 🧠 analyze supplied visual and contextual information with Gemini;
- ✍️ prepare multiple context-aware comments with different wording;
- 🎚️ use tone, quantity and extra context when preparing a job;
- 🔀 distribute prepared items across active accounts;
- ⚡ process jobs through a background queue;
- 🧪 run browser workflows in **Dry Run** before final submission;
- ⏸️ pause or cancel an active job;
- 📋 track item status, attempts, failures and execution logs;
- 🛡️ apply configurable per-account activity limits.

> [!NOTE]
> **Prepare once. Coordinate from one place. Keep the operator in control.**

---

## 🔄 How It Works

### 1. 👤 Add the accounts

Accounts are added to the Instara Crew workspace and keep their own state instead of sharing one global browser session.

For browser-based accounts, Instara Crew can maintain a persistent profile so the login session survives between jobs. Each account can also have its own proxy, device configuration, activity limits and status.

For eligible Creator / Business accounts, supported operations can instead use the official Meta OAuth / Graph API path.

### 2. 🎯 Create a job

Create a job for the Instagram post you want to work with.

You define the target, the desired quantity, the tone and any additional context that should guide preparation.

### 3. 🧠 Gemini prepares the batch

Gemini can use supplied visual and contextual information to understand the post and prepare multiple comment candidates that fit the requested tone.

Each generated comment becomes its own job item. Instara Crew also enforces uniqueness inside the same job so the batch stays organized and avoids identical entries.

### 4. 🔀 Instara Crew assigns the items

The preparation worker checks the accounts currently available and distributes job items according to their status and configured per-run limits.

Every item remains individually traceable to its assigned account and execution state.

### 5. ⚡ Start the run

Once the job is ready, background workers process the queued items.

Depending on the configured account and supported workflow, execution can use either the official Meta integration or the account's persistent browser session.

### 6. 👀 Follow everything from the dashboard

The job does not disappear after you press start.

Instara Crew keeps updating its state so you can see which items are ready, running, completed, skipped or failed, together with attempts and useful error information.

You can also pause or cancel the run when needed.

---

## ✨ What You Can Do

### 👥 Multi-account control

Keep several profiles inside one workspace while maintaining separate browser state and account-specific configuration.

This makes it easier to understand **which account is available, which account received an item and what happened during execution**.

### 🧠 Generate different comments with Gemini

Instead of preparing one generic message and copying it repeatedly, Instara Crew can create a batch of different candidate comments based on the context supplied for the post.

The operator controls the requested tone, quantity and additional context before generation.

### 📱 Keep login sessions persistent

Browser-based accounts use isolated persistent Playwright profiles.

The goal is to allow an authenticated local session to be reused on later jobs rather than starting from a blank browser every time.

### 🌍 Configure profiles independently

Each account can keep its own operational configuration, including optional proxy routing, device/browser settings and account-specific limits.

### 💎 Use the official Meta path when available

Instara Crew includes a separate Meta Graph API integration for supported account types and actions.

Official API workflows remain separate from browser workflows because they have different permissions, capabilities and platform requirements.

### 🧪 Verify with Dry Run

**Dry Run is enabled by default.**

For browser workflows, it allows the project to reach the interaction stage and prepare/type the content without performing the final submission.

This gives the operator a way to verify the account, target and workflow before enabling a real action.

### ⚡ Queue the work

Preparation and execution are handled as tracked background jobs through Redis and BullMQ.

The dashboard remains focused on status and control while workers process individual items and write their results back to the project state.

### 🛡️ Control the pace

Instara Crew includes configurable controls such as hourly limits, daily limits, minimum gaps between actions, active-hour windows, concurrency and per-run limits.

These are operational guardrails designed to reduce accidental over-execution. **They do not guarantee platform acceptance or account safety.**

### 📋 Know what happened

Each job item has its own state, attempts, timestamps and error information.

The project is designed to make failures visible instead of hiding everything behind a generic success/failure message.

---

## 🚀 Quick Start

You need **Node.js 20+**, **Docker**, **npm** and the **Google Cloud CLI** if you want to use Gemini through Vertex AI.

```bash
git clone https://github.com/LUC4N3X/Instara-Crew.git
cd Instara-Crew
npm install
npx playwright install chromium
docker compose up -d
```

Create the local environment file:

```powershell
Copy-Item .env.example .env
```

On Linux / macOS:

```bash
cp .env.example .env
```

Generate a 256-bit session encryption key on PowerShell and place the result in `SESSION_ENCRYPTION_KEY_BASE64`:

```powershell
$key = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($key)
[Convert]::ToBase64String($key)
```

Authenticate Google Cloud for Gemini:

```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project YOUR_PROJECT_ID
gcloud services enable aiplatform.googleapis.com
```

Then prepare the database and start Instara Crew:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run dev:all
```

Open **http://localhost:3000**.

---

## 🔧 Configuration

Everything is centralized in [`.env.example`](.env.example).

You mainly configure **PostgreSQL / Redis**, the session encryption key, optional **Meta** credentials, **Google Cloud / Gemini**, browser profile settings and the execution limits you want to use.

For first setup, copy `.env.example` to `.env` and change only what you actually need.

> [!CAUTION]
> 🔐 Never commit your real `.env`, OAuth tokens, cookies, browser profiles, proxy credentials or encryption keys.

---

## 🚧 Development Status

**Instara Crew is experimental and under active development.**

The project is currently in its early `0.1.x` development line. The dashboard, selectors, integrations and workflow behavior can change significantly while the project is refined.

Current development is focused on making account management, job preparation, execution visibility and operator control more reliable and polished.

No compatibility, availability or stability guarantee is made for development builds.

---

## ⚖️ Legal & Responsible Use

> [!IMPORTANT]
> **Please read this section before using the software.** Instara Crew is an independent open-source project that can interact with third-party platforms and services outside the control of its author and contributors.

### 🚫 No affiliation or endorsement

**Instara Crew is not affiliated with, endorsed by, sponsored by, approved by, maintained by or officially connected with Meta Platforms, Inc., Instagram, Google, Google Cloud, Microsoft or any other third-party platform or service referenced by the project.**

Instagram®, Meta® and all other third-party names, trademarks, service marks and logos remain the property of their respective owners. References in this repository are made solely for identification, interoperability and descriptive purposes and do not imply endorsement or partnership.

### 👤 User responsibility

Each user is solely responsible for how the software is configured, deployed and used and for determining whether a particular use is lawful and permitted.

Users are responsible for complying with applicable laws, platform terms, developer policies and technical restrictions; using only accounts, credentials, systems, content and data they own or are expressly authorized to access; obtaining any required permissions or consents; protecting credentials and personal data; and reviewing generated content and automated actions before use where appropriate.

**The presence of a capability in this repository does not mean that a third-party platform permits that capability, that it is suitable for a particular use, or that it is lawful in every jurisdiction.**

### ⚠️ Platform and account risk

Third-party platforms may change APIs, interfaces, authentication flows, policies, rate limits, security mechanisms or enforcement practices at any time.

The author and contributors do not guarantee that any integration will continue to function, that an action will be accepted by a third-party platform, that an account will avoid warnings or restrictions, or that browser-based workflows will remain compatible with external services.

Use of the software and interaction with third-party platforms are undertaken **at the user's own risk**.

### 🧠 AI-generated content

AI-generated or AI-assisted output may be incomplete, inaccurate, repetitive, inappropriate or otherwise unsuitable for a specific context.

The project author and contributors do not review or approve user-created jobs or generated outputs. The user remains responsible for reviewing and deciding whether any generated content should be used.

### 🌐 Third-party services

Availability, pricing, policies, data handling, behavior and security of external platforms, APIs, cloud providers, proxy services and other dependencies are outside the control of this project.

The author and contributors are not responsible for outages, policy changes, service changes, account actions, billing, losses or other consequences attributable to third-party products or services.

### 🛡️ No warranty

**TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, THE SOFTWARE IS PROVIDED “AS IS” AND “AS AVAILABLE”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.**

No warranty or representation is made regarding reliability, availability, security, accuracy, fitness for a particular purpose, merchantability, non-infringement, uninterrupted operation, compatibility with third-party services or results obtained from use of the software.

### ⚖️ Limitation of liability

**TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, THE AUTHOR, COPYRIGHT HOLDERS AND CONTRIBUTORS SHALL NOT BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE OR CONSEQUENTIAL LOSS OR DAMAGE ARISING FROM OR RELATED TO THE SOFTWARE OR ITS USE, MISUSE OR INABILITY TO USE.**

This includes, without limitation, loss of data, credentials, accounts, access, revenue, profits, business opportunities or goodwill; service interruption; account restrictions or termination; third-party claims; security incidents; and costs associated with restoring, replacing or correcting systems or data.

Nothing in this notice excludes or limits liability where such exclusion or limitation is prohibited by applicable law.

Instara Crew is distributed under the **GNU General Public License v3.0 or later**. The complete license terms are contained in [`LICENSE`](LICENSE). If anything in this README conflicts with the applicable license, **the license text controls**.

### 🧑‍⚖️ Not legal advice

This repository and its documentation provide general project information only and do not constitute legal advice. Laws and contractual obligations vary by jurisdiction and use case. Users remain responsible for obtaining professional advice where appropriate.

---

## 👨‍💻 Author

Created and maintained by **[LUC4N3X](https://github.com/LUC4N3X)**.

If Instara Crew is useful to you, consider giving the repository a ⭐.

<div align="center">

<br />

**Instara Crew** · One workspace. Multiple accounts. Full control.

</div>