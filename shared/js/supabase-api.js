import { SUPABASE_CONFIG, isSupabaseConfigured } from "../../config/supabase-config.js";
import { demoBackend, DEMO_MODE_KEY, DEMO_STATE_KEY, DEMO_SESSION_KEY, DEMO_ACCOUNTS } from "./demo-backend.js";

const SESSION_KEY = "ppnSupabaseSessionV1";
const OVERRIDE_KEY = "ppnSupabaseConfigOverrideV1";

function safeJson(value, fallback = null) {
  try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
}

function normalizeConfig() {
  const override = safeJson(localStorage.getItem(OVERRIDE_KEY), {});
  return {
    ...SUPABASE_CONFIG,
    ...(override && typeof override === "object" ? override : {})
  };
}

function decodeJwtPayload(token) {
  try {
    const part = token.split(".")[1];
    const base = part.replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base.padEnd(Math.ceil(base.length / 4) * 4, "=");
    const json = decodeURIComponent(atob(normalized).split("").map(c => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""));
    return JSON.parse(json);
  } catch { return {}; }
}

export class SupabaseApiError extends Error {
  constructor(message, status = 0, details = null) {
    super(message);
    this.name = "SupabaseApiError";
    this.status = status;
    this.details = details;
  }
}

export class SupabaseApi {
  constructor() {
    this.config = normalizeConfig();
    this.session = safeJson(localStorage.getItem(SESSION_KEY), null);
    this.refreshPromise = null;
  }

  get demoMode() { return demoBackend.active; }
  get backendMode() { return this.demoMode ? "demo" : isSupabaseConfigured(this.config) ? "supabase" : "local"; }
  get configured() { return this.demoMode || isSupabaseConfigured(this.config); }
  get remoteConfigured() { return isSupabaseConfigured(this.config); }
  get accessToken() { return this.demoMode ? demoBackend.accessToken : (this.session?.access_token || ""); }
  get refreshToken() { return this.demoMode ? demoBackend.refreshToken : (this.session?.refresh_token || ""); }
  get user() { return this.demoMode ? demoBackend.user : (this.session?.user || null); }

  saveSession(session) {
    if (this.demoMode) {
      demoBackend.saveSession(session);
    } else {
      this.session = session || null;
      if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else localStorage.removeItem(SESSION_KEY);
    }
    window.dispatchEvent(new CustomEvent("ppn:auth-changed", { detail: { session, mode: this.backendMode } }));
  }

  startDemo(role = "student") {
    demoBackend.setActive(true);
    this.session = null;
    localStorage.removeItem(SESSION_KEY);
    return demoBackend.signInRole(role).then(session => {
      window.dispatchEvent(new CustomEvent("ppn:runtime-changed", { detail: { mode: "demo", role } }));
      window.dispatchEvent(new CustomEvent("ppn:auth-changed", { detail: { session, mode: "demo" } }));
      return session;
    });
  }

  stopDemo({ keepData = true } = {}) {
    demoBackend.setActive(false);
    demoBackend.saveSession(null);
    if (!keepData) demoBackend.reset();
    window.dispatchEvent(new CustomEvent("ppn:runtime-changed", { detail: { mode: this.backendMode } }));
    window.dispatchEvent(new CustomEvent("ppn:auth-changed", { detail: { session: this.session, mode: this.backendMode } }));
  }

  resetDemoData() {
    const state = demoBackend.reset();
    window.dispatchEvent(new CustomEvent("ppn:demo-reset", { detail: { state } }));
    return state;
  }

  setLocalConfig(url, publishableKey, siteUrl = "") {
    const config = { url: String(url || "").trim().replace(/\/$/, ""), publishableKey: String(publishableKey || "").trim(), siteUrl: String(siteUrl || "").trim() };
    const changed = config.url !== this.config.url || config.publishableKey !== this.config.publishableKey;
    localStorage.setItem(OVERRIDE_KEY, JSON.stringify(config));
    this.config = normalizeConfig();
    if (changed) {
      this.session = null;
      localStorage.removeItem(SESSION_KEY);
    }
    return this.remoteConfigured;
  }

