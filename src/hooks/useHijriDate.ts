import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const HIJRI_MONTHS: Record<number, string> = {
  1: 'Muharram', 2: 'Safar', 3: 'Rabi al-Awwal', 4: 'Rabi al-Thani',
  5: 'Jumada al-Ula', 6: 'Jumada al-Thani', 7: 'Rajab', 8: 'Shaaban',
  9: 'Ramadan', 10: 'Shawwal', 11: 'Dhul Qadah', 12: 'Dhul Hijjah',
};

export interface HijriState {
  id: string;
  hijri_year: number;
  hijri_month: number;
  hijri_day: number;
  last_updated: string;
}

export function formatHijriDate(state: HijriState | null): string {
  if (!state) return '';
  const monthName = HIJRI_MONTHS[state.hijri_month] || `Month ${state.hijri_month}`;
  return `${state.hijri_day} ${monthName} ${state.hijri_year} AH`;
}

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T00:00:00');
  const b = new Date(dateB + 'T00:00:00');
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function advanceHijri(y: number, m: number, d: number, days: number) {
  for (let i = 0; i < days; i++) {
    d += 1;
    if (d > 30) {
      d = 1;
      m += 1;
      if (m > 12) { m = 1; y += 1; }
    }
  }
  return { hijri_year: y, hijri_month: m, hijri_day: d };
}

export function useHijriDate() {
  const [hijri, setHijri] = useState<HijriState | null>(null);
  const [loading, setLoading] = useState(true);
  const midnightRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAndAutoIncrement = useCallback(async () => {
    const { data } = await supabase.from('hijri_date').select('*').limit(1).maybeSingle();
    if (!data) { setLoading(false); return; }

    let state = data as HijriState;
    const today = getToday();
    const diff = daysBetween(state.last_updated, today);

    if (diff > 0) {
      const advanced = advanceHijri(state.hijri_year, state.hijri_month, state.hijri_day, diff);
      await supabase
        .from('hijri_date')
        .update({ ...advanced, last_updated: today })
        .eq('id', state.id);
      state = { ...state, ...advanced, last_updated: today };
    }

    setHijri(state);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAndAutoIncrement();

    // Check every 30s for midnight crossing so Hijri updates without reload
    const checkInterval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() < 2) {
        fetchAndAutoIncrement();
      }
    }, 30000);
    midnightRef.current = checkInterval;

    return () => clearInterval(checkInterval);
  }, [fetchAndAutoIncrement]);

  const updateHijri = useCallback(async (year: number, month: number, day: number) => {
    if (!hijri) return;
    const today = getToday();
    const { error } = await supabase
      .from('hijri_date')
      .update({ hijri_year: year, hijri_month: month, hijri_day: day, last_updated: today })
      .eq('id', hijri.id);
    if (!error) {
      setHijri(prev => prev ? { ...prev, hijri_year: year, hijri_month: month, hijri_day: day, last_updated: today } : null);
    }
    return error;
  }, [hijri]);

  const moonSighted = useCallback(async () => {
    if (!hijri) return;
    let { hijri_year: y, hijri_month: m } = hijri;
    m += 1;
    if (m > 12) { m = 1; y += 1; }
    return updateHijri(y, m, 1);
  }, [hijri, updateHijri]);

  const moonNotSighted = useCallback(async () => {
    if (!hijri) return;
    return updateHijri(hijri.hijri_year, hijri.hijri_month, 30);
  }, [hijri, updateHijri]);

  const logAdminAction = useCallback(async (action: string) => {
    if (!hijri) return;
    const snapshot = formatHijriDate(hijri);
    await supabase.from('hijri_admin_log').insert({ action, hijri_date_snapshot: snapshot });
  }, [hijri]);

  return { hijri, loading, updateHijri, moonSighted, moonNotSighted, logAdminAction, refetch: fetchAndAutoIncrement };
}
