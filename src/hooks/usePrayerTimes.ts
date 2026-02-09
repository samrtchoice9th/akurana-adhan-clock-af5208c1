import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface PrayerTimeRecord {
  id: string;
  date: string;
  hijri_date: string | null;
  subah_adhan: string | null;
  subah_iqamath: string | null;
  sunrise: string | null;
  luhar_adhan: string | null;
  luhar_iqamath: string | null;
  asr_adhan: string | null;
  asr_iqamath: string | null;
  magrib_adhan: string | null;
  magrib_iqamath: string | null;
  isha_adhan: string | null;
  isha_iqamath: string | null;
}

export interface PrayerEntry {
  name: string;
  adhan: string | null;
  iqamath: string | null;
  hasIqamath: boolean;
}

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

export function getPrayerList(record: PrayerTimeRecord | null): PrayerEntry[] {
  if (!record) return getEmptyPrayerList();
  return [
    { name: 'Subah', adhan: record.subah_adhan, iqamath: record.subah_iqamath, hasIqamath: true },
    { name: 'Sunrise', adhan: record.sunrise, iqamath: null, hasIqamath: false },
    { name: 'Luhar', adhan: record.luhar_adhan, iqamath: record.luhar_iqamath, hasIqamath: true },
    { name: 'Asr', adhan: record.asr_adhan, iqamath: record.asr_iqamath, hasIqamath: true },
    { name: 'Magrib', adhan: record.magrib_adhan, iqamath: record.magrib_iqamath, hasIqamath: true },
    { name: 'Isha', adhan: record.isha_adhan, iqamath: record.isha_iqamath, hasIqamath: true },
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
  return -1; // all prayers passed
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
  const [record, setRecord] = useState<PrayerTimeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchForDate = useCallback(async (date: Date) => {
    setLoading(true);
    setError(null);
    const dateStr = format(date, 'yyyy-MM-dd');
    const { data, error: err } = await supabase
      .from('prayer_times')
      .select('*')
      .eq('date', dateStr)
      .maybeSingle();

    if (err) {
      setError('Failed to load prayer times');
      setRecord(null);
    } else if (!data) {
      setError('Prayer times not available for this date');
      setRecord(null);
    } else {
      setRecord(data as PrayerTimeRecord);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchForDate(currentDate);
    // Check for date change every 30 seconds
    const interval = setInterval(() => {
      const now = new Date();
      if (format(now, 'yyyy-MM-dd') !== format(currentDate, 'yyyy-MM-dd')) {
        setCurrentDate(now);
        fetchForDate(now);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentDate, fetchForDate]);

  return { record, loading, error, currentDate };
}