  clearLocalConfig() {
    localStorage.removeItem(OVERRIDE_KEY);
    this.config = normalizeConfig();
    this.session = null;
    localStorage.removeItem(SESSION_KEY);
  }

  async parseResponse(response) {
    const type = response.headers.get("content-type") || "";
    const payload = type.includes("application/json") ? await response.json().catch(() => null) : await response.text().catch(() => "");
    if (!response.ok) {
      const message = payload?.msg || payload?.message || payload?.error_description || payload?.error || (typeof payload === "string" && payload) || `Permintaan gagal (${response.status})`;
      throw new SupabaseApiError(message, response.status, payload);
    }
    return payload;
  }

  baseHeaders(auth = false, extra = {}) {
    if (!this.remoteConfigured) throw new SupabaseApiError("Supabase belum dikonfigurasi.");
    const headers = {
      apikey: this.config.publishableKey,
      "Content-Type": "application/json",
      ...extra
    };
    if (auth && this.accessToken) headers.Authorization = `Bearer ${this.accessToken}`;
    return headers;
  }

  tokenExpiresSoon() {
    if (this.demoMode) return false;
    if (!this.accessToken) return true;
    const exp = Number(decodeJwtPayload(this.accessToken).exp || 0) * 1000;
    return !exp || exp - Date.now() < 60_000;
  }

