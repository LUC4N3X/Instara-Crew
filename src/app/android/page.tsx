"use client";

import { useEffect, useMemo, useState } from "react";

type Account = {
  id: string;
  username: string;
  label?: string | null;
  status: string;
  authType: string;
  executionEngine?: string | null;
  adbSerial?: string | null;
  androidPackage?: string | null;
  minDelaySec: number;
  maxDelaySec: number;
  cooldownSec: number;
  maxPerRun: number;
};

type Device = {
  serial: string;
  state: string;
  model?: string;
  product?: string;
  device?: string;
  transportId?: string;
};

type Health = {
  serial: string;
  package: string;
  packageInstalled: boolean;
  currentPackage?: string | null;
  model?: string | null;
  sdk?: number | null;
  width?: number | null;
  height?: number | null;
};

type Notice = { ok: boolean; text: string };

const DEFAULT_PACKAGE = "com.instagram.android";

export default function AndroidRuntimePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceWarning, setDeviceWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [health, setHealth] = useState<Record<string, Health | undefined>>({});
  const [rowNotice, setRowNotice] = useState<Record<string, Notice | undefined>>({});

  const androidAccounts = useMemo(
    () => accounts.filter((account) => account.authType !== "META_OAUTH" && account.executionEngine === "ANDROID_ADB"),
    [accounts]
  );

  async function loadAccounts() {
    const response = await fetch("/api/accounts");
    if (!response.ok) throw new Error(`Account API: ${response.status}`);
    setAccounts(await response.json());
  }

  async function loadDevices() {
    const response = await fetch("/api/android/devices", { cache: "no-store" });
    const payload = await response.json();
    setDevices(Array.isArray(payload.devices) ? payload.devices : []);
    setDeviceWarning(payload.warning || null);
  }

  async function refresh() {
    try {
      await Promise.all([loadAccounts(), loadDevices()]);
    } catch (error) {
      setNotice({ ok: false, text: error instanceof Error ? error.message : String(error) });
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function post(url: string, body?: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Errore ${response.status}`);
    return payload;
  }

  async function addAndroidAccount(form: HTMLFormElement) {
    const data = new FormData(form);
    const adbSerial = String(data.get("adbSerial") || "").trim();
    if (!adbSerial) {
      setNotice({ ok: false, text: "Seleziona prima un device/emulatore ADB." });
      return;
    }

    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: String(data.get("username") || ""),
          label: String(data.get("label") || "") || null,
          executionEngine: "ANDROID_ADB",
          adbSerial,
          androidPackage: String(data.get("androidPackage") || DEFAULT_PACKAGE),
          minDelaySec: Number(data.get("minDelaySec") || 20),
          maxDelaySec: Number(data.get("maxDelaySec") || 60),
          cooldownSec: Number(data.get("cooldownSec") || 120),
          maxPerRun: Number(data.get("maxPerRun") || 0),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Creazione account fallita.");
      form.reset();
      setNotice({ ok: true, text: `@${payload.username} associato al runtime Android ${adbSerial}.` });
      await loadAccounts();
    } catch (error) {
      setNotice({ ok: false, text: error instanceof Error ? error.message : String(error) });
    } finally {
      setBusy(false);
    }
  }

  async function saveBinding(account: Account, form: HTMLFormElement) {
    const data = new FormData(form);
    setBusy(true);
    try {
      const response = await fetch(`/api/accounts/${account.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          executionEngine: "ANDROID_ADB",
          adbSerial: String(data.get("adbSerial") || ""),
          androidPackage: String(data.get("androidPackage") || DEFAULT_PACKAGE),
          minDelaySec: Number(data.get("minDelaySec") || account.minDelaySec),
          maxDelaySec: Number(data.get("maxDelaySec") || account.maxDelaySec),
          cooldownSec: Number(data.get("cooldownSec") || account.cooldownSec),
          maxPerRun: Number(data.get("maxPerRun") || account.maxPerRun),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Salvataggio fallito.");
      setRowNotice((prev) => ({ ...prev, [account.id]: { ok: true, text: "Configurazione salvata." } }));
      await loadAccounts();
    } catch (error) {
      setRowNotice((prev) => ({ ...prev, [account.id]: { ok: false, text: error instanceof Error ? error.message : String(error) } }));
    } finally {
      setBusy(false);
    }
  }

  async function testAccount(account: Account) {
    setRowNotice((prev) => ({ ...prev, [account.id]: { ok: true, text: "Controllo device…" } }));
    try {
      const payload = await post(`/api/accounts/${account.id}/android-check`);
      setHealth((prev) => ({ ...prev, [account.id]: payload.health }));
      const info = payload.health as Health;
      setRowNotice((prev) => ({
        ...prev,
        [account.id]: {
          ok: Boolean(info.packageInstalled),
          text: info.packageInstalled
            ? `Device OK · ${info.model || info.serial} · Android SDK ${info.sdk ?? "?"}`
            : `${info.package} non installato sul device.`,
        },
      }));
    } catch (error) {
      setRowNotice((prev) => ({ ...prev, [account.id]: { ok: false, text: error instanceof Error ? error.message : String(error) } }));
    }
  }

  async function runtimeAction(account: Account, action: "open" | "stop") {
    setBusy(true);
    try {
      await post(`/api/accounts/${account.id}/${action === "open" ? "login" : "close"}`);
      setRowNotice((prev) => ({
        ...prev,
        [account.id]: { ok: true, text: action === "open" ? "Instagram aperto sul device." : "Instagram arrestato sul device." },
      }));
      await loadAccounts();
    } catch (error) {
      setRowNotice((prev) => ({ ...prev, [account.id]: { ok: false, text: error instanceof Error ? error.message : String(error) } }));
    } finally {
      setBusy(false);
    }
  }

  const usableDevices = devices.filter((device) => device.state === "device");

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto" }}>
      <div className="top">
        <div>
          <div className="eyebrow">Android App Runtime</div>
          <h1>Instara Crew · Android</h1>
          <div className="muted">Associa ogni account a un telefono o emulatore e usa l&apos;app Instagram reale via ADB + uiautomator2.</div>
        </div>
        <div className="actions">
          <a className="btn" href="/">← Dashboard</a>
          <button className="btn primary" onClick={refresh} disabled={busy}>↻ Rileva device</button>
        </div>
      </div>

      <div className="stats">
        <div className="stat"><label>DEVICE ADB</label><strong>{devices.length}</strong></div>
        <div className="stat"><label>ONLINE</label><strong>{usableDevices.length}</strong></div>
        <div className="stat"><label>ACCOUNT ANDROID</label><strong>{androidAccounts.length}</strong></div>
        <div className="stat"><label>BRIDGE</label><strong style={{ fontSize: 17 }}>{deviceWarning ? "CHECK" : "READY"}</strong></div>
      </div>

      {deviceWarning && <div className="notice" style={{ borderColor: "#7c2d12", color: "#fed7aa", marginBottom: 16 }}><b>ADB non disponibile:</b> {deviceWarning}</div>}
      {notice && <div className="notice" style={{ borderColor: notice.ok ? "#166534" : "#7f1d1d", color: notice.ok ? "#bbf7d0" : "#fecaca", marginBottom: 16 }}>{notice.text}</div>}

      <div className="grid" style={{ gridTemplateColumns: "0.8fr 1.2fr" }}>
        <section className="card">
          <div className="head"><h2>Nuovo account Android</h2><span className="badge device">ADB</span></div>
          <div className="body">
            <form onSubmit={(event) => { event.preventDefault(); addAndroidAccount(event.currentTarget); }}>
              <div className="formGrid">
                <div><label>Username</label><input name="username" required placeholder="profilo_01" /></div>
                <div><label>Etichetta</label><input name="label" placeholder="Cliente A" /></div>
                <div className="full">
                  <label>Device / emulatore ADB</label>
                  <select name="adbSerial" required defaultValue="">
                    <option value="" disabled>Seleziona device…</option>
                    {devices.map((device) => <option key={device.serial} value={device.serial} disabled={device.state !== "device"}>{device.serial} · {device.model || device.device || "Android"} · {device.state}</option>)}
                  </select>
                </div>
                <div className="full"><label>Instagram package</label><input name="androidPackage" defaultValue={DEFAULT_PACKAGE} /></div>
                <div><label>Pausa min (s)</label><input name="minDelaySec" type="number" min="0" defaultValue="20" /></div>
                <div><label>Pausa max (s)</label><input name="maxDelaySec" type="number" min="0" defaultValue="60" /></div>
                <div><label>Cooldown (s)</label><input name="cooldownSec" type="number" min="0" defaultValue="120" /></div>
                <div><label>Max / run</label><input name="maxPerRun" type="number" min="0" defaultValue="0" /></div>
              </div>
              <button className="btn primary" disabled={busy || usableDevices.length === 0} style={{ width: "100%", justifyContent: "center", marginTop: 12 }}>+ Aggiungi account Android</button>
            </form>
            <div className="notice" style={{ marginTop: 12 }}>Il login resta dentro l&apos;app Instagram sul device. Instara Crew non richiede né memorizza la password dell&apos;account per questo runtime.</div>
          </div>
        </section>

        <section className="card">
          <div className="head"><h2>Device rilevati</h2><span className="muted">adb devices -l</span></div>
          <div className="body">
            <div className="list">
              {devices.length === 0 && <div className="empty">Nessun device ADB rilevato.</div>}
              {devices.map((device) => (
                <div className="row" key={device.serial}>
                  <div className="avatar">📱</div><div className="grow"><b>{device.model || device.device || "Android device"}</b><small>{device.serial}</small></div>
                  <span className={`badge ${device.state === "device" ? "dry" : "live"}`}>{device.state}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="head"><h2>Account associati</h2><span className="muted">{androidAccounts.length}</span></div>
        <div className="body"><div className="list">
          {androidAccounts.length === 0 && <div className="empty">Nessun account usa ancora Android ADB.</div>}
          {androidAccounts.map((account) => {
            const currentHealth = health[account.id];
            const message = rowNotice[account.id];
            return (
              <form key={account.id} className="accountCard" onSubmit={(event) => { event.preventDefault(); saveBinding(account, event.currentTarget); }}>
                <div className="row" style={{ padding: 0, border: 0, background: "transparent" }}>
                  <div className="avatar">{account.username.slice(0, 1).toUpperCase()}</div>
                  <div className="grow"><b>@{account.username}</b><div className="accountMeta"><span className="pill">{account.status}</span><span className="badge device">📱 Android ADB</span><span className="badge direct">{account.adbSerial || "no device"}</span></div></div>
                  <div className="actions"><button type="button" className="btn small" onClick={() => testAccount(account)}>Test</button><button type="button" className="btn small primary" onClick={() => runtimeAction(account, "open")}>Apri app</button><button type="button" className="btn small" onClick={() => runtimeAction(account, "stop")}>Stop</button></div>
                </div>
                <div className="tuningRow">
                  <div><label>Device</label><select name="adbSerial" defaultValue={account.adbSerial || ""} required><option value="" disabled>Seleziona…</option>{devices.map((device) => <option key={device.serial} value={device.serial} disabled={device.state !== "device"}>{device.serial} · {device.model || device.device || "Android"}</option>)}</select></div>
                  <div><label>Package</label><input name="androidPackage" defaultValue={account.androidPackage || DEFAULT_PACKAGE} /></div>
                </div>
                <div className="tuningTiming"><label>Pausa min<input name="minDelaySec" type="number" min="0" defaultValue={account.minDelaySec} /></label><label>Pausa max<input name="maxDelaySec" type="number" min="0" defaultValue={account.maxDelaySec} /></label><label>Cooldown<input name="cooldownSec" type="number" min="0" defaultValue={account.cooldownSec} /></label><label>Max/run<input name="maxPerRun" type="number" min="0" defaultValue={account.maxPerRun} /></label><button className="btn small" disabled={busy}>Salva</button></div>
                {currentHealth && <div className="notice">{currentHealth.model || currentHealth.serial} · SDK {currentHealth.sdk ?? "?"} · {currentHealth.width ?? "?"}×{currentHealth.height ?? "?"} · package {currentHealth.packageInstalled ? "OK" : "mancante"}{currentHealth.currentPackage ? ` · foreground: ${currentHealth.currentPackage}` : ""}</div>}
                {message && <span className={`proxyStatusText ${message.ok ? "ok" : "err"}`}>{message.text}</span>}
              </form>
            );
          })}
        </div></div>
      </section>

      <div className="notice" style={{ marginTop: 16 }}><b>Flusso consigliato:</b> collega il device → installa/apri Instagram → fai il login manualmente → premi <b>Test</b> → esegui prima un job in <b>Dry-run</b>. I limiti per account, pausa/cancel e rilevamento dei blocchi restano attivi anche sul runtime Android.</div>
    </main>
  );
}
