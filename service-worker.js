/* Gobak Sodor Nusantara v1.3.0 — PWA shell (situs game tunggal).
   Naikkan versi cache setiap kali aset precache berubah agar pengguna lama
   menerima konten baru. Cache portal lama (ppn-*) ikut dibersihkan. */
const CACHE_NAME = "gsn-v1.3.0";
const APP_SHELL = [
  "./",
  "./index.html",
  "./game.html",
  "./culture.html",
  "./tutorial.html",
  "./leaderboard.html",
  "./offline.html",
  "./manifest.json",
  "./css/style.css",
  "./css/game.css",
  "./js/app.js",
  "./js/audio.js",
  "./js/effects.js",
  "./js/game.js",
  "./js/player.js",
  "./js/enemy.js",
  "./js/quiz.js",
  "./js/map.js",
  "./js/accessibility.js",
  "./js/gamification.js",
  "./js/difficulty.js",
  "./js/leaderboard.js",
  "./js/culture.js",
  "./data/questions.json",
  "./assets/img/icon-32.png",
  "./assets/img/icon-48.png",
  "./assets/img/icon-96.png",
  "./assets/img/icon-144.png",
  "./assets/img/icon-180.png",
  "./assets/img/icon-192.png",
  "./assets/img/icon-256.png",
  "./assets/img/icon-512.png",
  "./assets/img/icon-maskable-512.png",
  "./assets/img/social-preview.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    const results = await Promise.allSettled(APP_SHELL.map(asset => cache.add(new Request(asset, { cache: "reload" }))));
    results.forEach((result, index) => {
      if (result.status === "rejected") console.warn("Cache dilewati:", APP_SHELL[index], result.reason);
    });
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key !== CACHE_NAME && (key.startsWith("gsn-") || key.startsWith("ppn-")))
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request, { cache: "no-store" });
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(event.request)) || (await caches.match("./offline.html"));
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    const network = fetch(event.request).then(async response => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone());
      }
      return response;
    }).catch(() => null);
    return cached || (await network) || Response.error();
  })());
});
