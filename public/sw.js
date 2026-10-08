const CACHE = "motodc-shell-v18";
const IMAGE_CACHE = "motodc-images-v18";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE && k !== IMAGE_CACHE) {
            return caches.delete(k);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);
  if (u.origin !== self.location.origin) return;

  // 1. For HTML/Document navigation, network-first to ensure live app updates
  if (e.request.mode === "navigate" || e.request.destination === "document" || u.pathname === "/" || u.pathname.endsWith(".html")) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // 2. For Product Images & Static Assets: CACHE-FIRST for lightning fast 0ms loads
  const isImage = u.pathname.startsWith("/images/") ||
                  u.pathname.startsWith("/brands/") ||
                  u.pathname.startsWith("/products/") ||
                  /\.(jpe?g|png|webp|svg|gif|ico)(\?.*)?$/i.test(u.pathname);

  if (isImage) {
    e.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(e.request).then((cached) => {
          if (cached) return cached;
          return fetch(e.request).then((res) => {
            if (res.ok && res.status === 200) {
              cache.put(e.request, res.clone());
            }
            return res;
          });
        })
      )
    );
    return;
  }

  // 3. For scripts and styles: Cache with network fallback
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res.ok && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      });
    })
  );
});