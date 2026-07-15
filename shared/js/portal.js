import { PortalStore, THEME_KEY } from "./store.js";
import { authManager } from "./auth.js";
import { initRuntimeStatus } from "./runtime-status.js";
import { syncQueue } from "./sync-queue.js";

const store = new PortalStore();

class PortalApp {
  constructor() {
    this.installPrompt = null;
    this.toastTimer = 0;
  }

  async init() {
    this.applyTheme();
    this.bindNav();
    this.bindTheme();
    this.markNav();
    this.initReveal();
    this.initPwa();
    document.querySelectorAll("[data-current-year]").forEach(el => { el.textContent = new Date().getFullYear(); });
    await authManager.init();
    if (authManager.user?.id) syncQueue.flush(authManager.user.id).catch(error => console.warn("Antrean sinkronisasi belum dapat diproses:", error));
    this.renderHome();
    this.renderConnectionStatus();
    initRuntimeStatus();
  }

  applyTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    const dark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = stored || (dark ? "dark" : "light");
  }

  bindTheme() {
    document.querySelectorAll("[data-theme-toggle]").forEach(btn => btn.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem(THEME_KEY, next);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#0d1521" : "#123f73");
      this.toast(next === "dark" ? "Mode gelap aktif" : "Mode terang aktif");
    }));
  }

  bindNav() {
    const nav = document.querySelector("[data-portal-nav]");
    const toggle = document.querySelector("[data-menu-toggle]");
    toggle?.addEventListener("click", () => {
      const open = nav?.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(Boolean(open)));
      toggle.textContent = open ? "×" : "☰";
    });
    nav?.addEventListener("click", () => {
      nav.classList.remove("open");
      if (toggle) { toggle.setAttribute("aria-expanded", "false"); toggle.textContent = "☰"; }
    });
  }

  markNav() {
    const page = document.body.dataset.page;
    document.querySelector(`[data-nav="${page}"]`)?.classList.add("active");
  }

  initReveal() {
    const items = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) { items.forEach(el => el.classList.add("visible")); return; }
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    items.forEach(el => observer.observe(el));
  }

  renderHome() {
    if (document.body.dataset.page !== "home") return;
    const stats = store.getPortalStats();
    const greeting = document.querySelector("[data-home-greeting]");
    const profileCopy = document.querySelector("[data-home-profile-copy]");
    const name=authManager.profile?.full_name||stats.profile.displayName;const className=authManager.profile?.class_label||stats.profile.className;const totalXp=stats.xp+(authManager.authenticated?(Number(authManager.profile?.xp)||0):0);const level=Math.max(1,Math.floor(Math.sqrt(totalXp/250))+1);
    if (greeting) greeting.textContent = name ? `Selamat datang, ${name}` : "Mulai perjalananmu";
    if (profileCopy) profileCopy.textContent = name ? `${className || (authManager.authenticated?"Akun portal":"Profil lokal")} · Progres lokal dan hasil terverifikasi dihitung bersama.` : "Buat akun agar progres dapat tersimpan lintas perangkat.";
    document.querySelector("[data-home-level]")?.replaceChildren(String(level));
    document.querySelector("[data-home-xp]")?.replaceChildren(totalXp.toLocaleString("id-ID"));
    document.querySelector("[data-home-wins]")?.replaceChildren(String(stats.totalWins));
  }

  renderConnectionStatus() {
    document.querySelectorAll("[data-backend-status]").forEach(el => {
      if (authManager.demoMode) {
        el.textContent = `Mode demo · ${authManager.role === "guest" ? "belum masuk" : authManager.role}`;
        el.dataset.status = "demo";
      } else if (!authManager.configured) {
        el.textContent = "Mode lokal · Supabase belum dihubungkan";
        el.dataset.status = "local";
      } else if (authManager.authenticated) {
        el.textContent = `Supabase online · ${authManager.profile?.role || "akun"}`;
        el.dataset.status = "online";
      } else {
        el.textContent = "Supabase siap · belum login";
        el.dataset.status = "ready";
      }
    });
  }

  initPwa() {
    window.addEventListener("beforeinstallprompt", event => {
      event.preventDefault();
      this.installPrompt = event;
      document.querySelectorAll("[data-install-app]").forEach(button => { button.hidden = false; });
    });
    document.addEventListener("click", async event => {
      const button = event.target.closest("[data-install-app]");
      if (!button) return;
      if (!this.installPrompt) { this.toast("Gunakan menu browser untuk memasang aplikasi"); return; }
      this.installPrompt.prompt();
      await this.installPrompt.userChoice;
      this.installPrompt = null;
      button.hidden = true;
    });
    if ("serviceWorker" in navigator && ["http:", "https:"].includes(location.protocol)) {
      window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js", { scope: "./" }).catch(error => console.warn("Service worker gagal:", error)), { once: true });
    }
  }

  toast(message) {
    const el = document.querySelector("[data-toast]");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }
}

document.addEventListener("DOMContentLoaded", () => new PortalApp().init());
