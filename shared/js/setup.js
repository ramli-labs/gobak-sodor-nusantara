import { supabaseApi } from "./supabase-api.js";
import { authManager } from "./auth.js";
import { syncQueue } from "./sync-queue.js";

function feedback(message, type = "") {
  const element = document.querySelector("[data-setup-feedback]");
  if (element) {
    element.textContent = message;
    element.className = `form-feedback ${type}`.trim();
  }
}

function safeNext() {
  const raw = new URLSearchParams(location.search).get("next") || "";
  const allowed = new Set(["auth.html", "dashboard.html", "student.html", "teacher.html", "admin.html", "profile.html"]);
  if (raw.includes("..") || raw.includes("\\") || /^(?:javascript|data|vbscript):/i.test(raw)) return "";
  try {
    const parsed = new URL(raw, location.href);
    if (parsed.origin !== location.origin) return "";
    const file = parsed.pathname.split("/").pop() || "";
    return allowed.has(file) ? `${file}${parsed.search}` : "";
  } catch { return ""; }
}

function renderMode() {
  document.querySelectorAll("[data-runtime-card]").forEach(card => card.classList.toggle("active", card.dataset.runtimeCard === supabaseApi.backendMode));
  const state = document.querySelector("[data-config-state]");
  if (state) {
    state.textContent = supabaseApi.demoMode
      ? "Mode demo aktif pada browser ini."
      : supabaseApi.remoteConfigured
        ? "Supabase telah dikonfigurasi pada browser ini."
        : "Portal berjalan dalam mode lokal tanpa backend.";
  }
  const queue = syncQueue.summary(authManager.user?.id || null);
  document.querySelectorAll("[data-sync-count]").forEach(el => { el.textContent = String(queue.total); });
}

function renderDiagnostics(result) {
  const target = document.querySelector("[data-setup-diagnostics]");
  if (!target) return;
  target.innerHTML = result.checks.map(check => `<article class="diagnostic-item ${check.ok ? "" : "failed"}"><span>${check.ok ? "✓" : "!"}</span><div><strong>${check.label}</strong><small>${check.detail}</small></div></article>`).join("");
}

async function runDiagnostics() {
  const button = document.querySelector("[data-run-diagnostics]");
  if (button) button.disabled = true;
  feedback("Menjalankan pemeriksaan koneksi...");
  try {
    const result = await supabaseApi.diagnose();
    renderDiagnostics(result);
    feedback(result.ok ? "Semua pemeriksaan produksi berhasil." : "Pemeriksaan selesai. Lihat item yang masih gagal.", result.ok ? "success" : "warning");
  } catch (error) {
    feedback(error.message, "error");
  } finally { if (button) button.disabled = false; }
}

document.addEventListener("DOMContentLoaded", async () => {
  await authManager.init();
  const form = document.querySelector("[data-setup-form]");
  const current = supabaseApi.config;
  form.url.value = current.url.includes("GANTI-") ? "" : current.url;
  form.publishableKey.value = current.publishableKey.includes("GANTI-") ? "" : current.publishableKey;
  form.siteUrl.value = current.siteUrl || "";
  renderMode();

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const button = event.submitter;
    if (button) button.disabled = true;
    const ok = supabaseApi.setLocalConfig(form.url.value, form.publishableKey.value, form.siteUrl.value);
    if (!ok) {
      feedback("URL atau publishable key belum valid. Secret/service_role key ditolak.", "error");
      if (button) button.disabled = false;
      return;
    }
    if (supabaseApi.demoMode) supabaseApi.stopDemo({ keepData: true });
    feedback("Konfigurasi tersimpan. Menguji koneksi...");
    try {
      const result = await supabaseApi.diagnose();
      renderDiagnostics(result);
      const next = safeNext();
      feedback(result.ok ? (next ? "Koneksi berhasil. Mengarahkan..." : "Koneksi berhasil. Portal siap memakai Supabase.") : "Konfigurasi tersimpan, tetapi pemeriksaan belum seluruhnya berhasil.", result.ok ? "success" : "warning");
      renderMode();
      if (result.ok && next) setTimeout(() => { location.href = next; }, 700);
    } catch (error) {
      feedback(`Konfigurasi tersimpan, tetapi tes koneksi gagal: ${error.message}`, "error");
    } finally { if (button) button.disabled = false; }
  });

  document.querySelector("[data-clear-config]")?.addEventListener("click", () => {
    supabaseApi.clearLocalConfig();
    form.reset();
    feedback("Konfigurasi Supabase lokal dihapus.", "success");
    renderMode();
  });

  document.querySelectorAll("[data-start-demo]").forEach(button => button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      await authManager.enterDemo(button.dataset.startDemo || "student");
      feedback(`Mode demo ${button.dataset.startDemo} aktif.`, "success");
      renderMode();
      setTimeout(() => { location.href = authManager.routeForRole(); }, 350);
    } catch (error) { feedback(error.message, "error"); }
    finally { button.disabled = false; }
  }));

  document.querySelector("[data-stop-demo]")?.addEventListener("click", () => {
    supabaseApi.stopDemo({ keepData: true });
    feedback("Mode demo dimatikan. Data demo tidak dihapus.", "success");
    renderMode();
  });

  document.querySelector("[data-reset-demo]")?.addEventListener("click", () => {
    if (!confirm("Reset seluruh kelas, soal, tugas, dan hasil demo ke kondisi awal?")) return;
    supabaseApi.resetDemoData();
    feedback("Data demo dikembalikan ke kondisi awal.", "success");
    renderMode();
  });

  document.querySelector("[data-run-diagnostics]")?.addEventListener("click", runDiagnostics);
  document.querySelector("[data-retry-queue]")?.addEventListener("click", async () => {
    if (!authManager.user?.id) { feedback("Masuk ke akun terlebih dahulu untuk menyinkronkan antrean.", "warning"); return; }
    const result = await syncQueue.flush(authManager.user.id, { force: true });
    feedback(result.synced ? `${result.synced} hasil berhasil disinkronkan.` : `${result.remaining} hasil masih menunggu.`, result.synced ? "success" : "warning");
    renderMode();
  });
  window.addEventListener("ppn:queue-changed", renderMode);
  await runDiagnostics();
});
