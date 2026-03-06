import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parseTimeToMinutes } from '@/lib/timeUtils';

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
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA + 'T00:00:00');
  const b = new Date(dateB + 'T00:00:00');
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function daysInHijriMonth(month: number): number {
  return month % 2 === 1 ? 30 : 29;
}

function advanceHijri(y: number, m: number, d: number, days: number) {
  for (let i = 0; i < days; i++) {
    d += 1;
    if (d > daysInHijriMonth(m)) { d = 1; m += 1; }
    if (m > 12) { m = 1; y += 1; }
  }
  return { hijri_year: y, hijri_month: m, hijri_day: d };
}

/**
 * Advance a Hijri state by 1 day (for display purposes after Maghrib).
 */
export function advanceHijriByOne(state: HijriState): HijriState {
  const advanced = advanceHijri(state.hijri_year, state.hijri_month, state.hijri_day, 1);
  return { ...state, ...advanced };
}

/** Fetch the freshest row directly from DB */
async function fetchFreshHijri(): Promise<HijriState | null> {
  const { data } = await supabase
    .from('hijri_date')
    .select('*')
    .limit(1)
    .maybeSingle();

  return data as HijriState | null;
}

/**
 * Parse a time string like "6:30 PM" into minutes since midnight.
 */

/**
 * Check if current time is past Maghrib.
 * maghribTime should be a string like "6:30 PM".
 */
export function isPastMaghrib(maghribTime: string | null, now: Date = new Date()): boolean {
  const maghribMins = parseTimeToMinutes(maghribTime);
  if (maghribMins === null) return false;
  const currentMins = now.getHours() * 60 + now.getMinutes();
  return currentMins >= maghribMins;
}

/**
 * Get the display Hijri date adjusted for Maghrib.
 * In Islam, the new day begins at Maghrib. So after Maghrib,
 * we show the next Hijri day.
 */
export function getDisplayHijri(
  baseHijri: HijriState | null,
  maghribTime: string | null,
  now: Date = new Date()
): HijriState | null {
  if (!baseHijri) return null;
  if (isPastMaghrib(maghribTime, now)) {
    return advanceHijriByOne(baseHijri);
  }
  return baseHijri;
}

export function useHijriDate() {
  const [hijri, setHijri] = useState<HijriState | null>(null);
  const [loading, setLoading] = useState(true);
  const hijriRef = useRef<HijriState | null>(null);
  hijriRef.current = hijri;

  const fetchAndAutoIncrement = useCallback(async () => {
    const data = await fetchFreshHijri();
    if (!data) { setLoading(false); return; }

    let state = data;
    const today = getToday();
    const diff = daysBetween(state.last_updated, today);

    if (diff > 0) {
      const advanced = advanceHijri(state.hijri_year, state.hijri_month, state.hijri_day, diff);

      const { error } = await supabase
        .from('hijri_date')
        .update({ ...advanced, last_updated: today })
        .eq('id', state.id)
        .eq('last_updated', state.last_updated);

      if (!error) {
        state = { ...state, ...advanced, last_updated: today };
      } else {
        const refetched = await fetchFreshHijri();
        if (refetched) state = refetched;
      }
    }

    setHijri(state);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAndAutoIncrement();

    const channel = supabase
      .channel('hijri_date_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'hijri_date' },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            setHijri(payload.new as HijriState);
          }
        }
      )
      .subscribe();

    const checkInterval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() < 2) fetchAndAutoIncrement();
    }, 30000);

    return () => {
      clearInterval(checkInterval);
      supabase.removeChannel(channel);
    };
  }, [fetchAndAutoIncrement]);

  const updateHijri = useCallback(async (year: number, month: number, day: number): Promise<Error | null> => {
    const fresh = await fetchFreshHijri();
    if (!fresh) return new Error('No hijri record found');

    const today = getToday();
    const { error } = await supabase
      .from('hijri_date')
      .update({ hijri_year: year, hijri_month: month, hijri_day: day, last_updated: today })
      .eq('id', fresh.id);

    if (!error) {
      setHijri({ ...fresh, hijri_year: year, hijri_month: month, hijri_day: day, last_updated: today });
    }
    return error ?? null;
  }, []);

  const moonSighted = useCallback(async (): Promise<Error | null> => {
    const fresh = await fetchFreshHijri();
    if (!fresh) return new Error('No hijri record found');
    let { hijri_year: y, hijri_month: m } = fresh;
    m += 1;
    if (m > 12) { m = 1; y += 1; }
    return updateHijri(y, m, 1);
  }, [updateHijri]);

  const moonNotSighted = useCallback(async (): Promise<Error | null> => {
    const fresh = await fetchFreshHijri();
    if (!fresh) return new Error('No hijri record found');
    return updateHijri(fresh.hijri_year, fresh.hijri_month, 30);
  }, [updateHijri]);

  const logAdminAction = useCallback(async (action: string, snapshot?: string) => {
    const snap = snapshot || formatHijriDate(hijriRef.current);
    await supabase.from('hijri_admin_log').insert({ action, hijri_date_snapshot: snap });
  }, []);

  return { hijri, loading, updateHijri, moonSighted, moonNotSighted, logAdminAction, refetch: fetchAndAutoIncrement };
}
