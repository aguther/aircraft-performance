const CACHE_NAME = "g115b-performance-v15";
const APP_SHELL = [
  "./",
  "./index.html",
  "./takeoff.html",
  "./landing.html",
  "./weight_balance.html",
  "./cruise.html",
  "./climb.html",
  "./climb_rate.html",
  "./range.html",
  "./endurance.html",
  "./stall.html",
  "./manifest.webmanifest",
  "./app.js",
  "./css/theme.css",
  "./css/index.css",
  "./css/calculator.css",
  "./js/g115b-core.js",
  "./js/g115b-ui.js",
  "./js/g115b-calculators.js",
  "./js/performance-data.js",
  "./js/pages/takeoff-page.js",
  "./js/pages/landing-page.js",
  "./js/pages/weight-balance-page.js",
  "./js/pages/cruise-page.js",
  "./js/pages/climb-page.js",
  "./js/pages/climb-rate-page.js",
  "./js/pages/range-page.js",
  "./js/pages/endurance-page.js",
  "./js/pages/stall-page.js",
  "./icons/icon-192-v2.png",
  "./icons/icon-512-v2.png",
  "./icons/apple-touch-icon-v2.png",
  "./icons/favicon-32-v2.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          return (await caches.match(request)) || caches.match("./index.html");
        })
    );
    return;
  }

  if (request.destination === "style" || request.destination === "script") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === "opaque") {
            return response;
          }

          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") {
          return response;
        }

        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      });
    })
  );
});