  async ensureSession() {
    if (this.demoMode) return demoBackend.ensureSession();
    if (!this.session) return null;
    if (this.tokenExpiresSoon() && this.refreshToken) {
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshSession().catch(error => { this.saveSession(null); throw error; }).finally(() => { this.refreshPromise = null; });
      }
      try { await this.refreshPromise; } catch { return null; }
    }
    return this.session;
  }

  async signUp(payload) {
    if (this.demoMode) {
      const data = await demoBackend.signUp(payload);
      window.dispatchEvent(new CustomEvent("ppn:auth-changed", { detail: { session: data, mode: "demo" } }));
      return data;
    }
    const { email, password, fullName = "", schoolName = "", classLabel = "", avatar = "🌟" } = payload;
    const response = await fetch(`${this.config.url}/auth/v1/signup`, {
      method: "POST",
      headers: this.baseHeaders(false),
      body: JSON.stringify({ email, password, data: { full_name: fullName, school_name: schoolName, class_label: classLabel, avatar } })
    });
    const data = await this.parseResponse(response);
    if (data?.access_token) this.saveSession(data);
    return data;
  }

  async signIn(email, password) {
    if (this.demoMode) {
      const data = await demoBackend.signIn(email, password);
      window.dispatchEvent(new CustomEvent("ppn:auth-changed", { detail: { session: data, mode: "demo" } }));
      return data;
    }
    const response = await fetch(`${this.config.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: this.baseHeaders(false),
      body: JSON.stringify({ email, password })
    });
    const data = await this.parseResponse(response);
    this.saveSession(data);
    return data;
  }

  async refreshSession() {
    if (this.demoMode) return demoBackend.ensureSession();
    if (!this.refreshToken) throw new SupabaseApiError("Refresh token tidak tersedia.");
    const response = await fetch(`${this.config.url}/auth/v1/token?grant_type=refresh_token`, {
      method: "POST",
      headers: this.baseHeaders(false),
      body: JSON.stringify({ refresh_token: this.refreshToken })
    });
    const data = await this.parseResponse(response);
    this.saveSession(data);
    return data;
  }

  async signOut() {
    if (this.demoMode) {
      await demoBackend.signOut();
      window.dispatchEvent(new CustomEvent("ppn:auth-changed", { detail: { session: null, mode: "demo" } }));
      return;
    }
    const token = this.accessToken;
    this.saveSession(null);
    if (!token || !this.remoteConfigured) return;
    try {
      await fetch(`${this.config.url}/auth/v1/logout?scope=local`, {
        method: "POST",
        headers: { ...this.baseHeaders(false), Authorization: `Bearer ${token}` }
      });
    } catch { /* logout lokal tetap berhasil */ }
  }

  async getUser() {
    if (this.demoMode) return demoBackend.getUser();
    await this.ensureSession();
    if (!this.accessToken) return null;
    const response = await fetch(`${this.config.url}/auth/v1/user`, { headers: this.baseHeaders(true) });
    const user = await this.parseResponse(response);
    if (this.session) {
      this.session.user = user;
      localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
    }
    return user;
  }

  async rest(table, { method = "GET", query = "", body, prefer = "return=representation", auth = true } = {}) {
    if (this.demoMode) {
      if (method === "GET") return demoBackend.rest(table, { query, auth });
      if (method === "POST") return demoBackend.insert(table, body);
      if (method === "PATCH") return demoBackend.update(table, query, body);
      if (method === "DELETE") return demoBackend.remove(table, query);
    }
    await this.ensureSession();
    const url = `${this.config.url}/rest/v1/${encodeURIComponent(table)}${query ? `?${query}` : ""}`;
    const headers = this.baseHeaders(auth, { Prefer: prefer });
    const response = await fetch(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return this.parseResponse(response);
  }

  select(table, query = "select=*") { return this.demoMode ? demoBackend.select(table, query) : this.rest(table, { query }); }
  insert(table, values, prefer = "return=representation") { return this.demoMode ? demoBackend.insert(table, values) : this.rest(table, { method: "POST", body: values, prefer }); }
  update(table, query, values, prefer = "return=representation") { return this.demoMode ? demoBackend.update(table, query, values) : this.rest(table, { method: "PATCH", query, body: values, prefer }); }
  remove(table, query, prefer = "return=representation") { return this.demoMode ? demoBackend.remove(table, query) : this.rest(table, { method: "DELETE", query, prefer }); }

  async rpc(name, args = {}, { auth = true } = {}) {
    if (this.demoMode) return demoBackend.rpc(name, args);
    await this.ensureSession();
    const response = await fetch(`${this.config.url}/rest/v1/rpc/${encodeURIComponent(name)}`, {
      method: "POST",
      headers: this.baseHeaders(auth, { Prefer: "return=representation" }),
      body: JSON.stringify(args)
    });
    return this.parseResponse(response);
  }

  async invoke(functionName, body = {}) {
    if (this.demoMode) return demoBackend.invoke(functionName, body);
    await this.ensureSession();
    if (!this.accessToken) throw new SupabaseApiError("Login diperlukan.", 401);
    const response = await fetch(`${this.config.url}/functions/v1/${encodeURIComponent(functionName)}`, {
      method: "POST",
      headers: this.baseHeaders(true),
      body: JSON.stringify(body)
    });
    return this.parseResponse(response);
  }

  async diagnose() {
    const checks = [
      { id: "browser", label: "Browser online", ok: navigator.onLine, detail: navigator.onLine ? "Jaringan terdeteksi." : "Browser sedang offline." },
      { id: "config", label: "Konfigurasi Supabase", ok: this.remoteConfigured, detail: this.remoteConfigured ? "Project URL dan publishable key valid secara format." : "Belum ada konfigurasi produksi." }
    ];
    if (!this.remoteConfigured) return { mode: this.backendMode, checks, ok: false };
    try {
      const started = performance.now();
      const rows = await this.rest("games", { query: "select=slug,title,status&limit=1", auth: false });
      checks.push({ id: "rest", label: "REST API dan RLS", ok: Array.isArray(rows), detail: `Respons diterima dalam ${Math.round(performance.now() - started)} ms.` });
    } catch (error) {
      checks.push({ id: "rest", label: "REST API dan RLS", ok: false, detail: error.message });
    }
    return { mode: this.backendMode, checks, ok: checks.every(item => item.ok) };
  }
}

export const supabaseApi = new SupabaseApi();
export { SESSION_KEY, OVERRIDE_KEY, DEMO_MODE_KEY, DEMO_STATE_KEY, DEMO_SESSION_KEY, DEMO_ACCOUNTS };
