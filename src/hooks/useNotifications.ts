import { useState, useEffect, useCallback, useRef } from 'react';
import { PrayerEntry } from '@/hooks/usePrayerTimes';

const STORAGE_KEY = 'akurana-notif-enabled';

function parseTimeToMinutes(timeStr: string | null): number | null {
  if (!timeStr) return null;
  const cleaned = timeStr.trim().toUpperCase();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3];
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function useNotifications(prayers: PrayerEntry[]) {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const firedRef = useRef<Set<string>>(new Set());
  const lastDateRef = useRef<string>('');

  const toggle = useCallback(async () => {
    if (!enabled) {
      if (typeof Notification === 'undefined') return;
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm === 'granted') {
        setEnabled(true);
        localStorage.setItem(STORAGE_KEY, 'true');
      }
    } else {
      setEnabled(false);
      localStorage.setItem(STORAGE_KEY, 'false');
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || permission !== 'granted' || prayers.length === 0) return;

    const check = () => {
      const now = new Date();
      const today = now.toDateString();
      if (today !== lastDateRef.current) {
        firedRef.current.clear();
        lastDateRef.current = today;
      }

      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      for (const prayer of prayers) {
        if (prayer.name === 'Sunrise') continue;
        const mins = parseTimeToMinutes(prayer.adhan);
        if (mins === null) continue;
        const diff = mins - currentMinutes;
        if (diff === 5 && !firedRef.current.has(prayer.name)) {
          firedRef.current.add(prayer.name);
          new Notification('Akurana Prayer App', {
            body: `${prayer.name} Adhan in 5 minutes`,
            icon: '/icons/icon-192.png',
            tag: `prayer-${prayer.name}`,
          });
        }
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [enabled, permission, prayers]);

  return { enabled, permission, toggle };
}
