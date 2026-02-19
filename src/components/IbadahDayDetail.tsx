import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, XCircle, Clock, Info } from 'lucide-react';
import { IbadahLog, IbadahStatus, MISSED_REASONS, CORRECTIVE_SUGGESTIONS } from '@/hooks/useIbadah';

interface IbadahDayDetailProps {
    day: string;
    log: IbadahLog | undefined;
    onSave: (updates: Partial<IbadahLog>) => Promise<any>;
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

export function IbadahDayDetail({ day, log, onSave, onClose }: IbadahDayDetailProps) {
    const [localLog, setLocalLog] = useState<Partial<IbadahLog>>(log || {
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
        missed_reasons: {},
    });
    const [saving, setSaving] = useState(false);
    const [activeMissedPrayer, setActiveMissedPrayer] = useState<string | null>(null);

    const handleStatusChange = (prayerId: string, status: IbadahStatus) => {
        setLocalLog(prev => ({
            ...prev,
            [`${prayerId}_status`]: status,
        }));

        if (status === 'missed') {
            setActiveMissedPrayer(prayerId);
        } else {
            // Remove reason if no longer missed
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

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-primary">Ramadan Day {day} - Ibadah Log</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Obligatory Prayers */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Obligatory Prayers</h3>
                        <div className="grid gap-4">
                            {PRAYERS.map((prayer) => {
                                const status = (localLog as any)[`${prayer.id}_status`] as IbadahStatus;
                                const reason = localLog.missed_reasons?.[prayer.id];

                                return (
                                    <div key={prayer.id} className="flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor={prayer.id} className="text-base font-medium">{prayer.label}</Label>
                                            <div className="flex bg-muted rounded-lg p-1 gap-1">
                                                <StatusButton
                                                    active={status === 'completed'}
                                                    onClick={() => handleStatusChange(prayer.id, 'completed')}
                                                    variant="success"
                                                >
                                                    <CheckCircle2 className="h-4 w-4" />
                                                </StatusButton>
                                                <StatusButton
                                                    active={status === 'delayed'}
                                                    onClick={() => handleStatusChange(prayer.id, 'delayed')}
                                                    variant="warning"
                                                >
                                                    <Clock className="h-4 w-4" />
                                                </StatusButton>
                                                <StatusButton
                                                    active={status === 'missed'}
                                                    onClick={() => handleStatusChange(prayer.id, 'missed')}
                                                    variant="error"
                                                >
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

                    {/* Extra Ibadah */}
                    <div className="space-y-4 pt-2 border-t border-border">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Extra Ibadah</h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="quran" className="flex flex-col">
                                    <span>Quran Reading</span>
                                    <span className="text-xs font-normal text-muted-foreground">Approx. minutes today</span>
                                </Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="quran"
                                        type="number"
                                        value={localLog.quran_minutes || ''}
                                        onChange={(e) => setLocalLog(prev => ({ ...prev, quran_minutes: parseInt(e.target.value) || 0 }))}
                                        className="w-20 text-right"
                                    />
                                    <span className="text-sm text-muted-foreground">min</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="tahajjud" className="text-base">Tahajjud</Label>
                                <Switch
                                    id="tahajjud"
                                    checked={localLog.tahajjud}
                                    onCheckedChange={(checked) => setLocalLog(prev => ({ ...prev, tahajjud: checked }))}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="dhikr" className="text-base">Dhikr</Label>
                                <Switch
                                    id="dhikr"
                                    checked={localLog.dhikr}
                                    onCheckedChange={(checked) => setLocalLog(prev => ({ ...prev, dhikr: checked }))}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="sadaqah" className="text-base">Sadaqah</Label>
                                <Switch
                                    id="sadaqah"
                                    checked={localLog.sadaqah}
                                    onCheckedChange={(checked) => setLocalLog(prev => ({ ...prev, sadaqah: checked }))}
                                />
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

                {/* Missed Reason Choice (Internal Modal state) */}
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

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-card border border-border rounded-xl shadow-lg ${className}`}>
            {children}
        </div>
    );
}
