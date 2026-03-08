import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type IbadahStatus = 'completed' | 'delayed' | 'missed' | 'none';

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
    missed_reasons: Record<string, string>;
    notes?: string;
}

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

export function useIbadah() {
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

    const fetchLogs = useCallback(async () => {
        if (!userId) {
            setLogs({});
            setLoading(false);
            return;
        }
        setLoading(true);
        const { data, error } = await supabase
            .from('ramadan_ibadah_logs')
            .select('*')
            .eq('user_id', userId);

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
                    missed_reasons: (row.missed_reasons as Record<string, string>) || {},
                    notes: row.notes ?? undefined,
                };
            });
            setLogs(logsMap);
        }
        setLoading(false);
    }, [userId]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const saveLog = async (day: string, updates: Partial<IbadahLog>): Promise<{ error: string | null }> => {
        if (!userId) {
            return { error: 'Not authenticated' };
        }
        const existing = logs[day];
        const merged = {
            ...(existing || {}),
            ...updates,
            user_id: userId,
            hijri_date: day,
        };

        const { id, created_at, updated_at, masjid_id, ...payload } = merged as Record<string, unknown>;

        const { error } = await supabase
            .from('ramadan_ibadah_logs')
            .upsert(payload as Record<string, unknown> & { user_id: string; hijri_date: string }, { onConflict: 'user_id, hijri_date' });

        if (!error) {
            setLogs(prev => ({
                ...prev,
                [day]: merged as IbadahLog,
            }));
        }
        return { error: error?.message ?? null };
    };

    const calculateScore = useCallback((dayLog: IbadahLog | undefined): number => {
        if (!dayLog) return 0;
        let score = 0;
        let maxScore = 50 + 5 + 5 + 5 + 5; // 5 prayers(50) + taraweeh(5) + tahajjud(5) + dhikr(5) + sadaqah(5) = 70

        const prayerKeys: (keyof IbadahLog)[] = ['fajr_status', 'dhuhr_status', 'asr_status', 'maghrib_status', 'isha_status'];
        prayerKeys.forEach(p => {
            if (dayLog[p] === 'completed') score += 10;
            else if (dayLog[p] === 'delayed') score += 5;
        });

        if (dayLog.taraweeh_status === 'completed') score += 5;
        if (dayLog.tahajjud) score += 5;
        if (dayLog.dhikr) score += 5;
        if (dayLog.sadaqah) score += 5;

        score += Math.min(10, Math.floor(dayLog.quran_minutes / 10));
        maxScore += 10;

        return Math.round((score / maxScore) * 100);
    }, []);

    const getWeeklyReport = useCallback(() => {
        const logArray = Object.values(logs).sort((a, b) => parseInt(a.hijri_date) - parseInt(b.hijri_date));
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
