// client/public/sw.js
// Service worker for Recipes PWA.
// Caching strategy overview:
//   shell-v2          : precached app shell (HTML, manifest, icons) — cache-first
//   runtime-v2        : API responses (categories, filter, meal detail) — network-first with cache fallback
//   images-v2         : ALL meal thumbnails — cache-first so images work offline
//   favorites-v2      : images + API detail for explicitly favorited meals — never evicted automatically

const CACHE_VERSION = "v2";
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;
const FAVORITES_CACHE = `favorites-${CACHE_VERSION}`;

const ALL_CACHES = [SHELL_CACHE, RUNTIME_CACHE, IMAGE_CACHE, FAVORITES_CACHE];

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── Lifecycle ─────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      console.log("[SW] Precaching app shell");
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => !ALL_CACHES.includes(name))
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      )
    )
  );
  self.clients.claim();
});

// ── Caching strategies ────────────────────────────────────────────────────────

/** Network first → fall back to cache. Used for API calls. */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request.clone());
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw new Error(
      "[SW] Network-First: offline and no cache for " + request.url
    );
  }
}

/** Cache first → fall back to network and populate cache. Used for images. */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    // Use no-cors for cross-origin image CDNs so we get an opaque response
    // (status === 0) rather than a CORS error. Opaque responses are safe to
    // cache for images — the browser will render them even though we can't
    // inspect the headers.
    const isCrossOrigin = new URL(request.url).origin !== self.location.origin;
    const fetchRequest = isCrossOrigin
      ? new Request(request.url, { mode: "no-cors" })
      : request.clone();
    const networkResponse = await fetch(fetchRequest);
    // status 0 = opaque (no-cors) response — safe to cache for images
    if (networkResponse.ok || networkResponse.status === 0) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response("", { status: 503, statusText: "Offline" });
  }
}

/** Stale-while-revalidate. Used for category list and filter results. */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const revalidation = fetch(request.clone())
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {});

  return cached ?? revalidation;
}

// ── Fetch handler ─────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;

  // Meal thumbnail images from TheMealDB CDN — cache-first so they work offline
  if (
    url.hostname.includes("themealdb.com") &&
    url.pathname.startsWith("/images")
  ) {
    // Check favorites cache first (never evicted), then general image cache
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return cacheFirst(request, IMAGE_CACHE);
      })
    );
    return;
  }

  // Category list — changes rarely, SWR is fine
  if (url.pathname === "/api/categories") {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // Category filter results — SWR so grid loads instantly on revisit
  if (url.pathname === "/api/filter") {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // Individual meal detail — network-first so data stays fresh, cached for offline
  if (url.pathname.startsWith("/api/meal/")) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // Search and other API calls — network-first
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // Static assets (JS/CSS bundles, fonts, local images)
  if (
    request.destination === "script" ||
    request.destination === "style" ||
    request.destination === "font" ||
    request.destination === "image" ||
    url.pathname.startsWith("/assets/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request))
    );
    return;
  }

  // Navigation requests — serve app shell or offline page
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cached = await caches.match("/index.html", {
            cacheName: SHELL_CACHE,
          });
          if (cached) return cached;
          return caches.match("/offline.html", { cacheName: SHELL_CACHE });
        }
      })()
    );
    return;
  }
});

// ── Message handler ───────────────────────────────────────────────────────────
//
// The app posts messages to the SW to proactively cache resources:
//
//   { type: "CACHE_URLS", urls: string[], cacheName?: string }
//     → fetches each URL and stores it in the specified cache (default: IMAGE_CACHE)
//
//   { type: "CACHE_FAVORITE", imageUrl: string, apiUrl: string }
//     → stores the image in FAVORITES_CACHE and the API response in RUNTIME_CACHE
//       Favorites cache is intentionally separate so images are never evicted
//       even if the browser clears the general IMAGE_CACHE under storage pressure.
//
//   { type: "EVICT_FAVORITE", imageUrl: string, apiUrl: string }
//     → removes the entries from FAVORITES_CACHE when user un-favorites a meal
//
//   { type: "SKIP_WAITING" }
//     → activates a waiting SW immediately

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (data.type === "CACHE_URLS") {
    const cacheName = data.cacheName ?? IMAGE_CACHE;
    event.waitUntil(
      caches.open(cacheName).then((cache) =>
        Promise.allSettled(
          (data.urls ?? []).map(async (url) => {
            // Skip if already cached anywhere
            const existing = await caches.match(url);
            if (existing) return;
            try {
              const isCrossOrigin =
                new URL(url).origin !== self.location.origin;
              const req = isCrossOrigin
                ? new Request(url, { mode: "no-cors" })
                : new Request(url);
              const response = await fetch(req);
              if (response.ok || response.status === 0) {
                await cache.put(url, response);
              }
            } catch {
              // Offline — will be cached next time
            }
          })
        )
      )
    );
    return;
  }

  if (data.type === "CACHE_FAVORITE") {
    event.waitUntil(
      Promise.allSettled([
        // Image → FAVORITES_CACHE (persistent, never auto-evicted)
        caches.open(FAVORITES_CACHE).then(async (cache) => {
          const existing = await cache.match(data.imageUrl);
          if (existing) return;
          try {
            const isCrossOrigin =
              new URL(data.imageUrl).origin !== self.location.origin;
            const req = isCrossOrigin
              ? new Request(data.imageUrl, { mode: "no-cors" })
              : new Request(data.imageUrl);
            const res = await fetch(req);
            if (res.ok || res.status === 0) await cache.put(data.imageUrl, res);
          } catch {}
        }),
        // API detail → RUNTIME_CACHE (also written by networkFirst on detail page visit)
        caches.open(RUNTIME_CACHE).then(async (cache) => {
          const existing = await cache.match(data.apiUrl);
          if (existing) return;
          try {
            const res = await fetch(data.apiUrl);
            if (res.ok) await cache.put(data.apiUrl, res);
          } catch {}
        }),
      ])
    );
    return;
  }

  if (data.type === "EVICT_FAVORITE") {
    event.waitUntil(
      Promise.allSettled([
        caches
          .open(FAVORITES_CACHE)
          .then((cache) => cache.delete(data.imageUrl)),
        // Leave RUNTIME_CACHE entry — it will expire naturally or serve other pages
      ])
    );
    return;
  }
});
