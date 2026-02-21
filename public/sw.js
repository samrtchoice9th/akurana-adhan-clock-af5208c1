const configUrl = new URL(self.location.href);
const firebaseConfig = {
  apiKey: configUrl.searchParams.get('apiKey') || '',
  authDomain: configUrl.searchParams.get('authDomain') || '',
  projectId: configUrl.searchParams.get('projectId') || '',
  storageBucket: configUrl.searchParams.get('storageBucket') || '',
  messagingSenderId: configUrl.searchParams.get('messagingSenderId') || '',
  appId: configUrl.searchParams.get('appId') || '',
};

if (Object.values(firebaseConfig).every(Boolean)) {
  try {
    console.log('[sw.js] Attempting to load local Firebase scripts...');
    importScripts('/firebase-compat/firebase-app-compat.js');
    importScripts('/firebase-compat/firebase-messaging-compat.js');

    if (typeof firebase === 'undefined') {
      throw new Error('Firebase object not found after importScripts');
    }

    console.log('[sw.js] Initializing Firebase app...');
    firebase.initializeApp(firebaseConfig);

    console.log('[sw.js] Initializing Firebase messaging...');
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[sw.js] Received background message:', payload);
      const title = payload.notification?.title || 'Prayer Reminder';
      const options = {
        body: payload.notification?.body || 'Time for Salah',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: payload.data || {},
      };
      self.registration.showNotification(title, options);
    });
    console.log('[sw.js] Firebase Messaging initialized successfully');
  } catch (error) {
    console.error('[sw.js] Failed to initialize Firebase Messaging:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  }
}

const CACHE_NAME = 'akurana-prayer-v3';
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Network-first for HTML and JS (ensures fresh code always loads)
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname === '/') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for static assets (icons, manifest)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
      return null;
    })
  );
});
