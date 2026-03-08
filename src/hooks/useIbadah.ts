import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type IbadahStatus = 'completed' | 'delayed' | 'missed' | 'none';

export interface AdhkarChecklist {
    morning: string[];
    evening: string[];
}

export interface IbadahLog {
    hijri_date: string;
    fajr_status: IbadahStatus;
    dhuhr_status: IbadahStatus;
    asr_status: IbadahStatus;
    maghrib_status: IbadahStatus;
    isha_status: IbadahStatus;
    taraweeh_status: IbadahStatus;
    quran_minutes: number;
    tahajjud: boolean;
    dhikr: boolean;
    sadaqah: boolean;
    sunnah_before: boolean;
    sunnah_after: boolean;
    surah_yaseen: boolean;
    surah_mulk: boolean;
    surah_sajdah: boolean;
    surah_waqiah: boolean;
    morning_adhkar: boolean;
    evening_adhkar: boolean;
    adhkar_checklist: AdhkarChecklist;
    missed_reasons: Record<string, string>;
    notes?: string;
}

export const HIJRI_MONTHS: Record<number, string> = {
    1: 'Muharram', 2: 'Safar', 3: 'Rabi al-Awwal', 4: 'Rabi al-Thani',
    5: 'Jumada al-Ula', 6: 'Jumada al-Thani', 7: 'Rajab', 8: 'Shaaban',
    9: 'Ramadan', 10: 'Shawwal', 11: 'Dhul Qadah', 12: 'Dhul Hijjah',
};

export const MISSED_REASONS = [
    'Overslept',
    'Work',
    'Forgot',
    'Health',
    'Other',
];

export const CORRECTIVE_SUGGESTIONS: Record<string, string> = {
    'Overslept': 'Try sleeping 30 minutes earlier and set multiple alarms.',
    'Work': 'Try to find a quiet space at work or talk to your manager about a short prayer break.',
    'Forgot': 'Set adhan notifications on your phone to remind you.',
    'Health': 'Take care of yourself. Intention is rewarded when health is a genuine barrier.',
    'Other': 'Reflect on what made this difficult and try to eliminate that barrier tomorrow.',
};

