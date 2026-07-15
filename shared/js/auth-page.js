import { supabaseApi, DEMO_ACCOUNTS } from "./supabase-api.js";
import { authManager } from "./auth.js";

const PENDING_TEACHER_REQUEST_KEY = "ppnPendingTeacherRequestEmailV1";

function setFeedback(message, type = "") {
  const el = document.querySelector("[data-auth-feedback]");
  if (!el) return;
  el.textContent = message;
  el.className = `form-feedback ${type}`.trim();
}

function nextUrl() {
  const value = new URLSearchParams(location.search).get("next") || "dashboard.html";
  const allowed = new Set(["dashboard.html", "student.html", "teacher.html", "admin.html", "profile.html", "games.html", "leaderboard.html", "index.html"]);
  if (/^(?:javascript|data|vbscript):/i.test(value) || value.includes("\\") || value.includes("..")) return "dashboard.html";
  try {
    const parsed = new URL(value, location.href);
    if (parsed.origin !== location.origin) return "dashboard.html";
    const file = parsed.pathname.split("/").pop() || "dashboard.html";
    return allowed.has(file) ? `${file}${parsed.search}` : "dashboard.html";
  } catch { return "dashboard.html"; }
}

function renderBackendState() {
  const box = document.querySelector("[data-auth-backend-state]");
  if (!box) return;
  if (supabaseApi.demoMode) {
    box.innerHTML = '<strong>Mode demo aktif.</strong><span>Gunakan salah satu akun demo di bawah. Semua perubahan hanya tersimpan pada browser ini.</span>';
    box.dataset.state = "demo";
  } else if (supabaseApi.remoteConfigured) {
    box.innerHTML = '<strong>Supabase siap.</strong><span>Login dan pendaftaran akan memakai proyek Supabase yang dikonfigurasi.</span>';
    box.dataset.state = "online";
  } else {
    box.innerHTML = '<strong>Backend produksi belum dihubungkan.</strong><span>Anda tetap dapat menguji alur lengkap melalui Mode Demo.</span>';
    box.dataset.state = "local";
  }
}

async function enterDemo(role) {
  const account = DEMO_ACCOUNTS[role];
  if (!account) return;
  setFeedback(`Menyiapkan dashboard demo ${role}...`);
  await authManager.enterDemo(role);
  location.href = authManager.routeForRole();
}

async function init() {
  await authManager.init();
  renderBackendState();

  if (authManager.authenticated) {
    location.href = nextUrl() === "dashboard.html" ? authManager.routeForRole() : nextUrl();
    return;
  }

  document.querySelectorAll("[data-demo-role]").forEach(button => button.addEventListener("click", () => {
    button.disabled = true;
    enterDemo(button.dataset.demoRole).catch(error => {
      setFeedback(error.message || "Mode demo gagal dibuka.", "error");
      button.disabled = false;
    });
  }));

  document.querySelector("[data-stop-demo]")?.addEventListener("click", () => {
    supabaseApi.stopDemo({ keepData: true });
    renderBackendState();
    setFeedback("Mode demo dinonaktifkan. Data demo tetap tersimpan.", "success");
  });

  const tabs = document.querySelectorAll("[data-auth-tab]");
  const panels = document.querySelectorAll("[data-auth-panel]");
  tabs.forEach(tab => tab.addEventListener("click", () => {
    tabs.forEach(item => item.classList.toggle("active", item === tab));
    panels.forEach(panel => { panel.hidden = panel.dataset.authPanel !== tab.dataset.authTab; });
    setFeedback("");
  }));

  const productionDisabled = !supabaseApi.remoteConfigured && !supabaseApi.demoMode;
  document.querySelectorAll("[data-production-auth]").forEach(form => {
    form.querySelectorAll("input, select, button").forEach(control => { control.disabled = productionDisabled; });
  });
  if (productionDisabled) setFeedback("Gunakan Mode Demo atau hubungkan Supabase melalui halaman Setup.");

  document.querySelector("[data-login-form]")?.addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    if (button) button.disabled = true;
    try {
      const form = new FormData(event.currentTarget);
      setFeedback("Memeriksa akun...");
      await supabaseApi.signIn(String(form.get("email") || "").trim(), String(form.get("password") || ""));
      await authManager.init();
      const pendingEmail = localStorage.getItem(PENDING_TEACHER_REQUEST_KEY) || "";
      if (pendingEmail && pendingEmail.toLowerCase() === String(authManager.user?.email || "").toLowerCase()) {
        try {
          await supabaseApi.rpc("request_teacher_access", { p_note: "Permintaan saat pendaftaran portal." });
          localStorage.removeItem(PENDING_TEACHER_REQUEST_KEY);
        } catch (error) { console.warn("Permintaan guru tertunda belum terkirim:", error); }
      }
      setFeedback("Login berhasil.", "success");
      location.href = nextUrl() === "dashboard.html" ? authManager.routeForRole() : nextUrl();
    } catch (error) {
      setFeedback(error.message || "Login gagal.", "error");
    } finally { if (button) button.disabled = false; }
  });

  document.querySelector("[data-register-form]")?.addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    if (button) button.disabled = true;
    try {
      const form = new FormData(event.currentTarget);
      const password = String(form.get("password") || "");
      const confirmation = String(form.get("passwordConfirmation") || "");
      if (password.length < 8) throw new Error("Password minimal 8 karakter.");
      if (password !== confirmation) throw new Error("Konfirmasi password tidak sama.");
      setFeedback("Membuat akun...");
      const email = String(form.get("email") || "").trim();
      const requestsTeacher = form.get("requestTeacher") === "on";
      const data = await supabaseApi.signUp({
        email,
        password,
        fullName: String(form.get("fullName") || "").trim(),
        schoolName: String(form.get("schoolName") || "").trim(),
        classLabel: String(form.get("classLabel") || "").trim(),
        avatar: String(form.get("avatar") || "🌟")
      });
      if (requestsTeacher) localStorage.setItem(PENDING_TEACHER_REQUEST_KEY, email);
      else localStorage.removeItem(PENDING_TEACHER_REQUEST_KEY);
      if (!data?.access_token) {
        setFeedback("Akun dibuat. Periksa email untuk konfirmasi, lalu masuk.", "success");
        document.querySelector('[data-auth-tab="login"]')?.click();
        return;
      }
      await authManager.init();
      if (requestsTeacher) {
        try {
          await supabaseApi.rpc("request_teacher_access", { p_note: "Permintaan saat pendaftaran portal." });
          localStorage.removeItem(PENDING_TEACHER_REQUEST_KEY);
        } catch (error) { console.warn(error); }
      }
      setFeedback("Akun berhasil dibuat.", "success");
      location.href = authManager.routeForRole();
    } catch (error) {
      setFeedback(error.message || "Pendaftaran gagal.", "error");
    } finally { if (button) button.disabled = false; }
  });
}

document.addEventListener("DOMContentLoaded", init);
