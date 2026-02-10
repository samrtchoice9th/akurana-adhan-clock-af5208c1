import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

const HIJRI_MONTHS: Record<number, string> = {
  1: 'Muharram', 2: 'Safar', 3: "Rabi ul-Awwal", 4: "Rabi ul-Akhir",
  5: "Jumada ul-Ula", 6: "Jumada ul-Akhira", 7: 'Rajab', 8: "Sha'ban",
  9: 'Ramadan', 10: 'Shawwal', 11: "Dhul Qa'dah", 12: "Dhul Hijjah",
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
  return `${state.hijri_day} ${monthName} ${state.hijri_year}`;
}

export function useHijriDate() {
  const [hijri, setHijri] = useState<HijriState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('hijri_date').select('*').limit(1).maybeSingle();
    if (data) setHijri(data as HijriState);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const updateHijri = useCallback(async (year: number, month: number, day: number) => {
    if (!hijri) return;
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('hijri_date')
      .update({ hijri_year: year, hijri_month: month, hijri_day: day, last_updated: today })
      .eq('id', hijri.id);
    if (!error) {
      setHijri(prev => prev ? { ...prev, hijri_year: year, hijri_month: month, hijri_day: day, last_updated: today } : null);
    }
    return error;
  }, [hijri]);

  const incrementDay = useCallback(async () => {
    if (!hijri) return;
    let { hijri_year: y, hijri_month: m, hijri_day: d } = hijri;
    d += 1;
    // Day 30 is max shown; month rollover handled by moon sighting buttons
    if (d > 30) { d = 1; m += 1; if (m > 12) { m = 1; y += 1; } }
    return updateHijri(y, m, d);
  }, [hijri, updateHijri]);

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

  return { hijri, loading, updateHijri, incrementDay, moonSighted, moonNotSighted, refetch: fetch };
}
