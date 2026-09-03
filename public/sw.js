/**
 * Service worker for the PDC admin app (/app).
 *
 * Registered at the origin root because a worker can only control pages at or
 * below its own path, and /app is a client-side route with no physical file to
 * host a worker next to. Root registration is therefore about *reach*, not
 * intent: everything outside /app is deliberately passed through untouched
 * (no respondWith call at all), so the prerendered marketing pages keep being
 * served exactly as the network delivers them and can never go stale behind a
 * cache the visitor has no way to clear.
 *
 * Caching strategy:
 *   /app navigations  — network-first, falling back to the cached shell, so a
 *                       cold launch from the home screen works on the metro.
 *   build assets      — stale-while-revalidate (content-hashed, safe to reuse).
 *   Supabase / API    — never cached; admin data must not be served stale.
 */

const VERSION = "pdc-admin-v1";
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;

// The SPA entry. Every /app route resolves to this document, so caching it once
// is enough to boot the whole app offline.
const SHELL_URL = "/index.html";

const PRECACHE = [SHELL_URL, "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

/** Content-hashed build output and static icons — safe to reuse immediately. */
function isCacheableAsset(url) {
  return (
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/assets/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname === "/manifest.webmanifest")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // App navigations: try the network so a fresh deploy lands immediately, and
  // fall back to the cached shell when there is nothing to reach.
  if (request.mode === "navigate" && url.origin === self.location.origin) {
    if (!url.pathname.startsWith("/app")) return; // public site: hands off
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(SHELL_URL, copy));
          return response;
        })
        .catch(() =>
          caches.match(SHELL_URL).then(
            (cached) =>
              cached ||
              new Response(
                "<!doctype html><meta charset=utf-8><title>Offline</title>" +
                  "<body style='background:#080401;color:#fffbe0;font:14px Inter,sans-serif;" +
                  "display:grid;place-items:center;height:100vh;margin:0'>Offline</body>",
                { headers: { "Content-Type": "text/html; charset=utf-8" } }
              )
          )
        )
    );
    return;
  }

  if (!isCacheableAsset(url)) return; // Supabase, fonts, marketing assets: untouched

  event.respondWith(
    caches.open(ASSET_CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

// Lets the app trigger an immediate update when it detects a new worker.
self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});
