/**
 * Konfigurasi Supabase untuk Portal Permainan Nusantara.
 * Publishable key boleh berada di frontend SELAMA RLS diaktifkan.
 * Jangan pernah menaruh secret/service_role key atau password database di file ini.
 */
export const SUPABASE_CONFIG = Object.freeze({
  url: "https://GANTI-PROJECT-REF.supabase.co",
  publishableKey: "GANTI-DENGAN-SB-PUBLISHABLE-KEY",
  siteUrl: ""
});

function legacyJwtRole(key) {
  try {
    const part = String(key).split(".")[1];
    if (!part) return "";
    const base = part.replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base.padEnd(Math.ceil(base.length / 4) * 4, "=");
    return String(JSON.parse(atob(normalized))?.role || "");
  } catch { return ""; }
}

export function isSafePublishableKey(key) {
  const value = String(key || "").trim();
  if (value.startsWith("sb_publishable_")) return true;
  if (value.startsWith("sb_secret_") || /service[_-]?role/i.test(value)) return false;
  // Dukungan proyek lama: hanya JWT dengan claim role=anon yang diterima.
  return value.startsWith("eyJ") && legacyJwtRole(value) === "anon";
}

export function isSupabaseConfigured(config = SUPABASE_CONFIG) {
  return Boolean(
    config?.url?.startsWith("https://") &&
    config.url.includes(".supabase.co") &&
    isSafePublishableKey(config?.publishableKey) &&
    !String(config?.publishableKey || "").includes("GANTI-")
  );
}
