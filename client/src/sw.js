// client/src/sw.js
// Manual Service Worker — no Workbox dependency.
// Strategies:
//   • App shell / static assets  → Cache-First (precached on install)
//   • /api/categories            → Stale-While-Revalidate (30 min)
//   • Images (themealdb CDN)     → Stale-While-Revalidate (7 days)
//   • /api/meal/:id & /api/search → Network-First with cache fallback (5 min)
//   • Navigation requests        → Network-First → index.html → offline.html

// ---------------------------------------------------------------------------
// Version — bump this string whenever you deploy new static assets so the
// old caches are evicted and the new shell is precached.
// ---------------------------------------------------------------------------
const CACHE_VERSION = "v1";
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

// Files to precache on install (app shell).
// Keep this list in sync with the files Vite emits.
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ---------------------------------------------------------------------------
// INSTALL — precache the app shell
// ---------------------------------------------------------------------------
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      console.log("[SW] Precaching app shell");
      return cache.addAll(PRECACHE_URLS);
    })
  );
  // Activate immediately without waiting for old tabs to close
  self.skipWaiting();
});

// ---------------------------------------------------------------------------
// ACTIVATE — clean up old caches from previous versions
// ---------------------------------------------------------------------------
self.addEventListener("activate", (event) => {
  const knownCaches = [SHELL_CACHE, RUNTIME_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => !knownCaches.includes(name))
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      )
    )
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Network-First strategy: try network, on failure return cache.
 * On a successful network response, update the cache.
 * @param {Request} request
 * @param {string}  cacheName
 * @returns {Promise<Response>}
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const networkResponse = await fetch(request.clone());
    if (networkResponse.ok) {
      // Clone before consuming — a Response body can only be read once
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

/**
 * Stale-While-Revalidate strategy: immediately return cached response (if
 * any), then fetch a fresh copy in the background to update the cache.
 * @param {Request} request
 * @param {string}  cacheName
 * @returns {Promise<Response>}
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Kick off a background revalidation regardless
  const revalidation = fetch(request.clone())
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      /* ignore background errors */
    });

  // Return stale immediately if available; otherwise wait for network
  return cached ?? revalidation;
}

// ---------------------------------------------------------------------------
// FETCH — route requests to the appropriate strategy
// ---------------------------------------------------------------------------
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") return;

  // ── 1. TheMealDB CDN images ──────────────────────────────────────────────
  if (
    url.hostname.includes("themealdb.com") &&
    url.pathname.startsWith("/images")
  ) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // ── 2. Categories API — stable, Stale-While-Revalidate ──────────────────
  if (url.pathname === "/api/categories") {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // ── 3. Filter by category — Stale-While-Revalidate ──────────────────────
  if (url.pathname === "/api/filter") {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // ── 4. Meal detail & search — Network-First ──────────────────────────────
  if (url.pathname.startsWith("/api/meal") || url.pathname === "/api/search") {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // ── 5. Other API calls — Network-First ───────────────────────────────────
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // ── 6. App-shell static assets (JS, CSS, fonts, icons) ───────────────────
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

  // ── 7. HTML navigation requests — Network-First → index.html → offline.html
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          return networkResponse;
        } catch {
          // Try the shell cache for index.html
          const cached = await caches.match("/index.html", {
            cacheName: SHELL_CACHE,
          });
          if (cached) return cached;
          // Final fallback: offline page
          return caches.match("/offline.html", { cacheName: SHELL_CACHE });
        }
      })()
    );
    return;
  }
});

// ---------------------------------------------------------------------------
// MESSAGE — handle manual cache-clearing from the app
// ---------------------------------------------------------------------------
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
