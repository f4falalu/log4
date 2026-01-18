/**
 * serviceWorker.ts
 *
 * PWA Service Worker with Workbox
 * Handles tile caching, offline functionality, and background sync
 */

import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, Route } from 'workbox-routing';
import {
  StaleWhileRevalidate,
  NetworkFirst,
  CacheFirst,
  NetworkOnly,
} from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { tileCache } from './db';

declare const self: ServiceWorkerGlobalScope;

// Precache static assets (icons, sprites, etc.)
precacheAndRoute(self.__WB_MANIFEST);

// Cleanup old caches
cleanupOutdatedCaches();

/**
 * Cache Names
 */
const CACHE_NAMES = {
  TILES: 'map-tiles-v1',
  STATIC: 'static-assets-v1',
  TELEMETRY: 'telemetry-v1',
  RUNTIME: 'runtime-v1',
  MOD4: 'mod4-events-v1',
} as const;

/**
 * Strategy 1: Map Tiles - Stale While Revalidate
 * Serve from cache immediately, update in background
 */
registerRoute(
  // Match tile URLs (CARTO, OSM, etc.)
  ({ url }) => {
    return (
      url.hostname.includes('cartocdn.com') ||
      url.hostname.includes('tile.openstreetmap.org') ||
      url.pathname.includes('/tiles/') ||
      url.pathname.match(/\/\d+\/\d+\/\d+\.(png|jpg|pbf|mvt)$/)
    );
  },
  new StaleWhileRevalidate({
    cacheName: CACHE_NAMES.TILES,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200], // Cache successful responses
      }),
      new ExpirationPlugin({
        maxEntries: 500, // Limit tile cache size
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
        purgeOnQuotaError: true, // Auto-cleanup if quota exceeded
      }),
    ],
  })
);

/**
 * Custom tile caching with IndexedDB fallback
 * Stores tiles in IndexedDB for more granular control
 */
const tileRoute = new Route(
  ({ url }) => {
    return (
      url.hostname.includes('cartocdn.com') ||
      url.pathname.match(/\/\d+\/\d+\/\d+\.(png|jpg|pbf|mvt)$/)
    );
  },
  async ({ url, request }) => {
    const cacheKey = url.href;

    // Try IndexedDB first
    try {
      const cachedBlob = await tileCache.get(cacheKey);
      if (cachedBlob) {
        return new Response(cachedBlob, {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        });
      }
    } catch (error) {
      console.warn('[SW] IndexedDB tile fetch failed:', error);
    }

    // Fetch from network
    try {
      const response = await fetch(request);

      if (response.ok) {
        // Extract tile coordinates from URL
        const match = url.pathname.match(/\/(\d+)\/(\d+)\/(\d+)\.(png|jpg|pbf|mvt)$/);
        if (match) {
          const [, zoom, x, y] = match;
          const blob = await response.clone().blob();

          // Store in IndexedDB (non-blocking)
          tileCache
            .set(cacheKey, blob, parseInt(zoom, 10), parseInt(x, 10), parseInt(y, 10))
            .catch((err) => console.warn('[SW] Failed to cache tile:', err));
        }
      }

      return response;
    } catch (error) {
      // Network failed, return cached tile if available
      const cachedBlob = await tileCache.get(cacheKey);
      if (cachedBlob) {
        return new Response(cachedBlob, {
          status: 200,
          headers: { 'Content-Type': 'image/png' },
        });
      }

      throw error;
    }
  }
);

registerRoute(tileRoute);

/**
 * Strategy 2: Static Assets - Cache First
 * Icons, sprites, fonts, CSS, JS
 */
registerRoute(
  ({ request }) => {
    return (
      request.destination === 'image' ||
      request.destination === 'font' ||
      request.destination === 'style' ||
      request.destination === 'script'
    );
  },
  new CacheFirst({
    cacheName: CACHE_NAMES.STATIC,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
);

/**
 * Strategy 3: Real-Time Telemetry - Network First
 * Always try network, fallback to cache only if offline
 */
registerRoute(
  ({ url }) => {
    return (
      url.pathname.includes('/rest/v1/') &&
      (url.pathname.includes('vehicles') ||
        url.pathname.includes('drivers') ||
        url.pathname.includes('batches') ||
        url.pathname.includes('facilities') ||
        url.pathname.includes('warehouses'))
    );
  },
  new NetworkFirst({
    cacheName: CACHE_NAMES.TELEMETRY,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 minutes (telemetry data expires quickly)
      }),
    ],
    networkTimeoutSeconds: 3, // Fast fallback to cache if network slow
  })
);

/**
 * Strategy 4: Mutations - Network Only with Background Sync
 * Trade-off approvals, batch assignments, zone edits
 */
