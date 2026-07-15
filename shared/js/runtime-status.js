import { supabaseApi } from "./supabase-api.js";
import { authManager } from "./auth.js";
import { syncQueue } from "./sync-queue.js";

function label() {
  if (!navigator.onLine && supabaseApi.backendMode === "supabase") return { text: "Offline · antrean aktif", type: "offline" };
  if (supabaseApi.demoMode) return { text: `Mode demo · ${authManager.role === "guest" ? "belum masuk" : authManager.role}`, type: "demo" };
  if (supabaseApi.remoteConfigured && authManager.authenticated) return { text: `Supabase online · ${authManager.role}`, type: "online" };
  if (supabaseApi.remoteConfigured) return { text: "Supabase siap · belum masuk", type: "ready" };
  return { text: "Mode lokal · backend belum dihubungkan", type: "local" };
}

function render() {
  const state = label();
  document.querySelectorAll("[data-backend-status]").forEach(el => {
    el.textContent = state.text;
    el.dataset.status = state.type;
  });
  const pending = authManager.user?.id ? syncQueue.summary(authManager.user.id).total : 0;
  document.querySelectorAll("[data-sync-count]").forEach(el => { el.textContent = String(pending); });

  let banner = document.querySelector("[data-runtime-banner]");
  if (!banner && (supabaseApi.demoMode || (!navigator.onLine && supabaseApi.backendMode === "supabase"))) {
    banner = document.createElement("div");
    banner.dataset.runtimeBanner = "";
    banner.className = "runtime-banner";
    document.body.prepend(banner);
  }
  if (banner) {
    banner.dataset.status = state.type;
    banner.innerHTML = `<div class="portal-container"><strong>${state.text}</strong><span>${supabaseApi.demoMode ? "Data perubahan hanya tersimpan di browser ini." : `${pending} hasil menunggu sinkronisasi.`}</span><a href="setup.html">Status sistem</a></div>`;
  }
}

export function initRuntimeStatus() {
  render();
  ["online", "offline", "ppn:queue-changed", "ppn:auth-ready", "ppn:runtime-changed"].forEach(name => window.addEventListener(name, render));
}
