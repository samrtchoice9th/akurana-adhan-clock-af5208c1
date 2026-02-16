import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { addMinutesToTime, IQAMATH_OFFSETS } from '@/lib/iqamathOffset';

export interface PrayerEntry {
  name: string;
  adhan: string | null;
  iqamath: string | null;
  hasIqamath: boolean;
}

export type PrayerPhase = 'before-adhan' | 'before-iqamah' | 'passed';

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

export function getPrayerList(merged: MergedTimes | null, offsetMinutes = 0): PrayerEntry[] {
  if (!merged) return getEmptyPrayerList();

  const applyOffset = (time: string | null): string | null => {
    if (!time || offsetMinutes === 0) return time;
    return addMinutesToTime(time, offsetMinutes);
  };

  const subah = applyOffset(merged.subah_adhan);
  const sunrise = applyOffset(merged.sunrise);
  const luhar = applyOffset(merged.luhar_adhan);
  const asr = applyOffset(merged.asr_adhan);
  const magrib = applyOffset(merged.magrib_adhan);
  const isha = applyOffset(merged.isha_adhan);

  return [
    { name: 'Subah', adhan: subah, iqamath: addMinutesToTime(subah, IQAMATH_OFFSETS.Subah), hasIqamath: true },
    { name: 'Sunrise', adhan: sunrise, iqamath: null, hasIqamath: false },
    { name: 'Luhar', adhan: luhar, iqamath: addMinutesToTime(luhar, IQAMATH_OFFSETS.Luhar), hasIqamath: true },
    { name: 'Asr', adhan: asr, iqamath: addMinutesToTime(asr, IQAMATH_OFFSETS.Asr), hasIqamath: true },
    { name: 'Magrib', adhan: magrib, iqamath: addMinutesToTime(magrib, IQAMATH_OFFSETS.Magrib), hasIqamath: true },
    { name: 'Isha', adhan: isha, iqamath: addMinutesToTime(isha, IQAMATH_OFFSETS.Isha), hasIqamath: true },
  ];
}

export function getPrayerPhase(prayer: PrayerEntry, now: Date): PrayerPhase {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const adhanMins = parseTimeToMinutes(prayer.adhan);
  const iqamahMins = parseTimeToMinutes(prayer.iqamath);

  if (adhanMins === null) return 'passed';
  if (currentMinutes < adhanMins) return 'before-adhan';
  if (prayer.hasIqamath && iqamahMins !== null && currentMinutes < iqamahMins) return 'before-iqamah';
  return 'passed';
}

export function getNextPrayerIndex(prayers: PrayerEntry[], now: Date): number {
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  for (let i = 0; i < prayers.length; i += 1) {
    if (prayers[i].name === 'Sunrise') {
      const mins = parseTimeToMinutes(prayers[i].adhan);
      if (mins !== null && mins > currentMinutes) return i;
      continue;
    }

    const phase = getPrayerPhase(prayers[i], now);
    if (phase !== 'passed') return i;
  }

  return -1;
}

export function getCountdown(prayers: PrayerEntry[], nextIndex: number, now: Date): string {
  if (nextIndex < 0) return '';

  const prayer = prayers[nextIndex];
  const phase = getPrayerPhase(prayer, now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let targetMins: number | null = null;
  if (phase === 'before-adhan') targetMins = parseTimeToMinutes(prayer.adhan);
  if (phase === 'before-iqamah') targetMins = parseTimeToMinutes(prayer.iqamath);

  if (targetMins === null) return '';

  const diff = targetMins - currentMinutes;
  if (diff <= 0) return '';

  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function usePrayerTimes() {
  const [merged, setMerged] = useState<MergedTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const lastDateRef = useRef(format(new Date(), 'yyyy-MM-dd'));

  const fetchForDate = useCallback(async (date: Date) => {
    setLoading(true);
    setError(null);

    const dateStr = format(date, 'yyyy-MM-dd');
    const { data, error: queryError } = await supabase
      .from('prayer_time_changes')
      .select('effective_from, subah_adhan, sunrise, luhar_adhan, asr_adhan, magrib_adhan, isha_adhan')
      .lte('effective_from', dateStr)
      .order('effective_from', { ascending: true });

    if (queryError) {
      setError('Failed to load prayer times');
      setMerged(null);
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setError('Prayer time data not available');
      setMerged(null);
      setLoading(false);
      return;
    }

    const result: MergedTimes = {
      subah_adhan: null,
      sunrise: null,
      luhar_adhan: null,
      asr_adhan: null,
      magrib_adhan: null,
      isha_adhan: null,
    };

    for (const row of data) {
      for (const field of TIME_FIELDS) {
        const val = row[field];
        if (typeof val === 'string' && val.trim() !== '') {
          result[field] = val.trim();
        }
      }
    }

    setMerged(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchForDate(currentDate);
  }, [currentDate, fetchForDate]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      if (today !== lastDateRef.current) {
        lastDateRef.current = today;
        setCurrentDate(now);
      }
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  return { merged, loading, error, currentDate };
}
