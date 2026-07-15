import { authManager } from "./auth.js";

export function escapeHtml(value="") {
  return String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
}

export function formatDate(value, withTime=false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", withTime ? {dateStyle:"medium",timeStyle:"short"} : {dateStyle:"medium"}).format(date);
}


export function safeLocalHref(value, fallback="games.html") {
  const raw = String(value || "").trim();
  if (!raw || raw.startsWith("//") || raw.includes("\\") || raw.includes("..")) return fallback;
  try {
    const url = new URL(raw, window.location.href);
    if (url.origin !== window.location.origin) return fallback;
    const decodedPath = decodeURIComponent(url.pathname);
    if (decodedPath.split("/").includes("..") || /^(?:javascript|data|vbscript):/i.test(raw)) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return fallback; }
}

export function setPageFeedback(message, type="") {
  const el=document.querySelector("[data-page-feedback]");
  if(!el)return;
  el.textContent=message;
  el.className=`form-feedback ${type}`.trim();
}

export function renderDashboardIdentity() {
  const p=authManager.profile||{};
  document.querySelectorAll("[data-dashboard-name]").forEach(el=>el.textContent=p.full_name||"Pengguna");
  document.querySelectorAll("[data-dashboard-avatar]").forEach(el=>el.textContent=p.avatar||"👤");
  document.querySelectorAll("[data-dashboard-role]").forEach(el=>el.textContent=({student:"Siswa",teacher:"Guru",admin:"Admin"}[p.role]||"Tamu"));
  document.querySelectorAll("[data-dashboard-school]").forEach(el=>el.textContent=p.school_name||"Sekolah belum diisi");
}

export function bindDashboardActions() {
  document.querySelector("[data-logout]")?.addEventListener("click",async()=>{await authManager.signOut();location.href="index.html";});
}

export function dashboardShellReady() { renderDashboardIdentity(); bindDashboardActions(); }
