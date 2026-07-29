const CACHE_NAME = "dpms-v4";
const STATIC_ASSETS = [
  "/manifest.json",
  "/logo-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("/api/") || event.request.url.includes("/socket.io/")) return;

  const url = new URL(event.request.url);

  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request));
    return;
  }

  if (url.pathname === "/config.js") {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) {
        return cached;
      }

      try {
        const response = await fetch(event.request);
        const isStaticAsset = ["style", "script", "image", "font", "manifest"].includes(event.request.destination);

        if (response.ok && url.origin === self.location.origin && isStaticAsset) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }

        return response;
      } catch (err) {
        if (event.request.mode === "navigate") {
          const fallback = await caches.match("/");
          if (fallback) return fallback;
        }
        return new Response("Network error", { status: 503, statusText: "Service Unavailable" });
      }
    })
  );
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || "DPMS", {
      body: data.body || "",
      icon: "/logo-icon.png",
    })
  );
});
