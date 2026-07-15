import { mkdir, readFile, readdir, rm, stat, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "..");
const distDir = path.join(rootDir, "dist");

const required = {
  PUBLIC_SUPABASE_URL: String(process.env.PUBLIC_SUPABASE_URL || "").trim(),
  PUBLIC_SUPABASE_PUBLISHABLE_KEY: String(process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || "").trim(),
  PUBLIC_SITE_URL: String(process.env.PUBLIC_SITE_URL || "").trim().replace(/\/$/, "")
};

function fail(message) {
  console.error(`\n[build] ${message}\n`);
  process.exit(1);
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(required.PUBLIC_SUPABASE_URL)) {
  fail("PUBLIC_SUPABASE_URL belum diisi atau formatnya bukan https://<project-ref>.supabase.co");
}

const key = required.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const looksPublishable = key.startsWith("sb_publishable_") || key.startsWith("eyJ");
const looksSecret = key.startsWith("sb_secret_") || /service[_-]?role/i.test(key);
if (!looksPublishable || looksSecret) {
  fail("PUBLIC_SUPABASE_PUBLISHABLE_KEY harus berupa publishable/anon key, bukan secret atau service_role key.");
}

if (!/^https:\/\//i.test(required.PUBLIC_SITE_URL)) {
  fail("PUBLIC_SITE_URL belum diisi atau bukan URL HTTPS production Vercel.");
}

const excludedTopLevel = new Set([
  ".git",
  ".github",
  "dist",
  "node_modules",
  "scripts",
  "package.json",
  "package-lock.json",
  "vercel.json"
]);

async function copyTree(sourceDir, targetDir, depth = 0) {
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (depth === 0 && excludedTopLevel.has(entry.name)) continue;
    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await copyTree(source, target, depth + 1);
    } else if (entry.isFile()) {
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(source, target);
    }
  }
}

await rm(distDir, { recursive: true, force: true });
await copyTree(rootDir, distDir);

const configPath = path.join(distDir, "config", "supabase-config.js");
await mkdir(path.dirname(configPath), { recursive: true });

const configSource = `/**
 * Dibuat otomatis saat deployment Vercel.
 * Jangan menaruh secret/service_role key di frontend.
 */
export const SUPABASE_CONFIG = Object.freeze({
  url: ${JSON.stringify(required.PUBLIC_SUPABASE_URL)},
  publishableKey: ${JSON.stringify(required.PUBLIC_SUPABASE_PUBLISHABLE_KEY)},
  siteUrl: ${JSON.stringify(required.PUBLIC_SITE_URL + "/")}
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
  return value.startsWith("eyJ") && legacyJwtRole(value) === "anon";
}

export function isSupabaseConfigured(config = SUPABASE_CONFIG) {
  return Boolean(
    config?.url?.startsWith("https://") &&
    config.url.includes(".supabase.co") &&
    isSafePublishableKey(config?.publishableKey)
  );
}
`;

await writeFile(configPath, configSource, "utf8");

const swPath = path.join(distDir, "service-worker.js");
try {
  let sw = await readFile(swPath, "utf8");
  sw = sw.replace(/const CACHE_NAME\s*=\s*["'][^"']+["'];?/, `const CACHE_NAME = "ppn-v1.1.1-vercel-env";`);
  await writeFile(swPath, sw, "utf8");
} catch {
  // Portal tetap dapat dibangun jika service worker tidak tersedia.
}

console.log("[build] Portal berhasil dibuat di dist/");
console.log(`[build] Site URL: ${required.PUBLIC_SITE_URL}`);
console.log(`[build] Supabase URL: ${required.PUBLIC_SUPABASE_URL}`);
