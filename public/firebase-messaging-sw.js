/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js');

const configUrl = new URL(self.location.href);
const firebaseConfig = {
  apiKey: configUrl.searchParams.get('AIzaSyB5M7vtA33tPN8XJup6khKk6QYWxlvnH7o') || '',
  authDomain: configUrl.searchParams.get('akurana-prayer-app.firebaseapp.com') || '',
  projectId: configUrl.searchParams.get('akurana-prayer-app') || '',
  storageBucket: configUrl.searchParams.get('akurana-prayer-app.firebasestorage.app') || '',
  messagingSenderId: configUrl.searchParams.get('1057372025321') || '',
  appId: configUrl.searchParams.get('1:1057372025321:web:1d96d0f56e890dfc191b78') || '',
};

if (Object.values(firebaseConfig).every(Boolean)) {
  firebase.initializeApp(firebaseConfig);
} else {
  console.error('[firebase-messaging-sw] Missing Firebase config in service worker registration URL.');
}

const messaging = firebase.apps.length ? firebase.messaging() : null;

if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'Fajr in 5 minutes';
    const options = {
      body: payload.notification?.body || 'Prepare for Sunnah Salah',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: payload.data || {},
    };

    self.registration.showNotification(title, options);
  });
}

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
