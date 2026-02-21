import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register service worker with Firebase config
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    // 1. Cleanup old workers if any
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        if (registration.active?.scriptURL.includes('firebase-messaging-sw')) {
          console.log('[main.tsx] Unregistering old worker:', registration.active.scriptURL);
          await registration.unregister();
        }
      }
    } catch (e) {
      console.error('[main.tsx] Cleanup error:', e);
    }

    // 2. Register new unified worker
    const params = new URLSearchParams({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
    });
    navigator.serviceWorker.register(`/sw.js?${params.toString()}`).catch((e) => {
      console.error('[main.tsx] Registration failed:', e);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
