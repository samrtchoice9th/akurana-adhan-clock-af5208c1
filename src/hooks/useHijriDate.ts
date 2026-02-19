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

/** Write directly to DB — always uses the known row ID, never re-fetches */
async function writeToDB(id: string, year: number, month: number, day: number): Promise<Error | null> {
  const today = getToday();
  const { error } = await supabase
    .from('hijri_date')
    .update({ hijri_year: year, hijri_month: month, hijri_day: day, last_updated: today })
    .eq('id', id);
  return error ?? null;
}

export function useHijriDate() {
  const [hijri, setHijri] = useState<HijriState | null>(null);
  const [loading, setLoading] = useState(true);
  // Keep a ref so callbacks always have the latest row ID without stale closures
  const hijriRef = useRef<HijriState | null>(null);
  hijriRef.current = hijri;

  const fetchAndAutoIncrement = useCallback(async () => {
    const { data, error } = await supabase
      .from('hijri_date')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error || !data) { setLoading(false); return; }

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

    // Realtime subscription — instantly reflects any DB change
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

    // Midnight check
    const checkInterval = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() < 2) fetchAndAutoIncrement();
    }, 30000);

    return () => {
      clearInterval(checkInterval);
      supabase.removeChannel(channel);
    };
  }, [fetchAndAutoIncrement]);

  /**
   * Update hijri to a specific date.
   * Uses the known row ID from current state (via ref — always fresh).
   * Optimistically updates local state immediately so UI responds instantly.
   */
  const updateHijri = useCallback(async (year: number, month: number, day: number): Promise<Error | null> => {
    const current = hijriRef.current;
    if (!current) return new Error('Hijri not loaded yet');

    const today = getToday();
    const newState: HijriState = { ...current, hijri_year: year, hijri_month: month, hijri_day: day, last_updated: today };

    // Optimistic update — show new date immediately in UI
    setHijri(newState);

    const err = await writeToDB(current.id, year, month, day);
    if (err) {
      // Rollback on failure
      setHijri(current);
      return err;
    }
    return null;
  }, []);

  /** Moon sighted: advance to day 1 of next month */
  const moonSighted = useCallback(async (): Promise<Error | null> => {
    const current = hijriRef.current;
    if (!current) return new Error('Hijri not loaded yet');
    let { hijri_year: y, hijri_month: m } = current;
    m += 1;
    if (m > 12) { m = 1; y += 1; }
    return updateHijri(y, m, 1);
  }, [updateHijri]);

  /** Moon not sighted: set day 30 of current month */
  const moonNotSighted = useCallback(async (): Promise<Error | null> => {
    const current = hijriRef.current;
    if (!current) return new Error('Hijri not loaded yet');
    return updateHijri(current.hijri_year, current.hijri_month, 30);
  }, [updateHijri]);

  /**
   * Log an admin action — takes snapshot BEFORE the description.
   * Caller passes the date snapshot string directly (no re-fetch needed).
   */
  const logAdminAction = useCallback(async (action: string, snapshot?: string) => {
    const snap = snapshot ?? formatHijriDate(hijriRef.current);
    await supabase.from('hijri_admin_log').insert({ action, hijri_date_snapshot: snap });
  }, []);

  return { hijri, loading, updateHijri, moonSighted, moonNotSighted, logAdminAction, refetch: fetchAndAutoIncrement };
}
