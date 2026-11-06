/**
 * @file sw.js
 * @description Enterprise Service Worker implementing Reliance 'Zero-Reinstall' PWA Architecture.
 *
 * Operational Principles:
 * 1. Background Cache Invalidation:
 *    - Updates assets silently in the background when a new deployment is published.
 *    - Outdated caches are purged on the 'activate' lifecycle event without interrupting active clients.
 * 2. Active Session Protection (Zero-Force Reload):
 *    - Does NOT invoke aggressive automatic hard-reloads (`window.location.reload()`) mid-session.
 *    - In-flight transactions, billing sheets, and field manifests remain completely protected.
 * 3. Graceful Next-Session Upgrade:
 *    - New worker activates cleanly upon subsequent natural user navigation or session launch.
 *    - Supports manual trigger via postMessage({ type: 'SKIP_WAITING' }) when safe.
 */

const CACHE_NAME = 'lhdd-pwa-v1.1.0';

// Essential static application shell resources for offline resilience
const STATIC_PRECACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/logo.jpg',
  '/inv_logo.png',
];

/**
 * Service Worker Installation Phase
 * Precaches core shell assets in the background without forcing immediate client takeover.
 */
self.addEventListener('install', (event) => {
  // Precache static assets in the background
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE_URLS).catch((err) => {
        // Non-blocking catch to allow installation even if one asset fails
        console.warn('[Service Worker] Non-fatal precache warning:', err);
      });
    })
  );
  // Intentionally avoid self.skipWaiting() here to prevent tearing active in-flight forms
});

/**
 * Service Worker Activation Phase
 * Cleans up stale/previous version caches in the background.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name.startsWith('lhdd-pwa-'))
          .map((name) => {
            console.log('[Service Worker] Purging stale background cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Reliance 'Zero-Reinstall': Do NOT call self.clients.claim() immediately,
  // allowing existing open tabs to complete their billing session safely.
});

/**
 * Service Worker Message Listener
 * Allows application client to signal safe activation once in-flight tasks finish.
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * Service Worker Fetch Interception
 * Network-first for API routes, Stale-While-Revalidate for static assets.
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never cache non-GET requests or backend REST API endpoints
  if (request.method !== 'GET' || url.pathname.startsWith('/api/')) {
    return;
  }

  // 2. Static Assets & App Shell: Stale-While-Revalidate strategy
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request);

      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          // If valid response, update cache in background
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return cachedResponse;
        });

      // Return cached version immediately if available, or await network
      return cachedResponse || fetchPromise;
    })
  );
});

