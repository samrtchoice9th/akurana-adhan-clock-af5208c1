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
  const lastCheckedMinuteRef = useRef<string>('');
  const audioUnlockedRef = useRef(false);

  useEffect(() => {
    // Create audio element once
    if (!audioRef.current) {
      audioRef.current = new Audio('/sounds/takbeer.mp3');
      audioRef.current.volume = 1.0;
    }

    // Pre-warm audio on first user interaction to bypass autoplay policy
    const unlockAudio = () => {
      if (audioUnlockedRef.current || !audioRef.current) return;
      audioUnlockedRef.current = true;
      const a = audioRef.current;
      a.play().then(() => {
        a.pause();
        a.currentTime = 0;
      }).catch(() => {});
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };

    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });

    const interval = setInterval(() => {
      // Check if feature is enabled
      const enabled = localStorage.getItem('adhan-alert-enabled');
      if (enabled === 'false') return;

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const dateKey = format(now, 'yyyy-MM-dd');

      // Deduplicate by minute — run check only once per minute
      const minuteKey = `${currentMinutes}-${dateKey}`;
      if (minuteKey === lastCheckedMinuteRef.current) return;
      lastCheckedMinuteRef.current = minuteKey;

      for (const prayer of prayers) {
        // Skip Sunrise — not a prayer with adhan
        if (prayer.name === 'Sunrise' || !prayer.adhan) continue;

        const adhanMinutes = parseTimeToMinutes(prayer.adhan);
        if (adhanMinutes === null) continue;

        const alertMinutes = adhanMinutes - 5;
        if (alertMinutes < 0) continue;

        if (currentMinutes === alertMinutes) {
          const storageKey = `adhan-alert-${dateKey}-${prayer.name}`;
          if (localStorage.getItem(storageKey)) continue;

          localStorage.setItem(storageKey, 'true');
          const audio = audioRef.current;
          if (audio) {
            audio.currentTime = 0;
            audio.play().then(() => {
              // Limit playback to ~1.5 seconds
              setTimeout(() => {
                audio.pause();
                audio.currentTime = 0;
              }, 1500);
            }).catch(() => {});
          }
          break;
        }
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, [prayers]);
}
