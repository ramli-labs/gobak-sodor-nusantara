/* Gobak Sodor Nusantara — Service Worker Tahap 5. */
const VERSION = "gsn-v5.0.0";
const APP_CACHE = `${VERSION}-app`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const OFFLINE_PAGE = "offline.html";

const APP_SHELL = [
  "./",
  "index.html",
  "game.html",
  "culture.html",
  "tutorial.html",
  "leaderboard.html",
  "teacher.html",
  OFFLINE_PAGE,
  "manifest.json",
  "css/style.css",
  "css/game.css",
  "js/app.js",
  "js/audio.js",
  "js/effects.js",
  "js/game.js",
  "js/player.js",
  "js/enemy.js",
  "js/quiz.js",
  "js/leaderboard.js",
  "js/culture.js",
  "js/map.js",
  "js/teacher.js",
  "js/accessibility.js",
  "js/gamification.js",
  "data/questions.json",
  "assets/img/icon-32.png",
  "assets/img/icon-48.png",
  "assets/img/icon-96.png",
  "assets/img/icon-144.png",
  "assets/img/icon-180.png",
  "assets/img/icon-192.png",
  "assets/img/icon-256.png",
  "assets/img/icon-512.png",
  "assets/img/icon-maskable-512.png",
  "assets/img/social-preview.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => ![APP_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request)) || (await caches.match(OFFLINE_PAGE));
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request).then(async (response) => {
    if (response && (response.ok || response.type === "opaque")) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  return cached || network || Response.error();
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && (response.ok || response.type === "opaque")) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith("questions.json")) event.respondWith(staleWhileRevalidate(request));
    else event.respondWith(cacheFirst(request));
    return;
  }

  if (["fonts.googleapis.com", "fonts.gstatic.com", "cdnjs.cloudflare.com"].includes(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
