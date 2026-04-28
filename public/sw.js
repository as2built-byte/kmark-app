/* Self-destroying service worker — clears all caches and unregisters itself.
   This replaces the previous Workbox SW that was interfering with Firebase. */

/* Required placeholder for vite-plugin-pwa injectManifest strategy */
// eslint-disable-next-line no-unused-vars
const _manifest = self.__WB_MANIFEST;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then(clients => clients.forEach(c => c.navigate(c.url)))
  );
});
