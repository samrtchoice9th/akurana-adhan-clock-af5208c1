import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlertCircle, CheckCircle2, XCircle, Clock, Info, BookOpen, Sun, Moon, ChevronDown } from 'lucide-react';
import { IbadahLog, IbadahStatus, MISSED_REASONS, CORRECTIVE_SUGGESTIONS, AdhkarChecklist } from '@/hooks/useIbadah';

interface IbadahDayDetailProps {
    day: string;
    monthName: string;
    hijriKey: string;
    log: IbadahLog | undefined;
    onSave: (updates: Partial<IbadahLog>) => Promise<{ error: string | null }>;
    onClose: () => void;
}

const PRAYERS = [
    { id: 'fajr', label: 'Fajr' },
    { id: 'dhuhr', label: 'Dhuhr' },
    { id: 'asr', label: 'Asr' },
    { id: 'maghrib', label: 'Maghrib' },
    { id: 'isha', label: 'Isha' },
    { id: 'taraweeh', label: 'Taraweeh' },
];

const ADHKAR_ITEMS: { id: string; label: string; arabic: string; fullArabic: string; periods: ('morning' | 'evening')[] }[] = [
    { id: 'sayyidul_istighfar', label: 'Sayyidul Istighfar', arabic: 'سيد الاستغفار', fullArabic: 'اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ وَأَبُوءُ بِذَنْبِي، فَاغْفِرْ لِي فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ', periods: ['morning', 'evening'] },
    { id: 'subhanallah_100', label: 'Subhanallahi wa bihamdihi (100x)', arabic: 'سبحان الله وبحمده', fullArabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ\n\n(١٠٠ مرة)', periods: ['morning', 'evening'] },
    { id: 'la_ilaha_illallah_100', label: 'La ilaha illallah... (100x)', arabic: 'لا إله إلا الله وحده لا شريك له', fullArabic: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ\n\n(١٠٠ مرة)', periods: ['morning', 'evening'] },
    { id: 'asbahna_amsayna', label: 'Asbahna/Amsayna Dua', arabic: 'اللهم بك أصبحنا / أمسينا', fullArabic: 'اللَّهُمَّ بِكَ أَصْبَحْنَا وَبِكَ أَمْسَيْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ\n\n(المساء: اللَّهُمَّ بِكَ أَمْسَيْنَا وَبِكَ أَصْبَحْنَا وَبِكَ نَحْيَا وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ)', periods: ['morning', 'evening'] },
    { id: 'asalukal_aafiyah', label: "As'alukal Aafiyah", arabic: 'اللهم إني أسألك العافية', fullArabic: 'اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ وَمِنْ خَلْفِي وَعَنْ يَمِينِي وَعَنْ شِمَالِي وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي', periods: ['morning', 'evening'] },
    { id: 'aalimal_ghayb', label: 'Aalimal Ghayb', arabic: 'اللهم عالم الغيب والشهادة', fullArabic: 'اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ، فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ', periods: ['morning', 'evening'] },
    { id: 'fitratil_islam', label: 'Ala Fitratil Islam', arabic: 'أصبحنا على فطرة الإسلام', fullArabic: 'أَصْبَحْنَا عَلَى فِطْرَةِ الْإِسْلَامِ وَعَلَى كَلِمَةِ الْإِخْلَاصِ وَعَلَى دِينِ نَبِيِّنَا مُحَمَّدٍ صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ وَعَلَى مِلَّةِ أَبِينَا إِبْرَاهِيمَ حَنِيفًا مُسْلِمًا وَمَا كَانَ مِنَ الْمُشْرِكِينَ', periods: ['morning', 'evening'] },
    { id: 'adada_khalqihi', label: 'Subhanallahi adada khalqihi (3x)', arabic: 'سبحان الله وبحمده عدد خلقه', fullArabic: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ\n\n(٣ مرات)', periods: ['morning', 'evening'] },
    { id: 'la_yadurru', label: 'Bismillahilladhi la yadurru (3x)', arabic: 'بسم الله الذي لا يضر مع اسمه شيء', fullArabic: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ\n\n(٣ مرات)', periods: ['morning', 'evening'] },
    { id: 'audhu_bikalimatillah', label: "A'udhu bikalimatillah", arabic: 'أعوذ بكلمات الله التامات', fullArabic: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ\n\n(٣ مرات)', periods: ['evening'] },
];

const DEFAULT_LOG: Partial<IbadahLog> = {
    fajr_status: 'none',
    dhuhr_status: 'none',
    asr_status: 'none',
    maghrib_status: 'none',
    isha_status: 'none',
    taraweeh_status: 'none',
    quran_minutes: 0,
    tahajjud: false,
    dhikr: false,
    sadaqah: false,
    sunnah_before: false,
    sunnah_after: false,
    surah_yaseen: false,
    surah_mulk: false,
    surah_sajdah: false,
    surah_waqiah: false,
    morning_adhkar: false,
    evening_adhkar: false,
    adhkar_checklist: { morning: [], evening: [] },
    missed_reasons: {},
};

export function IbadahDayDetail({ day, monthName, hijriKey, log, onSave, onClose }: IbadahDayDetailProps) {
    const [localLog, setLocalLog] = useState<Partial<IbadahLog>>(log || DEFAULT_LOG);
    const [saving, setSaving] = useState(false);
    const [activeMissedPrayer, setActiveMissedPrayer] = useState<string | null>(null);
    const [activeAdhkarItem, setActiveAdhkarItem] = useState<typeof ADHKAR_ITEMS[number] | null>(null);

    const handleStatusChange = (prayerId: string, status: IbadahStatus) => {
        setLocalLog(prev => ({
            ...prev,
            [`${prayerId}_status`]: status,
        }));

        if (status === 'missed') {
            setActiveMissedPrayer(prayerId);
        } else {
            const newReasons = { ...(localLog.missed_reasons || {}) };
            delete newReasons[prayerId];
            setLocalLog(prev => ({ ...prev, missed_reasons: newReasons }));
        }
    };

    const handleReasonSelect = (reason: string) => {
        if (!activeMissedPrayer) return;
        setLocalLog(prev => ({
            ...prev,
            missed_reasons: {
                ...(prev.missed_reasons || {}),
                [activeMissedPrayer]: reason,
            },
        }));
        setActiveMissedPrayer(null);
    };

    const handleSave = async () => {
        setSaving(true);
        await onSave(localLog);
        setSaving(false);
        onClose();
    };

    const toggleField = (field: keyof IbadahLog) => (checked: boolean) => {
        setLocalLog(prev => ({ ...prev, [field]: checked }));
    };

    const toggleAdhkarItem = (period: 'morning' | 'evening', itemId: string, checked: boolean) => {
        setLocalLog(prev => {
            const checklist = prev.adhkar_checklist || { morning: [], evening: [] };
            const currentItems = checklist[period] || [];
            const newItems = checked
                ? [...currentItems, itemId]
                : currentItems.filter(id => id !== itemId);
            const newChecklist = { ...checklist, [period]: newItems };
            // Also update legacy booleans for backward compat
            const morningCount = newChecklist.morning?.length || 0;
            const eveningCount = newChecklist.evening?.length || 0;
            return {
                ...prev,
                adhkar_checklist: newChecklist,
                morning_adhkar: morningCount > 0,
                evening_adhkar: eveningCount > 0,
            };
        });
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-primary">{monthName} Day {day} - Ibadah Log</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Obligatory Prayers */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Obligatory Prayers</h3>
                        <div className="grid gap-4">
                            {PRAYERS.map((prayer) => {
                                const statusKey = `${prayer.id}_status` as keyof IbadahLog;
                                const status = (localLog[statusKey] as IbadahStatus) || 'none';
                                const reason = localLog.missed_reasons?.[prayer.id];

                                return (
                                    <div key={prayer.id} className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor={prayer.id} className="text-base font-medium">{prayer.label}</Label>
                                            <div className="flex bg-muted rounded-lg p-1 gap-1">
                                                <StatusButton active={status === 'completed'} onClick={() => handleStatusChange(prayer.id, 'completed')} variant="success">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                </StatusButton>
                                                <StatusButton active={status === 'delayed'} onClick={() => handleStatusChange(prayer.id, 'delayed')} variant="warning">
                                                    <Clock className="h-4 w-4" />
                                                </StatusButton>
                                                <StatusButton active={status === 'missed'} onClick={() => handleStatusChange(prayer.id, 'missed')} variant="error">
                                                    <XCircle className="h-4 w-4" />
                                                </StatusButton>
                                            </div>
                                        </div>

                                        {status === 'missed' && reason && (
                                            <Alert className="py-2 px-3 bg-destructive/10 border-destructive/20">
                                                <Info className="h-4 w-4 text-destructive" />
                                                <div className="ml-2">
                                                    <p className="text-xs font-semibold text-destructive">Reason: {reason}</p>
                                                    <p className="text-[10px] text-destructive/80 mt-1">
                                                        {CORRECTIVE_SUGGESTIONS[reason]}
                                                    </p>
                                                </div>
                                            </Alert>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sunnah Prayers */}
                    <div className="space-y-4 pt-2 border-t border-border">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Sunnah Prayers</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base">Sunnah Before Prayer</Label>
                                <Switch checked={localLog.sunnah_before} onCheckedChange={toggleField('sunnah_before')} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-base">Sunnah After Prayer</Label>
                                <Switch checked={localLog.sunnah_after} onCheckedChange={toggleField('sunnah_after')} />
                            </div>
                        </div>
                    </div>

                    {/* Qur'an Recitation */}
                    <div className="space-y-4 pt-2 border-t border-border">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <BookOpen className="h-4 w-4" /> Qur'an Recitation
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="flex flex-col">
                                    <span>Quran Reading</span>
                                    <span className="text-xs font-normal text-muted-foreground">Approx. minutes today</span>
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        value={localLog.quran_minutes || ''}
                                        onChange={(e) => setLocalLog(prev => ({ ...prev, quran_minutes: parseInt(e.target.value) || 0 }))}
                                        className="w-20 text-right"
                                    />
                                    <span className="text-sm text-muted-foreground">min</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-base">Surah Yaseen</Label>
                                <Switch checked={localLog.surah_yaseen} onCheckedChange={toggleField('surah_yaseen')} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-base">Surah Mulk</Label>
                                <Switch checked={localLog.surah_mulk} onCheckedChange={toggleField('surah_mulk')} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-base">Surah Sajdah</Label>
                                <Switch checked={localLog.surah_sajdah} onCheckedChange={toggleField('surah_sajdah')} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-base">Surah Waqiah</Label>
                                <Switch checked={localLog.surah_waqiah} onCheckedChange={toggleField('surah_waqiah')} />
                            </div>
                        </div>
                    </div>

                    {/* Daily Adhkar Checklist */}
                    <div className="space-y-4 pt-2 border-t border-border">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            Daily Adhkar
                        </h3>

                        {(['morning', 'evening'] as const).map(period => {
                            const items = ADHKAR_ITEMS.filter(item => item.periods.includes(period));
                            const checklist = localLog.adhkar_checklist || { morning: [], evening: [] };
                            const checkedCount = checklist[period]?.length || 0;

                            return (
                                <Collapsible key={period}>
                                    <CollapsibleTrigger className="flex items-center justify-between w-full py-2 px-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                                        <span className="flex items-center gap-2 text-sm font-medium">
                                            {period === 'morning' ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-indigo-500" />}
                                            {period === 'morning' ? 'Morning' : 'Evening'} Adhkar
                                            <span className="text-xs text-muted-foreground">({checkedCount}/{items.length})</span>
                                        </span>
                                        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="pt-2 space-y-1">
                                        {items.map(item => {
                                            const isChecked = checklist[period]?.includes(item.id) || false;
                                            return (
                                                <div
                                                    key={item.id}
                                                    className="flex items-start gap-3 py-2 px-3 rounded-md hover:bg-muted/30 transition-colors"
                                                >
                                                    <Checkbox
                                                        checked={isChecked}
                                                        onCheckedChange={(checked) => toggleAdhkarItem(period, item.id, !!checked)}
                                                        className="mt-0.5"
                                                    />
                                                    <button
                                                        type="button"
                                                        className="flex-1 min-w-0 text-left"
                                                        onClick={() => setActiveAdhkarItem(item)}
                                                    >
                                                        <p className="text-sm font-medium leading-tight text-primary underline-offset-2 hover:underline">{item.label}</p>
                                                        <p className="text-xs text-muted-foreground mt-0.5 font-arabic" dir="rtl">{item.arabic}</p>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </CollapsibleContent>
                                </Collapsible>
                            );
                        })}
                    </div>

                    {/* Extra Ibadah */}
                    <div className="space-y-4 pt-2 border-t border-border">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Extra Ibadah</h3>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base">Tahajjud</Label>
                                <Switch checked={localLog.tahajjud} onCheckedChange={toggleField('tahajjud')} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-base">Dhikr</Label>
                                <Switch checked={localLog.dhikr} onCheckedChange={toggleField('dhikr')} />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-base">Sadaqah</Label>
                                <Switch checked={localLog.sadaqah} onCheckedChange={toggleField('sadaqah')} />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                        <Button className="flex-1" onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : 'Save for Day ' + day}
                        </Button>
                    </div>
                </div>

                {/* Missed Reason Choice */}
                {activeMissedPrayer && (
                    <div className="absolute inset-0 bg-background/95 flex items-center justify-center p-6 z-50">
                        <Card className="w-full">
                            <div className="p-4 space-y-4">
                                <h4 className="font-bold flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-destructive" />
                                    Why was it missed?
                                </h4>
                                <div className="grid gap-2">
                                    {MISSED_REASONS.map(reason => (
                                        <Button
                                            key={reason}
                                            variant="outline"
                                            className="justify-start h-auto py-3 px-4"
                                            onClick={() => handleReasonSelect(reason)}
                                        >
                                            {reason}
                                        </Button>
                                    ))}
                                </div>
                                <Button variant="ghost" className="w-full text-xs" onClick={() => setActiveMissedPrayer(null)}>
                                    Cancel
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function StatusButton({ active, onClick, variant, children }: {
    active: boolean;
    onClick: () => void;
    variant: 'success' | 'warning' | 'error';
    children: React.ReactNode;
}) {
    const getColors = () => {
        if (!active) return 'text-muted-foreground hover:bg-background/50';
        switch (variant) {
            case 'success': return 'bg-emerald-500 text-white';
            case 'warning': return 'bg-amber-500 text-white';
            case 'error': return 'bg-rose-500 text-white';
        }
    };

    return (
        <button
            onClick={onClick}
            className={`p-2 rounded-md transition-all duration-200 ${getColors()}`}
        >
            {children}
        </button>
    );
}
