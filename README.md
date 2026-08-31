<p align="center">
  <img src="public/logo.png" width="220" alt="Instara Crew Logo" style="border-radius: 24px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />
</p>

<h1 align="center">Instara Crew</h1>

<p align="center">
  <b>Dual-Engine Instagram Operations Console</b><br>
  Gemini Multimodal AI · Meta Graph API OAuth 2.0 (100% Policy Compliant) · Playwright Mobile Stealth & Per-Account Proxies
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15+-black?style=flat&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Playwright-Stealth%20%26%20Mobile-green?style=flat&logo=playwright" alt="Playwright" />
  <img src="https://img.shields.io/badge/Meta_Graph_API-OAuth_2.0-blue?style=flat&logo=instagram" alt="Meta Graph API" />
  <img src="https://img.shields.io/badge/Gemini-Vertex_AI-purple?style=flat&logo=google" alt="Gemini AI" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-blue?style=flat&logo=typescript" alt="TypeScript" />
</p>

---

## 🚀 Architettura Dual-Engine

Instara Crew combina due motori operativi complementari per soddisfare qualsiasi esigenza di automazione:

### 💎 Engine B: Meta Graph API Ufficiale (Zero Rischio & 100% a Norma)
- **Login Ufficiale Instagram / Meta OAuth 2.0**: connessione autorizzata per account Business e Creator.
- **Token a Lunga Durata (60 Giorni)**: cifrati a riposo nel database con crittografia `AES-256-GCM`.
- **Zero rischio di blocco**: chiamate REST ufficiali a `graph.instagram.com`.
- **Operazioni**: lettura owned media, moderazione e risposte ufficiali ai commenti, pubblicazione diretta di immagini e Reel.

### 📱 Engine A: Stealth Browser, Proxy Dedicati & Mobile Touch
- **Proxy Dedicato per Account**: supporto HTTP, HTTPS, SOCKS5 e formato provider `ip:port:user:pass` con test di latenza in tempo reale.
- **Emulazione Mobile ad Alta Fedeltà**: preset realistici per **Google Pixel 7 (Android 14)**, **Samsung Galaxy S24** e **iPhone 15 Pro** con viewport, DPR, multi-touch (`maxTouchPoints: 5`) e Client Hints.
- **Protezione Anti-Detection & WebRTC Leak**: isolamento Chromium con `--force-webrtc-ip-handling-policy=disable_non_proxied_udp` e reset di `navigator.webdriver`.
- **Pacing Umano & Anti-Spam**: commenti unici generati da Gemini per ogni account, pause casuali (`minDelaySec`-`maxDelaySec`), cooldown e orari attivi.

---

## 📋 Requisiti di Sistema

- **Node.js**: 20+ LTS
- **Docker Desktop**: per PostgreSQL e Redis
- **Google Cloud CLI**: per Gemini su Vertex AI (nessuna API key esposta)
- **Meta Developer App** *(opzionale per Engine B)*: con prodotto *Instagram Graph API* e *Instagram Login*

---

## 🛠️ Avvio Rapido

### 1. Clona e installa le dipendenze
```bash
git clone https://github.com/LUC4N3X/Instara-Crew.git
cd Instara-Crew
npm install
npx playwright install chromium
```

### 2. Avvia i servizi database & cache
```bash
docker compose up -d
```

### 3. Configura le variabili d'ambiente
```bash
cp .env.example .env
```

Genera una chiave crittografica per la cifratura dei token a riposo:
```powershell
$key = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($key)
[Convert]::ToBase64String($key)
```
Incolla la stringa generata in `SESSION_ENCRYPTION_KEY_BASE64` nel file `.env`.

### 4. Autenticazione Google Cloud (Gemini Multimodale)
```bash
gcloud auth login
gcloud auth application-default login
gcloud config set project IL_TUO_PROJECT_ID
gcloud services enable aiplatform.googleapis.com
```

### 5. Setup Database e Avvio Console
```bash
npm run prisma:generate
npm run prisma:migrate
npm run dev:all
```

Apri la dashboard su **http://localhost:3000** 🚀

---

## 🧪 Suite di Test e Verifica

Il progetto include guardrail di sicurezza e simulatore end-to-end senza toccare account reali:

```bash
npm run test
```

- `typecheck` — Verifica tipi TypeScript rigorosi (0 errori).
- `test:guardrails` — Invarianti di sicurezza (blocco domini non-Instagram, rate limit, dry-run).
- `test:selftest` — Test E2E completo:
  - Validazione e parsing proxy multi-formato (HTTP/SOCKS5/colon).
  - Risoluzione preset mobile e fingerprinting stealth in Playwright.
  - Crittografia `AES-256-GCM` dei token OAuth Meta.
  - Simulazione pubblicazione e gestione layout responsive mobile/desktop.

---

## 🛡️ Best Practice di Sicurezza
- Inizia sempre con **Dry-run attivo** per validare selettori e layout.
- Per Engine A, utilizza sempre **Proxy Residenziali o Mobile 4G/5G** statici (1 account = 1 proxy dedicato).
- Rispetta il riscaldamento dell'account (*warm-up*): max 3-5 commenti/giorno la prima settimana, max 10-15 a regime.
- Per account aziendali/creator del proprio brand, utilizza **Engine B (Meta OAuth)** per totale conformità e zero rischio di blocco.

---

## 📄 Licenza
Rilasciato sotto licenza MIT.
