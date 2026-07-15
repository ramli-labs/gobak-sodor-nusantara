import { supabaseApi } from "./supabase-api.js";
import { authManager } from "./auth.js";
import { syncQueue } from "./sync-queue.js";

function show(message, type = "") {
  let element = document.querySelector("[data-portal-sync-status]");
  if (!element) {
    element = document.createElement("div");
    element.dataset.portalSyncStatus = "";
    element.className = "portal-sync-status";
    document.body.append(element);
  }
  element.textContent = message;
  element.dataset.type = type;
  element.classList.add("show");
  clearTimeout(show.timer);
  show.timer = setTimeout(() => element.classList.remove("show"), 3500);
}

async function submit(payload) {
  if (!supabaseApi.configured || !authManager.authenticated) {
    show("Hasil tersimpan lokal. Masuk sebelum bermain untuk sinkronisasi akun.", "local");
    return false;
  }

  if (!navigator.onLine && supabaseApi.backendMode === "supabase") {
    syncQueue.enqueue(authManager.user.id, payload, "Browser offline");
    show("Offline: hasil masuk antrean sinkronisasi.", "local");
    return false;
  }

  try {
    await supabaseApi.invoke("submit-game-session", { action: "quick", ...payload });
    show(supabaseApi.demoMode ? "Hasil masuk data demo lokal." : "Hasil tersinkron ke akun portal.", "success");
    return true;
  } catch (error) {
    syncQueue.enqueue(authManager.user.id, payload, error.message);
    show(`Sinkronisasi ditunda: ${error.message}`, "error");
    return false;
  }
}

async function flush(force = false) {
  if (!authManager.authenticated) return;
  const result = await syncQueue.flush(authManager.user.id, { force });
  if (result.synced) show(`${result.synced} hasil tertunda berhasil disinkronkan.`, "success");
}

window.addEventListener("ppn:game-finished", event => { void submit(event.detail); });
window.addEventListener("online", () => { void flush(true); });
window.addEventListener("ppn:retry-sync", () => { void flush(true); });
document.addEventListener("DOMContentLoaded", async () => {
  await authManager.init();
  await flush();
});
