import { authManager } from "./auth.js";

const messages = {
  forbidden: { icon: "🔒", title: "Akses halaman dibatasi", copy: "Akun yang sedang aktif tidak memiliki role yang diperlukan untuk membuka halaman ini." },
  backend: { icon: "☁️", title: "Backend belum siap", copy: "Hubungkan Supabase atau gunakan Mode Demo untuk menguji halaman yang memerlukan akun." },
  session: { icon: "⏳", title: "Sesi tidak tersedia", copy: "Silakan masuk kembali lalu ulangi tindakan Anda." }
};

function safeNext(raw) {
  const fallback = "index.html";
  if (!raw || raw.includes("..") || raw.includes("\\") || /^(?:javascript|data|vbscript):/i.test(raw)) return fallback;
  try {
    const url = new URL(raw, location.href);
    return url.origin === location.origin ? `${url.pathname.split("/").pop() || fallback}${url.search}` : fallback;
  } catch { return fallback; }
}

document.addEventListener("DOMContentLoaded", async () => {
  await authManager.init();
  const params = new URLSearchParams(location.search);
  const code = params.get("code") || "forbidden";
  const data = messages[code] || messages.forbidden;
  document.querySelector("[data-error-icon]").textContent = data.icon;
  document.querySelector("[data-error-title]").textContent = data.title;
  document.querySelector("[data-error-copy]").textContent = data.copy;
  document.querySelector("[data-error-detail]").textContent = params.get("required") ? `Role aktif: ${params.get("role") || "tamu"}. Role yang diperlukan: ${params.get("required")}.` : "";
  document.querySelector("[data-error-next]").href = safeNext(params.get("next") || authManager.routeForRole());
});
