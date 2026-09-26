const CACHE = "motodc-shell-v11";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin) return;

  // For page navigations & HTML, ALWAYS fetch live from network first so app updates are instant.
  if (e.request.mode === "navigate" || e.request.destination === "document" || u.pathname === "/" || u.pathname.endsWith(".html")) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // For static assets, network-first with cache fallback
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});