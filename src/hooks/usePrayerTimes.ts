import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { addMinutesToTime, IQAMATH_OFFSETS } from '@/lib/iqamathOffset';

export interface PrayerEntry {
  name: string;
  adhan: string | null;
  iqamath: string | null;
  hasIqamath: boolean;
}

interface MergedTimes {
  subah_adhan: string | null;
  sunrise: string | null;
  luhar_adhan: string | null;
  asr_adhan: string | null;
  magrib_adhan: string | null;
  isha_adhan: string | null;
}

const TIME_FIELDS = ['subah_adhan', 'sunrise', 'luhar_adhan', 'asr_adhan', 'magrib_adhan', 'isha_adhan'] as const;

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

export function getPrayerList(merged: MergedTimes | null): PrayerEntry[] {
  if (!merged) return getEmptyPrayerList();
  return [
    { name: 'Subah', adhan: merged.subah_adhan, iqamath: addMinutesToTime(merged.subah_adhan, IQAMATH_OFFSETS.Subah), hasIqamath: true },
    { name: 'Sunrise', adhan: merged.sunrise, iqamath: null, hasIqamath: false },
    { name: 'Luhar', adhan: merged.luhar_adhan, iqamath: addMinutesToTime(merged.luhar_adhan, IQAMATH_OFFSETS.Luhar), hasIqamath: true },
    { name: 'Asr', adhan: merged.asr_adhan, iqamath: addMinutesToTime(merged.asr_adhan, IQAMATH_OFFSETS.Asr), hasIqamath: true },
    { name: 'Magrib', adhan: merged.magrib_adhan, iqamath: addMinutesToTime(merged.magrib_adhan, IQAMATH_OFFSETS.Magrib), hasIqamath: true },
    { name: 'Isha', adhan: merged.isha_adhan, iqamath: addMinutesToTime(merged.isha_adhan, IQAMATH_OFFSETS.Isha), hasIqamath: true },
  ];
}

function getEmptyPrayerList(): PrayerEntry[] {
  return [
    { name: 'Subah', adhan: null, iqamath: null, hasIqamath: true },
    { name: 'Sunrise', adhan: null, iqamath: null, hasIqamath: false },
    { name: 'Luhar', adhan: null, iqamath: null, hasIqamath: true },
    { name: 'Asr', adhan: null, iqamath: null, hasIqamath: true },
    { name: 'Magrib', adhan: null, iqamath: null, hasIqamath: true },
    { name: 'Isha', adhan: null, iqamath: null, hasIqamath: true },
  ];
}

export function getNextPrayerIndex(prayers: PrayerEntry[], now: Date): number {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i < prayers.length; i++) {
    const mins = parseTimeToMinutes(prayers[i].adhan);
    if (mins !== null && mins > currentMinutes) return i;
  }
  return -1;
}

export function getCountdown(prayers: PrayerEntry[], nextIndex: number, now: Date): string {
  if (nextIndex < 0) return '';
  const mins = parseTimeToMinutes(prayers[nextIndex].adhan);
  if (mins === null) return '';
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const diff = mins - currentMinutes;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${m}m`;
}

export function usePrayerTimes() {
  const [merged, setMerged] = useState<MergedTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchForDate = useCallback(async (date: Date) => {
    setLoading(true);
    setError(null);
    const dateStr = format(date, 'yyyy-MM-dd');

    const { data, error: err } = await supabase
      .from('prayer_time_changes')
      .select('*')
      .lte('effective_from', dateStr)
      .order('effective_from', { ascending: true });

    if (err) {
      setError('Failed to load prayer times');
      setMerged(null);
    } else if (!data || data.length === 0) {
      setError('Prayer time data not available');
      setMerged(null);
    } else {
      // Carry-forward merge
      const result: MergedTimes = {
        subah_adhan: null, sunrise: null, luhar_adhan: null,
        asr_adhan: null, magrib_adhan: null, isha_adhan: null,
      };
      for (const row of data) {
        for (const field of TIME_FIELDS) {
          const val = row[field] as string | null;
          if (val && val.trim() !== '') {
            result[field] = val.trim();
          }
        }
      }
      setMerged(result);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchForDate(currentDate);
    const interval = setInterval(() => {
      const now = new Date();
      if (format(now, 'yyyy-MM-dd') !== format(currentDate, 'yyyy-MM-dd')) {
        setCurrentDate(now);
        fetchForDate(now);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentDate, fetchForDate]);

  return { merged, loading, error, currentDate };
}