/** Build hijri_date key like "1447-09-05" */
export function buildHijriKey(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Extract day number from hijri key */
export function dayFromHijriKey(key: string): number {
    const parts = key.split('-');
    return parseInt(parts[2] || key, 10);
}

/** Days in a Hijri month (odd = 30, even = 29) */
export function daysInHijriMonth(month: number): number {
    return month % 2 === 1 ? 30 : 29;
}

export function useIbadah(hijriMonth?: number, hijriYear?: number) {
    const [logs, setLogs] = useState<Record<string, IbadahLog>>({});
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUserId(session?.user?.id ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const monthPrefix = useMemo(() => {
        if (!hijriYear || !hijriMonth) return null;
        return `${hijriYear}-${String(hijriMonth).padStart(2, '0')}-`;
    }, [hijriYear, hijriMonth]);

    const fetchLogs = useCallback(async () => {
        if (!userId || !monthPrefix) {
            setLogs({});
            setLoading(false);
            return;
        }
        setLoading(true);
        const { data, error } = await supabase
            .from('ramadan_ibadah_logs')
            .select('*')
            .eq('user_id', userId)
            .like('hijri_date', `${monthPrefix}%`);

        if (!error && data) {
            const logsMap: Record<string, IbadahLog> = {};
            data.forEach((row) => {
                logsMap[row.hijri_date] = {
                    hijri_date: row.hijri_date,
                    fajr_status: (row.fajr_status as IbadahStatus) || 'none',
                    dhuhr_status: (row.dhuhr_status as IbadahStatus) || 'none',
                    asr_status: (row.asr_status as IbadahStatus) || 'none',
                    maghrib_status: (row.maghrib_status as IbadahStatus) || 'none',
                    isha_status: (row.isha_status as IbadahStatus) || 'none',
                    taraweeh_status: (row.taraweeh_status as IbadahStatus) || 'none',
                    quran_minutes: row.quran_minutes ?? 0,
                    tahajjud: row.tahajjud ?? false,
                    dhikr: row.dhikr ?? false,
                    sadaqah: row.sadaqah ?? false,
                    sunnah_before: (row as any).sunnah_before ?? false,
                    sunnah_after: (row as any).sunnah_after ?? false,
                    surah_yaseen: (row as any).surah_yaseen ?? false,
                    surah_mulk: (row as any).surah_mulk ?? false,
                    surah_sajdah: (row as any).surah_sajdah ?? false,
                    surah_waqiah: (row as any).surah_waqiah ?? false,
                    morning_adhkar: (row as any).morning_adhkar ?? false,
                    evening_adhkar: (row as any).evening_adhkar ?? false,
                    adhkar_checklist: (row as any).adhkar_checklist ?? { morning: [], evening: [] },
                    missed_reasons: (row.missed_reasons as Record<string, string>) || {},
                    notes: row.notes ?? undefined,
                };
            });
            setLogs(logsMap);
        }
        setLoading(false);
    }, [userId, monthPrefix]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const saveLog = async (hijriKey: string, updates: Partial<IbadahLog>): Promise<{ error: string | null }> => {
        if (!userId) {
            return { error: 'Not authenticated' };
        }
        const existing = logs[hijriKey];
        const merged = {
            ...(existing || {}),
            ...updates,
            user_id: userId,
            hijri_date: hijriKey,
        };

        const { id, created_at, updated_at, masjid_id, ...payload } = merged as Record<string, unknown>;

        const { error } = await supabase
            .from('ramadan_ibadah_logs')
            .upsert(payload as Record<string, unknown> & { user_id: string; hijri_date: string }, { onConflict: 'user_id, hijri_date' });

        if (!error) {
            setLogs(prev => ({
                ...prev,
                [hijriKey]: merged as IbadahLog,
            }));
        }
        return { error: error?.message ?? null };
    };

    const calculateScore = useCallback((dayLog: IbadahLog | undefined): number => {
        if (!dayLog) return 0;
        let score = 0;
        const maxScore = 104;

        // 5 obligatory prayers × 10 = 50
        const prayerKeys: (keyof IbadahLog)[] = ['fajr_status', 'dhuhr_status', 'asr_status', 'maghrib_status', 'isha_status'];
        prayerKeys.forEach(p => {
            if (dayLog[p] === 'completed') score += 10;
            else if (dayLog[p] === 'delayed') score += 5;
        });

        // Taraweeh = 5
        if (dayLog.taraweeh_status === 'completed') score += 5;
        // Tahajjud = 5, Dhikr = 5, Sadaqah = 5
        if (dayLog.tahajjud) score += 5;
        if (dayLog.dhikr) score += 5;
        if (dayLog.sadaqah) score += 5;

        // Quran minutes = 10
        score += Math.min(10, Math.floor(dayLog.quran_minutes / 10));

        // New items: 3 points each = 18 total (sunnah + surahs)
        if (dayLog.sunnah_before) score += 3;
        if (dayLog.sunnah_after) score += 3;
        if (dayLog.surah_yaseen) score += 3;
        if (dayLog.surah_mulk) score += 3;
        if (dayLog.surah_sajdah) score += 3;
        if (dayLog.surah_waqiah) score += 3;

        // Adhkar checklist: 6 points total based on items checked
        const checklist = dayLog.adhkar_checklist || { morning: [], evening: [] };
        const totalChecked = (checklist.morning?.length || 0) + (checklist.evening?.length || 0);
        if (totalChecked >= 5) score += 6;
        else if (totalChecked >= 3) score += 4;
        else if (totalChecked >= 1) score += 2;

        return Math.round((score / maxScore) * 100);
    }, []);

    const getWeeklyReport = useCallback(() => {
        const logArray = Object.values(logs).sort((a, b) => dayFromHijriKey(a.hijri_date) - dayFromHijriKey(b.hijri_date));
        if (logArray.length < 3) return null;

        const recent = logArray.slice(-7);
        let missedFajr = 0;
        let totalPrayers = 0;
        let completedPrayers = 0;
        let totalQuran = 0;

        const prayerNames = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

        recent.forEach(log => {
            if (log.fajr_status === 'missed') missedFajr++;
            prayerNames.forEach(p => {
                totalPrayers++;
                if (log[`${p}_status` as keyof IbadahLog] === 'completed') completedPrayers++;
            });
            totalQuran += log.quran_minutes;
        });

        const completionRate = Math.round((completedPrayers / totalPrayers) * 100);
        const avgQuran = Math.round(totalQuran / recent.length);

        let suggestion = 'Keep up the good work! Consistency is key.';
        if (missedFajr >= 3) {
            suggestion = 'You missed Fajr several times this week. Consider sleeping 30 minutes earlier and checking your alarm settings.';
        } else if (completionRate < 70) {
            suggestion = 'Try to prioritize your obligatory prayers. Small adjustments to your schedule can make a big difference.';
        }

        return { completionRate, avgQuran, missedFajr, suggestion };
    }, [logs]);

    return {
        logs,
        loading,
        saveLog,
        calculateScore,
        getWeeklyReport,
        userId,
    };
}
