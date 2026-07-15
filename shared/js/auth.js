import { supabaseApi } from "./supabase-api.js";

const PROFILE_CACHE_KEY = "ppnRemoteProfileCacheV1";

function safeParse(value, fallback = null) { try { return JSON.parse(value) ?? fallback; } catch { return fallback; } }

export class AuthManager {
  constructor(api = supabaseApi) {
    this.api = api;
    this.user = api.user;
    this.profile = safeParse(localStorage.getItem(PROFILE_CACHE_KEY), null);
    this.ready = false;
  }

  get configured() { return this.api.configured; }
  get backendMode() { return this.api.backendMode; }
  get demoMode() { return this.api.demoMode; }
  get authenticated() { return Boolean(this.api.accessToken && this.user); }
  get role() { return this.profile?.role || "guest"; }

  async init({ refreshProfile = true } = {}) {
    if (!this.configured) {
      this.user = null;
      this.profile = null;
      this.ready = true;
      this.renderHeader();
      window.dispatchEvent(new CustomEvent("ppn:auth-ready", { detail: this.snapshot() }));
      return this;
    }
    try {
      await this.api.ensureSession();
      if (this.api.accessToken) {
        this.user = await this.api.getUser();
        if (refreshProfile) await this.loadProfile();
      } else {
        this.user = null;
        this.profile = null;
        localStorage.removeItem(PROFILE_CACHE_KEY);
      }
    } catch (error) {
      console.warn("Auth init gagal:", error);
      this.user = null;
      this.profile = null;
      localStorage.removeItem(PROFILE_CACHE_KEY);
    }
    this.ready = true;
    this.renderHeader();
    window.dispatchEvent(new CustomEvent("ppn:auth-ready", { detail: this.snapshot() }));
    return this;
  }

  snapshot() {
    return { configured: this.configured, authenticated: this.authenticated, user: this.user, profile: this.profile, role: this.role, backendMode: this.backendMode, demoMode: this.demoMode };
  }

  async loadProfile() {
    if (!this.user?.id) return null;
    const rows = await this.api.select("profiles", `select=id,full_name,role,school_name,class_label,avatar,xp,created_at,updated_at&id=eq.${encodeURIComponent(this.user.id)}&limit=1`);
    this.profile = Array.isArray(rows) ? rows[0] || null : rows;
    if (this.profile) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(this.profile));
    return this.profile;
  }

  async updateProfile(changes) {
    if (!this.user?.id) throw new Error("Login diperlukan.");
    const allowed = ["full_name", "school_name", "class_label", "avatar"];
    const clean = Object.fromEntries(Object.entries(changes).filter(([key]) => allowed.includes(key)));
    const rows = await this.api.update("profiles", `id=eq.${encodeURIComponent(this.user.id)}`, clean);
    this.profile = rows?.[0] || { ...this.profile, ...clean };
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(this.profile));
    this.renderHeader();
    return this.profile;
  }

  async signOut() {
    await this.api.signOut();
    this.user = null;
    this.profile = null;
    localStorage.removeItem(PROFILE_CACHE_KEY);
    this.renderHeader();
  }

  async enterDemo(role = "student") {
    await this.api.startDemo(role);
    this.ready = false;
    await this.init();
    return this.snapshot();
  }

  routeForRole() {
    if (this.role === "admin") return "admin.html";
    if (this.role === "teacher") return "teacher.html";
    if (this.role === "student") return "student.html";
    return "auth.html";
  }

  async requireAuth({ roles = [], redirect = "auth.html" } = {}) {
    if (!this.ready) await this.init();
    if (!this.configured) {
      const next = encodeURIComponent(location.pathname.split("/").pop() || "index.html");
      location.href = `auth.html?next=${next}&reason=backend`;
      return false;
    }
    if (!this.authenticated) {
      const next = encodeURIComponent((location.pathname.split("/").pop() || "index.html") + location.search);
      location.href = `${redirect}?next=${next}`;
      return false;
    }
    if (roles.length && !roles.includes(this.role)) {
      const target = this.routeForRole();
      const params = new URLSearchParams({ code: "forbidden", required: roles.join(","), role: this.role, next: target });
      location.href = `error.html?${params}`;
      return false;
    }
    return true;
  }

  renderHeader() {
    document.querySelectorAll("[data-auth-link]").forEach(link => {
      if (!this.configured) {
        link.textContent = "Masuk / Demo";
        link.setAttribute("href", "auth.html");
        link.dataset.authState = "local";
      } else if (this.authenticated) {
        const first = this.profile?.full_name ? this.profile.full_name.split(" ")[0] : "Dashboard";
        link.textContent = this.demoMode ? `Demo: ${first}` : first;
        link.setAttribute("href", this.routeForRole());
        link.dataset.authState = this.demoMode ? "demo" : "signed-in";
      } else {
        link.textContent = this.demoMode ? "Masuk Demo" : "Masuk";
        link.setAttribute("href", "auth.html");
        link.dataset.authState = "signed-out";
      }
    });
    document.querySelectorAll("[data-auth-avatar]").forEach(el => el.textContent = this.profile?.avatar || "👤");
    document.querySelectorAll("[data-auth-role]").forEach(el => el.textContent = this.role === "guest" ? "Tamu" : this.role);
  }
}

export const authManager = new AuthManager();

window.addEventListener("ppn:auth-changed", () => {
  authManager.user = supabaseApi.user;
  if (!supabaseApi.user) { authManager.profile = null; localStorage.removeItem(PROFILE_CACHE_KEY); }
  authManager.renderHeader();
});
