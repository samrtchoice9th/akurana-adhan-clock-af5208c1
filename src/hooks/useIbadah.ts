import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type IbadahStatus = 'completed' | 'delayed' | 'missed' | 'none';

export interface IbadahLog {
    hijri_date: string; // Day 1-30 as string
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

const STORAGE_DEVICE_ID = 'akurana-device-id';

function getOrCreateDeviceId(): string {
    try {
        const existing = localStorage.getItem(STORAGE_DEVICE_ID);
        if (existing) return existing;

        // Create new unique ID
        const created = crypto.randomUUID();
        localStorage.setItem(STORAGE_DEVICE_ID, created);
        return created;
    } catch (e) {
        // Fallback if localStorage or crypto is unavailable
        console.error('Failed to create device ID:', e);
        return 'device-' + Math.random().toString(36).substring(2, 10);
    }
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
    const deviceId = useMemo(() => getOrCreateDeviceId(), []);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        const { data, error } = await (supabase
            .from('ramadan_ibadah_logs' as any) as any)
            .select('*')
            .eq('user_id', deviceId);

        if (!error && data) {
            const logsMap: Record<string, IbadahLog> = {};
            data.forEach((row: any) => {
                logsMap[row.hijri_date] = {
                    ...row,
                    missed_reasons: row.missed_reasons || {},
                };
            });
            setLogs(logsMap);
        }
        setLoading(false);
    }, [deviceId]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const saveLog = async (day: string, updates: Partial<IbadahLog>) => {
        const existing = logs[day];
        const newLog = {
            user_id: deviceId,
            hijri_date: day,
            ...(existing || {}),
            ...updates,
        };

        const { error } = await (supabase
            .from('ramadan_ibadah_logs' as any) as any)
            .upsert(newLog, { onConflict: 'user_id, hijri_date' });

        if (!error) {
            setLogs(prev => ({
                ...prev,
                [day]: newLog as IbadahLog,
            }));
        }
        return error;
    };

    const calculateScore = (dayLog: IbadahLog | undefined) => {
        if (!dayLog) return 0;
        let score = 0;
        let maxScore = 50 + 5 + 5 + 5; // 5 prayers * 10 + Taraweeh + Tahajjud + Dhikr/Sadaqah (Simplified)

        const prayers = ['fajr_status', 'dhuhr_status', 'asr_status', 'maghrib_status', 'isha_status'];
        prayers.forEach(p => {
            if ((dayLog as any)[p] === 'completed') score += 10;
            else if ((dayLog as any)[p] === 'delayed') score += 5;
        });

        if (dayLog.taraweeh_status === 'completed') score += 5;
        if (dayLog.tahajjud) score += 5;
        if (dayLog.dhikr) score += 5;
        if (dayLog.sadaqah) score += 5;

        // Quran: 1 point per 10 mins, cap at 10 points (100 mins)
        score += Math.min(10, Math.floor(dayLog.quran_minutes / 10));

        maxScore += 10; // Add quran cap to max

        return Math.round((score / maxScore) * 100);
    };

    const getWeeklyReport = () => {
        const logArray = Object.values(logs).sort((a, b) => parseInt(a.hijri_date) - parseInt(b.hijri_date));
        if (logArray.length < 3) return null;

        // Simplified logic: Analyze last 7 items
        const recent = logArray.slice(-7);
        let missedFajr = 0;
        let totalPrayers = 0;
        let completedPrayers = 0;
        let totalQuran = 0;

        recent.forEach(log => {
            if (log.fajr_status === 'missed') missedFajr++;
            ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(p => {
                totalPrayers++;
                if ((log as any)[`${p}_status`] === 'completed') completedPrayers++;
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

        return {
            completionRate,
            avgQuran,
            missedFajr,
            suggestion,
        };
    };

    return {
        logs,
        loading,
        saveLog,
        calculateScore,
        getWeeklyReport,
        deviceId,
    };
}
