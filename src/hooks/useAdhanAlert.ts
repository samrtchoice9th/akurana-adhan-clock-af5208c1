import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { PrayerEntry } from '@/hooks/usePrayerTimes';
import { parseTimeToMinutes } from '@/lib/timeUtils';

/**
 * Plays a short takbeer audio clip 5 minutes before each prayer's Adhan time.
 * Deduplicates via localStorage so it only fires once per prayer per day.
 * Respects a user toggle stored in localStorage ('adhan-alert-enabled').
 */
export function useAdhanAlert(prayers: PrayerEntry[]) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Create audio element once
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/takbeer.mp3');
      audioRef.current.volume = 1.0;
    }

    const interval = setInterval(() => {
      // Check if feature is enabled
      const enabled = localStorage.getItem('adhan-alert-enabled');
      if (enabled === 'false') return;

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const currentSeconds = now.getSeconds();
      const dateKey = format(now, 'yyyy-MM-dd');

      // Only trigger at :00 seconds to avoid multiple plays within the same minute
      if (currentSeconds !== 0) return;

      for (const prayer of prayers) {
        // Skip Sunrise — not a prayer with adhan
        if (prayer.name === 'Sunrise' || !prayer.adhan) continue;

        const adhanMinutes = parseTimeToMinutes(prayer.adhan);
        if (adhanMinutes === null) continue;

        const alertMinutes = adhanMinutes - 5;
        if (alertMinutes < 0) continue; // edge case around midnight

        if (currentMinutes === alertMinutes) {
          const storageKey = `adhan-alert-${dateKey}-${prayer.name}`;
          if (localStorage.getItem(storageKey)) continue; // already played

          localStorage.setItem(storageKey, 'true');
          audioRef.current?.play().catch(() => {
            // Browser may block autoplay — silent fail
          });
          break; // only one alert per check
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [prayers]);
}
