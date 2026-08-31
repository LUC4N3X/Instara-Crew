"use client";

import { useEffect, useState } from "react";

type Account = {
  id: string;
  username: string;
  label?: string | null;
  profileKey: string;
  status: string;
  authType: string; // "BROWSER_SESSION" | "META_OAUTH"
  igUserId?: string | null;
  tokenExpiresAt?: string | null;
  accountType?: string | null;
  proxyUrl?: string | null;
  devicePreset: string;
  customUserAgent?: string | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  deviceScaleFactor?: number | null;
  isMobile: boolean;
  hasTouch: boolean;
  minDelaySec: number;
  maxDelaySec: number;
  cooldownSec: number;
  maxPerRun: number;
};

type Item = {
  id: string;
  position: number;
  commentText: string;
  status: string;
  attempts: number;
  lastError?: string | null;
  account?: Account | null;
};

type JobLog = {
  id: string;
  level: string;
  message: string;
  createdAt: string;
};

type Job = {
  id: string;
  clientName: string;
  targetUrl: string;
  quantity: number;
  tone: string;
  status: string;
  dryRun: boolean;
  items: Item[];
  logs: JobLog[];
};

const DEVICE_LABELS: Record<string, string> = {
  PIXEL_7: "📱 Pixel 7 (Android)",
  GALAXY_S24: "📱 Galaxy S24 (Android)",
  IPHONE_15_PRO: "📱 iPhone 15 Pro (iOS)",
  DESKTOP: "💻 Desktop Chrome",
  CUSTOM: "⚙ Custom",
};

