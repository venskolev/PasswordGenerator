// Файл: /sw.js
// SecurePass PWA Service Worker (safe cache install)
// - Не чупи инсталацията ако някой asset липсва
// - Cache-first за статични GET заявки от същия origin

const CACHE_VERSION = "v1.0.0";
const CACHE_NAME = `securepass-cache-${CACHE_VERSION}`;

// Слагай тук само реални, съществуващи файлове в ROOT сайта
// Ако нещо го няма още (напр. икони), по-добре го махни временно.
const ASSET_URLS = [
  "/",                 // start page
  "/index.html",
  "/style/style.css",
  "/js/script.js",
  "/manifest.json",
  // "/icons/icon-192.png",
  // "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    self.skipWaiting();

    const cache = await caches.open(CACHE_NAME);

    // Кеширай внимателно, без addAll
    await Promise.allSettled(
      ASSET_URLS.map(async (url) => {
        try {
          const req = new Request(url, { cache: "reload" });
          const res = await fetch(req);

          // Кешираме само успешни same-origin отговори
          if (res && res.ok) {
            await cache.put(req, res.clone());
          } else {
            // Ако е 404/redirect — пропускаме
            console.warn("[SW] Skip caching (not ok):", url, res.status);
          }
        } catch (err) {
          // Ако fetch падне — пропускаме, но не чупим SW
          console.warn("[SW] Skip caching (fetch failed):", url, err);
        }
      })
    );
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Чистим стари кешове
    const keys = await caches.keys();
    await Promise.all(
      keys.map((key) => {
        if (key.startsWith("securepass-cache-") && key !== CACHE_NAME) {
          return caches.delete(key);
        }
      })
    );

    await clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Кешираме само GET
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Само same-origin
  if (url.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    // 1) пробваме кеш
    const cached = await cache.match(request);
    if (cached) return cached;

    // 2) иначе мрежа + запис
    try {
      const fresh = await fetch(request);
      if (fresh && fresh.ok) {
        cache.put(request, fresh.clone());
      }
      return fresh;
    } catch (err) {
      // 3) ако мрежата падне и нямаме кеш — fallback към /
      const fallback = await cache.match("/");
      if (fallback) return fallback;
      throw err;
    }
  })());
});
