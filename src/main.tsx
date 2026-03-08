import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker with Firebase config + auto-update
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    // Cleanup old firebase-only workers
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        if (registration.active?.scriptURL.includes('firebase-messaging-sw')) {
          await registration.unregister();
        }
      }
    } catch (e) {
      // ignore cleanup errors
    }

    // Build SW URL with Firebase params
    const params = new URLSearchParams({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
    });

    try {
      const registration = await navigator.serviceWorker.register(`/sw.js?${params.toString()}`);

      // Auto-update: when a new SW is waiting, tell it to activate immediately
      const onNewSW = (sw: ServiceWorker) => {
        sw.addEventListener('statechange', () => {
          if (sw.state === 'activated') {
            // New SW is active — reload to get fresh content
            window.location.reload();
          }
        });
        sw.postMessage({ type: 'SKIP_WAITING' });
      };

      if (registration.waiting) {
        onNewSW(registration.waiting);
      }

      registration.addEventListener('updatefound', () => {
        const newSW = registration.installing;
        if (newSW) {
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW installed while old one is still controlling — activate it
              onNewSW(newSW);
            }
          });
        }
      });
    } catch (e) {
      console.error('[main.tsx] SW registration failed:', e);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