export default function Home() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [burst, setBurst] = useState(false);
  const [expandedAccountId, setExpandedAccountId] = useState<string | null>(null);
  const [accountFilter, setAccountFilter] = useState<"ALL" | "META" | "BROWSER">("ALL");

  // Meta OAuth configuration status
  const [metaStatus, setMetaStatus] = useState<{
    isConfigured: boolean;
    appId?: string | null;
    redirectUri: string;
  } | null>(null);
  const [metaBanner, setMetaBanner] = useState<{ text: string; ok: boolean } | null>(null);
  const [metaActionMsg, setMetaActionMsg] = useState<Record<string, { loading?: boolean; text?: string; ok?: boolean }>>({});

  // Engine A: New account form proxy test state
  const [newProxyUrl, setNewProxyUrl] = useState("");
  const [newProxyStatus, setNewProxyStatus] = useState<{ loading?: boolean; text?: string; ok?: boolean } | null>(null);

  // Engine A: Per-account edit proxy test state
  const [proxyTestMap, setProxyTestMap] = useState<
    Record<string, { loading?: boolean; text?: string; ok?: boolean }>
  >({});

  const selected = jobs.find((j) => j.id === selectedId) ?? null;

  async function refresh() {
    const [a, j, m] = await Promise.all([
      fetch("/api/accounts").then((r) => r.json()),
      fetch("/api/jobs").then((r) => r.json()),
      fetch("/api/auth/meta/status").then((r) => r.json()).catch(() => null),
    ]);
    setAccounts(a);
    setJobs(j);
    if (m) setMetaStatus(m);
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 3000);

    // Check for Meta OAuth query params
    const params = new URLSearchParams(window.location.search);
    if (params.get("meta_connected")) {
      setMetaBanner({
        text: `🎉 Account Meta @${params.get("meta_connected")} connesso con successo via OAuth ufficiale (60 giorni)!`,
        ok: true,
      });
      window.history.replaceState({}, "", "/");
    } else if (params.get("meta_error")) {
      setMetaBanner({
        text: `❌ Errore connessione Meta: ${params.get("meta_error")}`,
        ok: false,
      });
      window.history.replaceState({}, "", "/");
    }

    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const job = jobs.find((j) => j.id === selectedId);
    if (job) setDryRun(job.dryRun);
  }, [selectedId]);

  const activeAccounts = accounts.filter((x) => x.status === "ACTIVE").length;
  const metaAccounts = accounts.filter((x) => x.authType === "META_OAUTH");
  const browserAccounts = accounts.filter((x) => x.authType !== "META_OAUTH");
  const readyJobs = jobs.filter((x) => x.status === "READY").length;
  const completedJobs = jobs.filter((x) => x.status === "COMPLETED").length;

  const displayedAccounts =
    accountFilter === "META"
      ? metaAccounts
      : accountFilter === "BROWSER"
        ? browserAccounts
        : accounts;

  async function call(url: string, body?: unknown) {
    const r = await fetch(url, {
      method: "POST",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(payload.error || `Errore ${r.status}`);
    return payload;
  }

  async function testProxyString(
    proxyUrl: string,
    onResult: (res: { loading?: boolean; text?: string; ok?: boolean }) => void
  ) {
    if (!proxyUrl || !proxyUrl.trim()) {
      onResult({ text: "Inserisci prima una stringa proxy.", ok: false });
      return;
    }
    onResult({ loading: true, text: "Verifica proxy in corso…" });
    try {
      const res = await fetch("/api/accounts/test-proxy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ proxyUrl }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onResult({ text: `✅ Connesso! IP: ${data.ip} (${data.latencyMs}ms)`, ok: true });
      } else {
        onResult({ text: `❌ ${data.error || "Connessione fallita"}`, ok: false });
      }
    } catch (e) {
      onResult({ text: `❌ ${e instanceof Error ? e.message : "Errore di rete"}`, ok: false });
    }
  }

  async function addAccount(form: HTMLFormElement) {
    const data = Object.fromEntries(new FormData(form).entries());
    setBusy(true);
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Errore creazione account");
      form.reset();
      setNewProxyUrl("");
      setNewProxyStatus(null);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Errore creazione account");
    } finally {
      setBusy(false);
    }
  }

  async function openLogin(id: string) {
    setBusy(true);
    try {
      await call(`/api/accounts/${id}/login`);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Errore apertura login");
    } finally {
      setBusy(false);
    }
  }

  async function saveAccount(id: string, patch: Record<string, unknown>) {
    setBusy(true);
    try {
      const r = await fetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(payload.error || "Errore salvataggio");
      await refresh();
      setExpandedAccountId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(id: string) {
    if (!confirm("Sei sicuro di voler rimuovere questo account?")) return;
    setBusy(true);
    try {
      await fetch(`/api/accounts/${id}`, { method: "DELETE" });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  async function closeBrowser(id: string) {
    try {
      await call(`/api/accounts/${id}/close`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Errore");
    }
  }

  async function runMetaAction(id: string, action: "test_connection" | "refresh_token") {
    setMetaActionMsg((prev) => ({ ...prev, [id]: { loading: true, text: "Esecuzione…" } }));
    try {
      const res = await fetch(`/api/accounts/${id}/meta-action`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const msg =
          action === "test_connection"
            ? `✅ Connessione Meta OK (@${data.data?.username} · ${data.data?.accountType || "Business"})`
            : data.message || "Token rinnovato!";
        setMetaActionMsg((prev) => ({ ...prev, [id]: { text: msg, ok: true } }));
        await refresh();
      } else {
        setMetaActionMsg((prev) => ({
          ...prev,
          [id]: { text: `❌ ${data.error || "Errore Meta API"}`, ok: false },
        }));
      }
    } catch (e) {
      setMetaActionMsg((prev) => ({
        ...prev,
        [id]: { text: `❌ ${e instanceof Error ? e.message : "Errore"}`, ok: false },
      }));
    }
  }

  async function createJob(form: HTMLFormElement) {
    const fd = new FormData(form);
    setBusy(true);
    try {
      const r = await fetch("/api/jobs", { method: "POST", body: fd });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "Errore");
      form.reset();
      await refresh();
      setSelectedId(body.id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  async function publishAll() {
    if (!selected) return;
    if (
      !dryRun &&
      !confirm(
        `Pubblicazione REALE su Instagram: ${selected.items.length} commenti dagli account assegnati. Procedere?`
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const res = await call(`/api/jobs/${selected.id}/publish`, { dryRun, burst });
      alert(`In coda: ${res.queued} commenti (${res.dryRun ? "DRY-RUN" : "LIVE"}).`);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  async function control(action: "pause" | "resume" | "cancel") {
    if (!selected) return;
    try {
      await call(`/api/jobs/${selected.id}/control`, { action });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Errore");
    }
  }

  async function publishItem(item: Item) {
    setBusy(true);
    try {
      const res = await call(`/api/items/${item.id}/publish`, { dryRun });
      if (!res.ok) alert(res.message || "Pubblicazione non verificata.");
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Errore");
    } finally {
      setBusy(false);
    }
  }

  async function openItem(item: Item) {
    await navigator.clipboard.writeText(item.commentText);
    try {
      await call(`/api/items/${item.id}/open`);
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Errore");
    }
  }

  async function completeItem(item: Item) {
    await call(`/api/items/${item.id}/complete`).catch(() => undefined);
    await refresh();
  }

  const running = selected?.status === "RUNNING";

  return (
    <div className="shell">
      <aside>
        <div className="brand">
          <img src="/logo.png" alt="Instara Crew" className="logoImg" />
          <div>
            <b>Instara Crew</b>
            <small>Operations Console</small>
          </div>
        </div>
        <button className="nav active">◈ Dashboard</button>
        <button className="nav">💎 Meta OAuth (Zero Rischio)</button>
        <button className="nav">📱 Stealth Browser & Proxy</button>
        <button className="nav">✦ Gemini Composer</button>
        <button className="nav">▣ Jobs</button>
        <button className="nav">⌁ Logs</button>
        <div className="notice" style={{ marginTop: 24 }}>
          <b>Architettura Ibrida:</b>
          <br />
          • <b>Engine B (Meta OAuth)</b>: 100% conforme alle policy, zero rischio di blocco.
          <br />
          • <b>Engine A (Browser & Proxy)</b>: multi-account con proxy dedicati e mobile touch emulation.
        </div>
      </aside>

      <main>
        <div className="top">
          <div>
            <div className="eyebrow">Dual-Engine Instagram Automation</div>
            <h1>Instara Crew</h1>
            <div className="muted">
              Engine A (Stealth Mobile & Proxy) + Engine B (Ufficiale Meta Graph API OAuth) + Gemini.
            </div>
          </div>
          <div className="actions">
            <span className="btn ai">✦ Vertex AI · ADC</span>
          </div>
        </div>

        {metaBanner && (
          <div
            className={`metaBanner ${metaBanner.ok ? "" : "err"}`}
            style={{
              marginTop: 16,
              borderColor: metaBanner.ok ? "#0891b2" : "#be123c",
              background: metaBanner.ok
                ? "linear-gradient(135deg,rgba(2,132,199,.15),rgba(6,182,212,.10))"
                : "rgba(244,63,94,.15)",
            }}
          >
            <div className="metaBannerTop">
              <b style={{ color: metaBanner.ok ? "#67e8f9" : "#fda4af" }}>{metaBanner.text}</b>
              <button
                className="btn small"
                style={{ padding: "2px 8px" }}
                onClick={() => setMetaBanner(null)}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="stats">
          <div className="stat">
            <label>ACCOUNT ATTIVI</label>
            <strong>{activeAccounts}</strong>
          </div>
          <div className="stat">
            <label>META UFFICIALI</label>
            <strong style={{ color: "#67e8f9" }}>{metaAccounts.length}</strong>
          </div>
          <div className="stat">
            <label>STEALTH & PROXY</label>
            <strong style={{ color: "#d8b4fe" }}>{browserAccounts.length}</strong>
          </div>
          <div className="stat">
            <label>JOB TOTALI</label>
            <strong>{jobs.length}</strong>
          </div>
        </div>

        <div className="grid">
          <div style={{ display: "grid", gap: 16 }}>
            <section className="card">
              <div className="head">
                <h2>Nuovo job da foto</h2>
                <span className="pill">Gemini</span>
              </div>
              <div className="body">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createJob(e.currentTarget);
                  }}
                >
                  <div className="formGrid">
                    <div>
                      <label>Cliente</label>
                      <input name="clientName" required />
                    </div>
                    <div>
                      <label>Quantità</label>
                      <input
                        name="quantity"
                        type="number"
                        min="1"
                        max="100"
                        defaultValue="10"
                        required
                      />
                    </div>
                    <div className="full">
                      <label>URL post Instagram</label>
                      <input
                        name="targetUrl"
                        type="url"
                        placeholder="https://www.instagram.com/p/..."
                        required
                      />
                    </div>
                    <div>
                      <label>Tono</label>
                      <select name="tone" defaultValue="naturale">
                        <option value="naturale">Naturale</option>
                        <option value="informale">Informale</option>
                        <option value="entusiasta">Entusiasta</option>
                        <option value="elegante">Elegante</option>
                        <option value="minimal">Minimal</option>
                      </select>
                    </div>
                    <div>
                      <label>Foto / screenshot</label>
                      <input name="image" type="file" accept="image/*" required />
                    </div>
                    <div className="full">
                      <label>Contesto facoltativo</label>
                      <textarea name="context" rows={3} />
                    </div>
                  </div>
                  <div className="notice" style={{ marginTop: 11 }}>
                    Gemini genera commenti unici e differenziati per ogni account collegato.
                  </div>
                  <button className="btn primary" disabled={busy} style={{ marginTop: 11 }}>
                    {busy ? "Elaborazione…" : "✦ Genera job"}
                  </button>
                </form>
              </div>
            </section>

            <section className="card">
              <div className="head">
                <h2>Jobs</h2>
                <span className="muted">{jobs.length}</span>
              </div>
              <div className="body">
                <div className="list">
                  {jobs.length === 0 && <div className="empty">Nessun job.</div>}
                  {jobs.map((j) => (
                    <button
                      key={j.id}
                      className="row"
                      style={{ textAlign: "left", color: "inherit", cursor: "pointer" }}
                      onClick={() => setSelectedId(j.id)}
                    >
                      <div className="avatar">{j.clientName.slice(0, 1).toUpperCase()}</div>
                      <div className="grow">
                        <b>{j.clientName}</b>
                        <small>{j.targetUrl}</small>
                      </div>
                      <span className="pill">{j.status}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <section className="card">
            <div className="head">
              <h2>Gestione Account Instagram</h2>
              <span className="muted">{accounts.length}</span>
            </div>
            <div className="body">
              {/* Engine B: Meta OAuth Box */}
              <div className="metaBanner">
                <div className="metaBannerTop">
                  <b>💎 Engine B: Meta Graph API (Ufficiale & Zero Blocco)</b>
                  <span className="badge meta">100% Policy Compliant</span>
                </div>
                <p>
                  Collega account Creator/Business direttamente tramite OAuth ufficiale Meta. Nessuna
                  password memorizzata, token sicuro valido 60 giorni e zero rischio di blocco.
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <a
                    href="/api/auth/meta/start"
                    className="btn meta small"
                    style={{ textDecoration: "none" }}
                  >
                    🔗 Connetti Account Ufficiale Meta
                  </a>
                  {!metaStatus?.isConfigured && (
                    <button
                      className="btn small"
                      onClick={() =>
                        alert(
                          `Per abilitare Meta OAuth:\n1. Crea un'app su developers.facebook.com\n2. Inserisci META_APP_ID e META_APP_SECRET nel file .env\n3. Imposta come Redirect URI:\n${metaStatus?.redirectUri || "http://localhost:3000/api/auth/meta/callback"}`
                        )
                      }
                    >
                      ℹ Guida Setup .env
                    </button>
                  )}
                </div>
              </div>

              {/* Engine Tabs Filter */}
              <div className="engineTabs">
                <button
                  className={`engineTab ${accountFilter === "ALL" ? "active" : ""}`}
                  onClick={() => setAccountFilter("ALL")}
                >
                  Tutti ({accounts.length})
                </button>
                <button
                  className={`engineTab ${accountFilter === "META" ? "active" : ""}`}
                  onClick={() => setAccountFilter("META")}
                >
                  💎 Meta OAuth ({metaAccounts.length})
                </button>
                <button
                  className={`engineTab ${accountFilter === "BROWSER" ? "active" : ""}`}
                  onClick={() => setAccountFilter("BROWSER")}
                >
                  📱 Stealth & Proxy ({browserAccounts.length})
                </button>
              </div>

              {/* Engine A: Add Browser / Proxy Account */}
              {(accountFilter === "ALL" || accountFilter === "BROWSER") && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addAccount(e.currentTarget);
                  }}
                  style={{
                    background: "#0e141f",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #1c2637",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#d8b4fe", marginBottom: 6 }}>
                    + Aggiungi Account (Engine A: Stealth Browser & Proxy)
                  </div>
                  <div className="formGrid">
                    <div>
                      <label>Username</label>
                      <input name="username" placeholder="profilo_01" required />
                    </div>
                    <div>
                      <label>Etichetta</label>
                      <input name="label" placeholder="Cliente A" />
                    </div>
                    <div className="full">
                      <label>Proxy dedicato (opzionale)</label>
                      <div className="proxyTestBox">
                        <input
                          name="proxyUrl"
                          placeholder="http://user:pass@host:port oppure host:port:user:pass"
                          value={newProxyUrl}
                          onChange={(e) => {
                            setNewProxyUrl(e.target.value);
                            setNewProxyStatus(null);
                          }}
                        />
                        <button
                          type="button"
                          className="btn small"
                          disabled={!newProxyUrl || newProxyStatus?.loading}
                          onClick={() => testProxyString(newProxyUrl, setNewProxyStatus)}
                        >
                          {newProxyStatus?.loading ? "Test…" : "Test"}
                        </button>
                      </div>
                      {newProxyStatus?.text && (
                        <span className={`proxyStatusText ${newProxyStatus.ok ? "ok" : "err"}`}>
                          {newProxyStatus.text}
                        </span>
                      )}
                    </div>
                    <div className="full">
                      <label>Emulazione Dispositivo</label>
                      <select name="devicePreset" defaultValue="PIXEL_7">
                        <option value="PIXEL_7">📱 Google Pixel 7 (Android 14) - Consigliato</option>
                        <option value="GALAXY_S24">📱 Samsung Galaxy S24 (Android 14)</option>
                        <option value="IPHONE_15_PRO">📱 Apple iPhone 15 Pro (iOS 17.5)</option>
                        <option value="DESKTOP">💻 Desktop Chrome (Windows 11)</option>
                      </select>
                    </div>
                  </div>
                  <button className="btn" style={{ marginTop: 10, width: "100%" }}>
                    + Salva Account Browser
                  </button>
                </form>
              )}

              {/* Accounts List */}
              <div className="list">
                {displayedAccounts.length === 0 && (
                  <div className="empty">Nessun account in questa categoria.</div>
                )}
                {displayedAccounts.map((a) => {
                  const isMeta = a.authType === "META_OAUTH";
                  const isExpanded = expandedAccountId === a.id;
                  const proxyStatus = proxyTestMap[a.id];
                  const metaAct = metaActionMsg[a.id];

                  const daysUntilExpiry = a.tokenExpiresAt
                    ? Math.max(
                        0,
                        Math.round(
                          (new Date(a.tokenExpiresAt).getTime() - Date.now()) /
                            (1000 * 60 * 60 * 24)
                        )
                      )
                    : null;

                  return (
                    <div
                      className={`accountCard ${isMeta ? "metaOfficial" : ""}`}
                      key={a.id}
                    >
                      <div
                        className="row"
                        style={{ padding: 0, border: 0, background: "transparent" }}
                      >
                        <div className={`avatar ${isMeta ? "meta" : ""}`}>
                          {isMeta ? "💎" : a.username.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="grow">
                          <b>@{a.username}</b>
                          <div className="accountMeta">
                            <span className="pill">{a.status}</span>
                            {isMeta ? (
                              <span className="badge meta">
                                💎 Meta OAuth Ufficiale (Zero Rischio)
                              </span>
                            ) : (
                              <>
                                <span className="badge device">
                                  {DEVICE_LABELS[a.devicePreset] || a.devicePreset}
                                </span>
                                {a.proxyUrl ? (
                                  <span className="badge proxy" title={a.proxyUrl}>
                                    🔒 Proxy
                                  </span>
                                ) : (
                                  <span className="badge direct">🌐 Diretto</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 5 }}>
                          {isMeta ? (
                            <>
                              <button
                                className="btn small meta"
                                disabled={metaAct?.loading}
                                onClick={() => runMetaAction(a.id, "test_connection")}
                              >
                                {metaAct?.loading ? "Verifica…" : "Test API"}
                              </button>
                              <button
                                className="btn small"
                                onClick={() => runMetaAction(a.id, "refresh_token")}
                              >
                                Rinnova
                              </button>
                              <button
                                className="btn small danger"
                                onClick={() => deleteAccount(a.id)}
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn small"
                                disabled={busy}
                                onClick={() => openLogin(a.id)}
                              >
                                {a.status === "ACTIVE" ? "Apri" : "Login"}
                              </button>
                              <button
                                className="btn small"
                                onClick={() => closeBrowser(a.id)}
                              >
                                Chiudi
                              </button>
                              <button
                                className="btn small"
                                onClick={() =>
                                  setExpandedAccountId(isExpanded ? null : a.id)
                                }
                              >
                                {isExpanded ? "▲" : "⚙"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {isMeta && daysUntilExpiry !== null && (
                        <div
                          style={{
                            fontSize: 11,
                            color: "#94a3b8",
                            display: "flex",
                            justifyContent: "space-between",
                            marginTop: 4,
                          }}
                        >
                          <span>Tipo: {a.accountType || "Business/Creator"}</span>
                          <span style={{ color: daysUntilExpiry < 7 ? "#fda4af" : "#67e8f9" }}>
                            Token valido per {daysUntilExpiry} giorni
                          </span>
                        </div>
                      )}

                      {isMeta && metaAct?.text && (
                        <span className={`proxyStatusText ${metaAct.ok ? "ok" : "err"}`}>
                          {metaAct.text}
                        </span>
                      )}

                      {/* Engine A: Expanded Tuning Form */}
                      {!isMeta && isExpanded && (
                        <form
                          className="tuningDetails"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            saveAccount(a.id, {
                              label: fd.get("label") ? String(fd.get("label")) : null,
                              proxyUrl: fd.get("proxyUrl")
                                ? String(fd.get("proxyUrl")).trim()
                                : null,
                              devicePreset: String(fd.get("devicePreset")),
                              minDelaySec: Number(fd.get("minDelaySec")),
                              maxDelaySec: Number(fd.get("maxDelaySec")),
                              cooldownSec: Number(fd.get("cooldownSec")),
                              maxPerRun: Number(fd.get("maxPerRun")),
                            });
                          }}
                        >
                          <div className="tuningRow">
                            <div>
                              <label>Etichetta</label>
                              <input
                                name="label"
                                defaultValue={a.label || ""}
                                placeholder="Cliente A"
                              />
                            </div>
                            <div>
                              <label>Dispositivo</label>
                              <select
                                name="devicePreset"
                                defaultValue={a.devicePreset || "PIXEL_7"}
                              >
                                <option value="PIXEL_7">📱 Pixel 7 (Android)</option>
                                <option value="GALAXY_S24">📱 Galaxy S24 (Android)</option>
                                <option value="IPHONE_15_PRO">📱 iPhone 15 Pro (iOS)</option>
                                <option value="DESKTOP">💻 Desktop Chrome</option>
                              </select>
                            </div>
                          </div>

                          <div>
                            <label>Proxy Dedicato (HTTP / SOCKS5)</label>
                            <div className="proxyTestBox">
                              <input
                                name="proxyUrl"
                                id={`proxy-input-${a.id}`}
                                defaultValue={a.proxyUrl || ""}
                                placeholder="http://user:pass@host:port o host:port:user:pass"
                              />
                              <button
                                type="button"
                                className="btn small"
                                disabled={proxyStatus?.loading}
                                onClick={() => {
                                  const el = document.getElementById(
                                    `proxy-input-${a.id}`
                                  ) as HTMLInputElement;
                                  testProxyString(el?.value || "", (res) =>
                                    setProxyTestMap((prev) => ({ ...prev, [a.id]: res }))
                                  );
                                }}
                              >
                                {proxyStatus?.loading ? "Test…" : "Test"}
                              </button>
                            </div>
                            {proxyStatus?.text && (
                              <span
                                className={`proxyStatusText ${proxyStatus.ok ? "ok" : "err"}`}
                              >
                                {proxyStatus.text}
                              </span>
                            )}
                          </div>

                          <div className="tuningTiming">
                            <label>
                              Pausa min (s)
                              <input
                                name="minDelaySec"
                                type="number"
                                min="0"
                                defaultValue={a.minDelaySec}
                              />
                            </label>
                            <label>
                              Max (s)
                              <input
                                name="maxDelaySec"
                                type="number"
                                min="0"
                                defaultValue={a.maxDelaySec}
                              />
                            </label>
                            <label>
                              Cooldown (s)
                              <input
                                name="cooldownSec"
                                type="number"
                                min="0"
                                defaultValue={a.cooldownSec}
                              />
                            </label>
                            <label>
                              Max/run
                              <input
                                name="maxPerRun"
                                type="number"
                                min="0"
                                defaultValue={a.maxPerRun}
                              />
                            </label>
                            <button
                              className="btn small primary"
                              style={{ marginLeft: "auto" }}
                            >
                              Salva
                            </button>
                            <button
                              type="button"
                              className="btn small danger"
                              onClick={() => deleteAccount(a.id)}
                            >
                              Elimina
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {selected && (
          <section className="card work">
            <div className="head">
              <div>
                <h2>{selected.clientName}</h2>
                <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                  {selected.targetUrl}
                </div>
              </div>
              <span className="pill">{selected.status}</span>
            </div>
            <div className="body">
              <div className="runbar">
                <label>
                  <input
                    type="checkbox"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                  />
                  Dry-run (digita, non invia)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={burst}
                    onChange={(e) => setBurst(e.target.checked)}
                  />
                  Burst (tutti insieme, zero pause)
                </label>
                <span className={dryRun ? "badge dry" : "badge live"}>
                  {dryRun ? "DRY-RUN" : "LIVE"}
                </span>
                <button
                  className="btn primary"
                  disabled={busy || running}
                  onClick={publishAll}
                >
                  {running ? "In esecuzione…" : "▶ Pubblica tutti"}
                </button>
                <button
                  className="btn"
                  disabled={!running}
                  onClick={() => control("pause")}
                >
                  ⏸ Pausa
                </button>
                <button className="btn" onClick={() => control("resume")}>
                  ↻ Riprendi
                </button>
                <button className="btn danger" onClick={() => control("cancel")}>
                  ✕ Annulla
                </button>
              </div>

              {selected.items.length === 0 ? (
                <div className="empty">Il worker sta preparando il job…</div>
              ) : (
                selected.items.map((item) => (
                  <div className="task" key={item.id}>
                    <div className="avatar">{item.position + 1}</div>
                    <div>
                      <b style={{ fontSize: 12 }}>
                        {item.account ? `@${item.account.username}` : "Non assegnato"}
                      </b>
                      <div className="accountMeta" style={{ marginTop: 2 }}>
                        <span className="muted" style={{ fontSize: 10 }}>
                          {item.status}
                          {item.attempts ? ` · ${item.attempts} tent.` : ""}
                        </span>
                        {item.account?.authType === "META_OAUTH" ? (
                          <span className="badge meta" style={{ fontSize: 9, padding: "1px 5px" }}>
                            💎 Meta
                          </span>
                        ) : item.account?.devicePreset ? (
                          <span className="badge device" style={{ fontSize: 9, padding: "1px 5px" }}>
                            {DEVICE_LABELS[item.account.devicePreset] || item.account.devicePreset}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="comment">
                      {item.commentText}
                      {item.lastError && <div className="itemError">{item.lastError}</div>}
                    </div>
                    <div className="actions">
                      <button
                        className="btn small"
                        onClick={() => navigator.clipboard.writeText(item.commentText)}
                      >
                        Copia
                      </button>
                      <button className="btn small ai" onClick={() => openItem(item)}>
                        Apri
                      </button>
                      <button
                        className="btn small primary"
                        disabled={busy}
                        onClick={() => publishItem(item)}
                      >
                        Pubblica
                      </button>
                      <button className="btn small" onClick={() => completeItem(item)}>
                        Fatto
                      </button>
                    </div>
                  </div>
                ))
              )}

              <div className="logs">
                {selected.logs?.length ? (
                  selected.logs.map((l) => (
                    <div className={`line ${l.level}`} key={l.id}>
                      <span>{new Date(l.createdAt).toLocaleTimeString("it-IT")}</span>
                      <span>{l.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="muted">Nessun log.</div>
                )}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
