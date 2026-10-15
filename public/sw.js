/* University Manager service worker.
 * Goal: the app opens and works with no internet. Academic DATA lives in
 * IndexedDB (Dexie); this worker only keeps the app itself available.
 *  - /_next/static/*  cache-first (hashed, immutable)
 *  - page navigations network-first, falling back to the last cached copy,
 *    then to /offline.html
 *  - /api/*, /auth/* and other origins (Supabase, R2) are never touched
 */
const VERSION = "um-v4";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const PRECACHE = ["/offline.html", "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "CLEAR_CACHES") {
    // Called on sign-out so cached pages never outlive the session.
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.endsWith("-pages")).map((k) => caches.delete(k)))));
  }
   if (data.type === "WARM" && Array.isArray(data.urls)) {
    // Pre-fetch the main screens once after login AND the scripts/styles each
    // page needs, so the pages become interactive offline, not just visible.
    event.waitUntil(
      (async () => {
        const pages = await caches.open(PAGE_CACHE);
        const statics = await caches.open(STATIC_CACHE);
        const assets = new Set();
        for (const url of data.urls) {
          try {
            const res = await fetch(url, { credentials: "include" });
            if (!res.ok || res.redirected) continue;
            const html = await res.clone().text();
            await pages.put(url, res);
            for (const m of html.match(/\/_next\/static\/[^"'\\\s)<>]+/g) || []) assets.add(m);
          } catch {
            /* ignore one page */
          }
        }
        await Promise.all(
          [...assets].map(async (asset) => {
            try {
              if (await statics.match(asset)) return;
              const r = await fetch(asset);
              if (r.ok) await statics.put(asset, r);
            } catch {
              /* ignore one asset */
            }
          })
        );
      })()
    );
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;
  // Next.js client-side navigation payloads: let them fail so Next falls back
  // to a normal navigation, which we handle below.
  if (req.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGE_CACHE);
        try {
          const res = await fetch(req);
          if (res.ok && !res.redirected && res.type === "basic") cache.put(url.pathname, res.clone());
          return res;
        } catch {
          const cached = (await cache.match(url.pathname)) || (await caches.match(url.pathname));
          if (cached) return cached;
          return (await caches.match("/offline.html")) || Response.error();
        }
      })()
    );
    return;
  }

  if (/\.(png|jpg|jpeg|svg|webp|ico|woff2?)$/i.test(url.pathname) || url.pathname === "/manifest.json") {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || network;
      })
    );
  }
});

// Tapping a reminder opens (or focuses) the app on the right screen.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          if ("navigate" in client) client.navigate(url).catch(() => undefined);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
