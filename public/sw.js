/* Self-destroying service worker v3 — clears all caches and unregisters itself.
   This replaces the previous Workbox SW that was interfering with Firebase. */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v3...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating v3...');
  event.waitUntil(
    caches.keys()
      .then(keys => {
        console.log('[SW] Deleting caches:', keys);
        return Promise.all(keys.map(k => caches.delete(k)));
      })
      .then(() => {
        console.log('[SW] Unregistering...');
        return self.registration.unregister();
      })
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => {
        console.log('[SW] Reloading', clients.length, 'clients...');
        clients.forEach(c => c.navigate(c.url));
      })
  );
});

// Don't cache anything — pass through to network
self.addEventListener('fetch', (event) => {
  // Let the browser handle the request normally (no caching)
});
