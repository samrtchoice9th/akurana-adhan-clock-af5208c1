/* Tombstone Service Worker: Used to clean up old registrations */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.registration.unregister().then(() => {
      console.log('[Tombstone SW] Successfully unregistered the old firebase-messaging-sw.js');
    })
  );
});
