/**
 * Service worker for My Investment: installable app + read-only offline use.
 *
 * What it does
 *   - Caches the app's static files (hashed JS/CSS/fonts/icons) so the app
 *     opens quickly and works without a network.
 *   - Keeps a copy of each signed-in page you open (network first). Offline,
 *     or on a very slow network, it shows the last copy, labelled with the
 *     time it was saved. Pages you never opened show /offline.
 *   - Never touches API routes, auth routes, Server Actions (POST) or Next.js
 *     client-navigation requests; those always go to the network.
 *
 * Privacy (these pages contain financial data)
 *   - Only pages the server tagged with `x-app-user` are stored, and a stored
 *     page is shown only to that same user (the last user the worker saw).
 *   - Signing out clears every stored page (see SignOutButton), and a
 *     different user signing in on the same device purges the old user's pages.
 */

const VERSION = "v1";
const STATIC_CACHE = `static-${VERSION}`;
const PAGES_CACHE = `pages-${VERSION}`;
const META_CACHE = `meta-${VERSION}`;
const KNOWN_CACHES = [STATIC_CACHE, PAGES_CACHE, META_CACHE];

const OFFLINE_URL = "/offline";
const USER_HEADER = "x-app-user";
const CACHED_AT_HEADER = "x-cached-at";
const LAST_USER_KEY = "/__last-user";

const PRECACHE = [OFFLINE_URL, "/manifest.webmanifest", "/logo.svg", "/icons/icon-192.png", "/icons/icon-512.png"];
const MAX_PAGES = 40;
const MAX_STATIC = 300;
/** On a slow network, show the saved copy after this long. */
const NETWORK_TIMEOUT_MS = 6000;
/** Query parameters that only open a modal; offline we fall back to the plain page. */
const MODAL_PARAMS = ["new", "edit", "price"];

// ---------------------------------------------------------------- lifecycle

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE);
      // The offline page needs its CSS/JS to look right with no network.
      const offline = await cache.match(OFFLINE_URL);
      if (offline) await cacheAssetsReferencedBy(await offline.text());
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => !KNOWN_CACHES.includes(name)).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SET_USER" && typeof data.userId === "string") {
    event.waitUntil(setUser(data.userId));
  } else if (data.type === "CLEAR_USER_DATA") {
    event.waitUntil(clearUserData());
  }
});

// -------------------------------------------------------------------- fetch

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;
  // Next.js client-side navigation and prefetch: if these fail, Next falls
  // back to a full page load, which this worker then handles.
  if (request.headers.has("RSC") || request.headers.has("Next-Router-Prefetch") || url.searchParams.has("_rsc")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else if (isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event));
  } else if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
  }
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/_next/image") ||
    ["/logo.svg", "/icon.svg", "/apple-icon.png", "/favicon.ico", "/manifest.webmanifest"].includes(pathname)
  );
}

// ------------------------------------------------------------ static assets

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
    await trim(cache, MAX_STATIC);
  }
  return response;
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(event.request);
  const refresh = fetch(event.request)
    .then(async (response) => {
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    })
    .catch(() => null);
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  return (await refresh) || Response.error();
}

/** Cache the /_next/static files a page's HTML refers to (best effort). */
async function cacheAssetsReferencedBy(html) {
  const cache = await caches.open(STATIC_CACHE);
  const urls = new Set();
  for (const match of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)) urls.add(match[1]);
  await Promise.all(
    [...urls].map(async (url) => {
      try {
        if (await cache.match(url)) return;
        const response = await fetch(url);
        if (response.ok) await cache.put(url, response);
      } catch {
        // Offline or a bad URL: it will be cached when first used.
      }
    }),
  );
  await trim(cache, MAX_STATIC);
}

// ----------------------------------------------------------------- navigation

async function handleNavigation(event) {
  const { request } = event;
  const network = fetch(request);
  const timer = new Promise((resolve) => setTimeout(() => resolve(null), NETWORK_TIMEOUT_MS));

  try {
    const first = await Promise.race([network, timer]);
    if (first) return remember(event, first);

    // Slow network: show the saved copy now if there is one, and still let the
    // network request finish so the copy is refreshed for next time.
    const saved = await savedPage(request);
    if (saved) {
      network.then((response) => remember(event, response)).catch(() => {});
      return saved;
    }
    return remember(event, await network);
  } catch {
    network.catch(() => {}); // already handled above; avoid an unhandled rejection
    return (await savedPage(request)) || offlineFallback();
  }
}

/** Store signed-in HTML pages for offline use; pass every response through unchanged. */
function remember(event, response) {
  const isRedirect = response.type === "opaqueredirect" || (response.status >= 300 && response.status < 400);
  const userId = response.headers.get(USER_HEADER);
  const isHtml = (response.headers.get("content-type") || "").includes("text/html");
  if (!isRedirect && response.ok && userId && isHtml) {
    event.waitUntil(storePage(event.request.url, response.clone(), userId));
  }
  return response;
}

async function storePage(url, response, userId) {
  await setUser(userId);
  const html = await response.text();

  // Rebuild the headers: the body is already decoded, so encoding/length/vary
  // headers from the network would be wrong for the stored copy.
  const headers = new Headers({ "content-type": "text/html; charset=utf-8" });
  headers.set(USER_HEADER, userId);
  headers.set(CACHED_AT_HEADER, String(Date.now()));

  const cache = await caches.open(PAGES_CACHE);
  await cache.put(url, new Response(html, { status: 200, headers }));
  await trim(cache, MAX_PAGES);
  await cacheAssetsReferencedBy(html);
}

/** The saved copy for this URL (or the page without modal parameters), if it belongs to the current user. */
async function savedPage(request) {
  const url = new URL(request.url);
  const plain = new URL(url);
  for (const name of MODAL_PARAMS) plain.searchParams.delete(name);

  const cache = await caches.open(PAGES_CACHE);
  const userId = await lastUser();
  if (!userId) return null;

  for (const candidate of [url.href, plain.href]) {
    const entry = await cache.match(candidate);
    if (entry && entry.headers.get(USER_HEADER) === userId) {
      const cachedAt = entry.headers.get(CACHED_AT_HEADER) || "";
      // Label the page so it can say how old its data is.
      const html = (await entry.text()).replace(/<head[^>]*>/, (tag) => `${tag}<meta name="sw-cached-at" content="${cachedAt}">`);
      return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
    }
  }
  return null;
}

async function offlineFallback() {
  const cache = await caches.open(STATIC_CACHE);
  return (await cache.match(OFFLINE_URL)) || new Response("Offline", { status: 503, headers: { "content-type": "text/plain" } });
}

// ------------------------------------------------------------------- privacy

async function lastUser() {
  const meta = await caches.open(META_CACHE);
  const entry = await meta.match(LAST_USER_KEY);
  return entry ? entry.text() : null;
}

/** Remember who is signed in; when it changes, drop everyone else's saved pages. */
async function setUser(userId) {
  if ((await lastUser()) === userId) return;

  const pages = await caches.open(PAGES_CACHE);
  for (const request of await pages.keys()) {
    const entry = await pages.match(request);
    if (!entry || entry.headers.get(USER_HEADER) !== userId) await pages.delete(request);
  }
  const meta = await caches.open(META_CACHE);
  await meta.put(LAST_USER_KEY, new Response(userId));
}

async function clearUserData() {
  await caches.delete(PAGES_CACHE);
  await caches.delete(META_CACHE);
}

// ------------------------------------------------------------------- helpers

/** Keep a cache to at most `max` entries, dropping the oldest. */
async function trim(cache, max) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(key);
}
