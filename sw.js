// /sw.js
// SecurePass PWA Service Worker
// Minimal installability & offline fallback support

const CACHE_NAME = "securepass-cache-v1";

// Файлове, които кешираме за offline shell
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/style/style.css",
  "/js/script.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png"
];

// Install event — кеширане на shell ресурси
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate event — премахване на стари кешове
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// Fetch event — network-first fallback to offline cache
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