const bgSyncPlugin = new BackgroundSyncPlugin('mutation-queue', {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request);
        console.log('[SW] Background sync succeeded:', entry.request.url);
      } catch (error) {
        console.error('[SW] Background sync failed:', error);
        await queue.unshiftRequest(entry); // Put back in queue
        throw error;
      }
    }
  },
});

registerRoute(
  ({ request, url }) => {
    return (
      (request.method === 'POST' ||
        request.method === 'PUT' ||
        request.method === 'PATCH' ||
        request.method === 'DELETE') &&
      url.pathname.includes('/rest/v1/')
    );
  },
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'POST' // Specify method
);

/**
 * Strategy 5: Analytics - Network First with short cache
 */
registerRoute(
  ({ url }) => {
    return url.pathname.includes('/rpc/') && url.pathname.includes('analytics');
  },
  new NetworkFirst({
    cacheName: 'analytics-v1',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 60, // 1 minute (analytics should be fresh)
      }),
    ],
    networkTimeoutSeconds: 2,
  })
);

/**
 * Handle service worker installation
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  // Skip waiting to activate immediately
  event.waitUntil(self.skipWaiting());
});

/**
 * Handle service worker activation
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  // Claim all clients immediately
  event.waitUntil(self.clients.claim());

  // Cleanup old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Remove old versions
            return (
              cacheName.startsWith('map-tiles-') ||
              cacheName.startsWith('static-assets-') ||
              cacheName.startsWith('telemetry-') ||
              cacheName.startsWith('runtime-')
            ) && !Object.values(CACHE_NAMES).includes(cacheName as any);
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
});

/**
 * Handle messages from clients
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      })
    );
  }

  if (event.data && event.data.type === 'CACHE_TILES') {
    // Client requests to cache tiles for offline use
    const { tiles } = event.data;
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE_NAMES.TILES);
        for (const tileUrl of tiles) {
          try {
            await cache.add(tileUrl);
          } catch (error) {
            console.warn('[SW] Failed to cache tile:', tileUrl, error);
          }
        }
      })()
    );
  }
});

/**
 * Handle fetch events (fallback for unmatched routes)
 */
self.addEventListener('fetch', (event) => {
  // Let workbox routing handle matched routes
  // This is a fallback for anything not matched above

  if (event.request.method !== 'GET') {
    return; // Only cache GET requests
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        caches.open(CACHE_NAMES.RUNTIME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});

/**
 * Handle background sync events
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queued-actions') {
    event.waitUntil(
      (async () => {
        try {
          // Import action queue from IndexedDB
          const { actionQueue } = await import('./db');

          // Get all unsynced actions
          const unsyncedActions = await actionQueue.getUnsynced();

          console.log(`[SW] Syncing ${unsyncedActions.length} queued actions...`);

          for (const action of unsyncedActions) {
            try {
              // Attempt to sync action
              const response = await fetch('/api/sync-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(action),
              });

              if (response.ok) {
                await actionQueue.markSynced(action.id);
                console.log('[SW] Action synced:', action.id);
              } else {
                const error = await response.text();
                await actionQueue.markFailed(action.id, error);
                console.error('[SW] Action sync failed:', action.id, error);
              }
            } catch (error) {
              await actionQueue.markFailed(action.id, String(error));
              console.error('[SW] Action sync error:', action.id, error);
            }
          }

          console.log('[SW] Background sync complete');
        } catch (error) {
          console.error('[SW] Background sync failed:', error);
        }
      })()
    );
  }

  // Mod4 event sync
  if (event.tag === 'sync-mod4-events') {
    event.waitUntil(
      (async () => {
        try {
          console.log('[SW] Syncing Mod4 events...');

          // Open Mod4 IndexedDB
          const dbRequest = indexedDB.open('mod4_offline_db', 1);

          dbRequest.onsuccess = async () => {
            const db = dbRequest.result;

            // Get all pending events
            const tx = db.transaction('events', 'readonly');
            const store = tx.objectStore('events');
            const index = store.index('by-synced');
            const pendingRequest = index.getAll(false);

            pendingRequest.onsuccess = async () => {
              const pendingEvents = pendingRequest.result;
              console.log(`[SW] Found ${pendingEvents.length} pending Mod4 events`);

              // Send notification to client to trigger sync
              const clients = await self.clients.matchAll();
              clients.forEach((client) => {
                client.postMessage({
                  type: 'MOD4_SYNC_TRIGGER',
                  count: pendingEvents.length,
                });
              });
            };
          };
        } catch (error) {
          console.error('[SW] Mod4 sync failed:', error);
        }
      })()
    );
  }
});

/**
 * Handle push notifications (future use)
 */
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};

  const title = data.title || 'BIKO Notification';
  const options = {
    body: data.body || '',
    icon: '/map/sprites/map-icons.png',
    badge: '/favicon.ico',
    data: data.data,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/**
 * Handle notification clicks (future use)
 */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }

        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
  );
});

console.log('[SW] Service worker loaded');
