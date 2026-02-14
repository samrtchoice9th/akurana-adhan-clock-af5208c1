import { useCallback, useEffect, useMemo, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { supabase } from '@/integrations/supabase/client';
import { getFirebaseMessaging } from '@/lib/firebase';

export type ReminderType = '10min' | '5min' | 'adhan' | 'iqamah';

const STORAGE_DEVICE_ID = 'akurana-device-id';
const STORAGE_PROMPT_SHOWN = 'akurana-push-prompt-shown';

export interface NotificationPrefs {
  min10: boolean;
  min5: boolean;
  adhan: boolean;
  iqamah: boolean;
}

const defaultPrefs: NotificationPrefs = {
  min10: false,
  min5: true,
  adhan: false,
  iqamah: false,
};

function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(STORAGE_DEVICE_ID);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(STORAGE_DEVICE_ID, created);
    return created;
  } catch {
    return 'unknown-device';
  }
}

function getReminderTypes(prefs: NotificationPrefs): ReminderType[] {
  return [
    prefs.min10 ? '10min' : null,
    prefs.min5 ? '5min' : null,
    prefs.adhan ? 'adhan' : null,
    prefs.iqamah ? 'iqamah' : null,
  ].filter(Boolean) as ReminderType[];
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

function getMessagingServiceWorkerUrl() {
  const params = new URLSearchParams({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
  });

  return `/firebase-messaging-sw.js?${params.toString()}`;
}

export function useNotifications(location: string, autoPrompt = false) {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reminderTypes = useMemo(() => getReminderTypes(prefs), [prefs]);

  const syncToken = useCallback(async (nextEnabled: boolean, nextPrefs: NotificationPrefs, nextToken?: string | null) => {
    const activeToken = nextToken ?? token;
    if (!activeToken) return;

    const deviceId = getOrCreateDeviceId();

    if (!nextEnabled) {
      await supabase.from('users_push_tokens').delete().eq('device_id', deviceId);
      return;
    }

    const types = getReminderTypes(nextPrefs);
    await supabase.from('users_push_tokens').delete().eq('device_id', deviceId);
    if (types.length === 0) return;

    const rows = types.map((reminderType) => ({
      token: activeToken,
      device_id: deviceId,
      location,
      reminder_type: reminderType,
      notifications_enabled: true,
      platform: isIOS() ? 'ios' : 'web',
    }));

    await supabase.from('users_push_tokens').insert(rows);
  }, [location, token]);

  const registerPush = useCallback(async () => {
    if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) return;
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;

      const swReg = await navigator.serviceWorker.register(getMessagingServiceWorkerUrl());
      const messaging = await getFirebaseMessaging();
      if (!messaging) return;

      const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
      const fcmToken = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
      if (!fcmToken) return;
      setToken(fcmToken);
      setEnabled(true);
      await syncToken(true, prefs, fcmToken);
    } finally {
      setBusy(false);
    }
  }, [prefs, syncToken]);

  const disablePush = useCallback(async () => {
    setEnabled(false);
    await syncToken(false, prefs);
  }, [prefs, syncToken]);

  const toggle = useCallback(async () => {
    if (enabled) {
      await disablePush();
      return;
    }
    await registerPush();
  }, [disablePush, enabled, registerPush]);

  const setPreference = useCallback(async (key: keyof NotificationPrefs, value: boolean) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      if (enabled) {
        void syncToken(true, next);
      }
      return next;
    });
  }, [enabled, syncToken]);

  useEffect(() => {
    if (!autoPrompt || typeof window === 'undefined' || permission === 'granted') return;
    const shown = localStorage.getItem(STORAGE_PROMPT_SHOWN) === 'true';
    if (shown) return;
    localStorage.setItem(STORAGE_PROMPT_SHOWN, 'true');
    const allow = window.confirm('Enable prayer reminders?');
    if (allow) void registerPush();
  }, [autoPrompt, permission, registerPush]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    getFirebaseMessaging().then((messaging) => {
      if (!messaging) return;
      unsubscribe = onMessage(messaging, ({ notification }) => {
        if (Notification.permission === 'granted' && notification) {
          new Notification(notification.title ?? 'Prayer Reminder', { body: notification.body });
        }
      });
    });
    return () => unsubscribe?.();
  }, []);

  return { enabled, permission, toggle, prefs, setPreference, busy, iosNeedsHomescreen: isIOS() };
}
