/* Portal Permainan Nusantara v1.1 RC — PWA shell. */
const CACHE_NAME = "ppn-v1.1.0-rc";
const APP_SHELL = [
  "./",
  "./admin.html",
  "./auth.html",
  "./config/supabase-config.js",
  "./culture.html",
  "./dashboard.html",
  "./data/games.json",
  "./error.html",
  "./game.html",
  "./games.html",
  "./games/gobak-sodor/assets/img/icon-144.png",
  "./games/gobak-sodor/assets/img/icon-180.png",
  "./games/gobak-sodor/assets/img/icon-192.png",
  "./games/gobak-sodor/assets/img/icon-256.png",
  "./games/gobak-sodor/assets/img/icon-32.png",
  "./games/gobak-sodor/assets/img/icon-48.png",
  "./games/gobak-sodor/assets/img/icon-512.png",
  "./games/gobak-sodor/assets/img/icon-96.png",
  "./games/gobak-sodor/assets/img/icon-maskable-512.png",
  "./games/gobak-sodor/assets/img/social-preview.png",
  "./games/gobak-sodor/css/game.css",
  "./games/gobak-sodor/css/style.css",
  "./games/gobak-sodor/culture.html",
  "./games/gobak-sodor/data/questions.json",
  "./games/gobak-sodor/game.html",
  "./games/gobak-sodor/index.html",
  "./games/gobak-sodor/js/accessibility.js",
  "./games/gobak-sodor/js/app.js",
  "./games/gobak-sodor/js/audio.js",
  "./games/gobak-sodor/js/culture.js",
  "./games/gobak-sodor/js/difficulty.js",
  "./games/gobak-sodor/js/effects.js",
  "./games/gobak-sodor/js/enemy.js",
  "./games/gobak-sodor/js/game.js",
  "./games/gobak-sodor/js/gamification.js",
  "./games/gobak-sodor/js/leaderboard.js",
  "./games/gobak-sodor/js/map.js",
  "./games/gobak-sodor/js/player.js",
  "./games/gobak-sodor/js/quiz.js",
  "./games/gobak-sodor/js/teacher.js",
  "./games/gobak-sodor/leaderboard.html",
  "./games/gobak-sodor/offline.html",
  "./games/gobak-sodor/teacher.html",
  "./games/gobak-sodor/tutorial.html",
  "./games/jelajah-nusantara/data/questions.json",
  "./games/jelajah-nusantara/index.html",
  "./games/jelajah-nusantara/js/game.js",
  "./index.html",
  "./leaderboard.html",
  "./manifest.json",
  "./offline.html",
  "./profile.html",
  "./question-editor.html",
  "./service-worker.js",
  "./setup.html",
  "./shared/assets/icons/icon-144.png",
  "./shared/assets/icons/icon-180.png",
  "./shared/assets/icons/icon-192.png",
  "./shared/assets/icons/icon-256.png",
  "./shared/assets/icons/icon-32.png",
  "./shared/assets/icons/icon-48.png",
  "./shared/assets/icons/icon-512.png",
  "./shared/assets/icons/icon-96.png",
  "./shared/assets/icons/icon-maskable-512.png",
  "./shared/assets/social-preview.png",
  "./shared/css/dashboard.css",
  "./shared/css/game-bridge.css",
  "./shared/css/portal.css",
  "./shared/js/admin.js",
  "./shared/js/auth-page.js",
  "./shared/js/auth.js",
  "./shared/js/dashboard-common.js",
  "./shared/js/dashboard.js",
  "./shared/js/demo-backend.js",
  "./shared/js/error-page.js",
  "./shared/js/game-sync.js",
  "./shared/js/games.js",
  "./shared/js/leaderboard.js",
  "./shared/js/portal.js",
  "./shared/js/profile.js",
  "./shared/js/question-editor.js",
  "./shared/js/runtime-status.js",
  "./shared/js/setup.js",
  "./shared/js/store.js",
  "./shared/js/student.js",
  "./shared/js/supabase-api.js",
  "./shared/js/sync-queue.js",
  "./shared/js/teacher-dashboard.js",
  "./student.html",
  "./teacher.html",
  "./tutorial.html",
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
      .filter(key => key !== CACHE_NAME && (key.startsWith("ppn-") || key.startsWith("gsn-")))
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

  if (url.pathname.endsWith("/config/supabase-config.js")) {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request, { cache: "no-store" });
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(event.request)) || Response.error();
      }
    })());
    return;
  }

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
