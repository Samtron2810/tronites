// Silences workbox's verbose "Router is responding to..." console logs
// in dev builds; production builds already have logging stripped.
self.__WB_DISABLE_DEV_LOGS = true;

import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute, NavigationRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

// --- App shell precache ---------------------------------------------
// self.__WB_MANIFEST is replaced at build time by vite-plugin-pwa's
// injectManifest with the list of built assets (JS/CSS/HTML/icons) —
// this is what makes a cold, offline open of the app still render the
// shell instead of a browser error page.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// SPA navigation fallback: any non-API navigation that isn't already
// precached (deep link, refresh on a client-side route) resolves to the
// precached index.html instead of a network 404 when offline.
registerRoute(
  new NavigationRoute(
    async ({ event }) => {
      try {
        return await self.caches.match("/index.html") || fetch(event.request);
      } catch {
        return self.caches.match("/index.html");
      }
    },
    { denylist: [/^\/api\//] },
  ),
);

// --- Auth: NetworkFirst -----------------------------------------------
// Caches the /auth/me response so an offline reopen can confirm the
// user is (was) logged in without hitting the network. Without this,
// AuthContext.getMe() fails with a network error, user is set to null,
// and the app redirects to /login even though the session cookies are
// still valid and will work again once the network returns.
// NetworkFirst: always tries the network first (1.5s timeout to avoid
// blocking cold starts on a slow connection), falls back to the last
// cached response — the cached payload is stale by definition but only
// used to keep the UI authenticated while offline; the React-side
// AuthContext does a fresh validation whenever connectivity returns.
registerRoute(
  ({ url, request }) =>
    request.method === "GET" && url.pathname === "/api/auth/me",
  new NetworkFirst({
    cacheName: "tronites-auth-cache",
    networkTimeoutSeconds: 4,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      // Keep only the most recent /me response; 7-day max so a stale
      // entry doesn't linger after a genuine logout on another device.
      new ExpirationPlugin({ maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 * 7 }),
    ],
  }),
);

// --- Feed: NetworkFirst -----------------------------------------------
// Fresh posts win when online; falls back to the last cached page when
// offline or the network is slow (4s timeout keeps the UI from hanging
// on a bad connection). Only GETs — mutating calls (like/comment/post)
// are never intercepted here, so they always hit the network and fail
// loudly (existing axios error handling) rather than appearing to
// "succeed" against a cache.
registerRoute(
  ({ url, request }) =>
    request.method === "GET" &&
    (url.pathname.startsWith("/api/posts/feed") ||
      url.pathname.startsWith("/api/posts/for-you") ||
      url.pathname.startsWith("/api/posts/trending-hashtags")),
  new NetworkFirst({
    cacheName: "tronites-feed-cache",
    networkTimeoutSeconds: 4,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 }),
    ],
  }),
);

// --- Cloudinary media: CacheFirst --------------------------------------
// Cloudinary URLs are content-addressed (an edit produces a new URL), so
// a long-lived cache is safe and saves real bandwidth on repeat views —
// this is what makes previously-seen images/video posters load instantly
// offline instead of showing a broken-image icon.
registerRoute(
  ({ url }) => url.hostname === "res.cloudinary.com",
  new CacheFirst({
    cacheName: "tronites-media-cache",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 60 * 24 * 14,
      }),
    ],
  }),
);

// --- Google Fonts: CacheFirst -------------------------------------------
registerRoute(
  ({ url }) =>
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com",
  new CacheFirst({
    cacheName: "tronites-fonts-cache",
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 }),
    ],
  }),
);

// --- Update lifecycle ---------------------------------------------------
// Stays "waiting" until the app explicitly tells it to activate (see
// src/services/pwaUpdate.js) — a feed/chat app shouldn't swap code out
// from under someone mid-scroll or mid-compose without them choosing to
// reload.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// --- Web Push -------------------------------------------------------------
// Payload shape is set by services/pushService.js on the backend:
// { title, body, icon, badge, tag, data: { url, ... } }
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Tronites", body: event.data.text() };
  }

  const { title, body, icon, badge, tag, data } = payload;

  event.waitUntil(
    self.registration.showNotification(title || "Tronites", {
      body,
      icon: icon || "/pwa-192.png",
      badge: badge || "/pwa-192.png",
      tag, // same tag replaces an existing unread notification of the
           // same kind instead of stacking duplicates (e.g. repeated
           // likes on one post)
      data,
      renotify: Boolean(tag),
    }),
  );
});

// Focuses an already-open tab on the target URL if one exists, otherwise
// opens a new one — standard "notification click" behavior so tapping a
// push doesn't spawn a duplicate tab when the app is already open.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of allClients) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin) {
          client.focus();
          client.postMessage({ type: "NAVIGATE", url: targetUrl });
          return;
        }
      }

      await self.clients.openWindow(targetUrl);
    })(),
  );
});
