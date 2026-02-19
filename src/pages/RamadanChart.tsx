import { useState } from 'react';
import { useIbadah, IbadahLog } from '@/hooks/useIbadah';
import { IbadahDayDetail } from '../components/IbadahDayDetail';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Trophy, Calendar as CalendarIcon, ArrowLeft, Target, Heart, BookOpen, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RamadanChart() {
    const { logs, loading, saveLog, calculateScore, getWeeklyReport } = useIbadah();
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    if (loading) {
        return <div className="flex items-center justify-center p-12">Loading Chart...</div>;
    }

    const days = Array.from({ length: 30 }, (_, i) => i + 1);
    const weeklyReport = getWeeklyReport();

    const getDayStatusColor = (day: number) => {
        const log = logs[String(day)];
        if (!log) return 'bg-muted/30 border-dashed';

        const score = calculateScore(log);
        if (score >= 80) return 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]';
        if (score >= 50) return 'bg-amber-500/20 border-amber-500/50';
        return 'bg-rose-500/20 border-rose-500/50';
    };

    const currentDayLog = selectedDay ? logs[String(selectedDay)] : null;
    const currentScore = Object.values(logs).length > 0
        ? Math.round(Object.values(logs).reduce((acc, log) => acc + calculateScore(log), 0) / Object.values(logs).length)
        : 0;

    return (
        <div className="min-h-screen bg-background p-4 py-8 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link to="/" className="p-2 hover:bg-muted rounded-full transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-primary">Ibadah Chart</h1>
                </div>
                <Badge variant="outline" className="px-3 py-1 text-sm bg-primary/5 border-primary/20 text-primary">
                    Ramadan 1447 AH
                </Badge>
            </div>

            {/* Summary Score */}
            <Card className="bg-card border-border overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Trophy className="h-24 w-24 text-primary" />
                </div>
                <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-muted-foreground">Overall Discipline Score</p>
                            <div className="flex items-end gap-2">
                                <span className="text-5xl font-black text-foreground">{currentScore}%</span>
                                <span className="text-sm font-bold text-emerald-500 mb-2">Steady Progress</span>
                            </div>
                        </div>
                        <div className="w-full sm:w-64 space-y-2">
                            <div className="flex justify-between text-xs font-medium">
                                <span>Monthly Goal</span>
                                <span>80%</span>
                            </div>
                            <Progress value={currentScore} className="h-2" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Weekly Insight */}
            {weeklyReport && (
                <Alert className="bg-primary/5 border-primary/20">
                    <Target className="h-4 w-4 text-primary" />
                    <AlertTitle className="text-primary font-bold">Weekly Performance Insight</AlertTitle>
                    <AlertDescription className="mt-2 text-foreground/80 leading-relaxed">
                        {weeklyReport.suggestion}
                    </AlertDescription>
                </Alert>
            )}

            {/* Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-3">
                {days.map((day) => {
                    const log = logs[String(day)];
                    const score = log ? calculateScore(log) : null;

                    return (
                        <button
                            key={day}
                            onClick={() => setSelectedDay(day)}
                            className={`
                aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all duration-200
                hover:scale-105 active:scale-95
                ${getDayStatusColor(day)}
              `}
                        >
                            <span className="text-xs font-bold text-muted-foreground mb-0.5">DAY</span>
                            <span className="text-xl font-black text-foreground leading-none">{day}</span>
                            {score !== null && (
                                <span className="text-[10px] font-bold text-foreground/60 mt-1">{score}%</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 py-4 px-6 border border-dashed border-border rounded-xl text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-emerald-500/40 border border-emerald-500/50" />
                    <span>80-100% Strong</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-amber-500/40 border border-amber-500/50" />
                    <span>50-79% Inconsistent</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-rose-500/40 border border-rose-500/50" />
                    <span>1-49% Weak</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-muted/40 border border-dashed border-border" />
                    <span>Untracked</span>
                </div>
            </div>

            {/* Bottom Insights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InsightCard
                    icon={<BookOpen className="h-4 w-4 text-emerald-500" />}
                    label="Quran Progress"
                    value={Object.values(logs).reduce((acc, l) => acc + l.quran_minutes, 0) + ' min'}
                />
                <InsightCard
                    icon={<Heart className="h-4 w-4 text-rose-500" />}
                    label="Good Deeds"
                    value={Object.values(logs).filter(l => l.sadaqah).length.toString()}
                />
                <InsightCard
                    icon={<AlertCircle className="h-4 w-4 text-amber-500" />}
                    label="Most Missed"
                    value={weeklyReport?.missedFajr && weeklyReport.missedFajr > 0 ? "Fajr" : "None"}
                />
            </div>

            {/* Logging Detail Modal */}
            {selectedDay && (
                <IbadahDayDetail
                    day={String(selectedDay)}
                    log={logs[String(selectedDay)]}
                    onSave={(updates) => saveLog(String(selectedDay), updates)}
                    onClose={() => setSelectedDay(null)}
                />
            )}
        </div>
    );
}

function InsightCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-muted rounded-lg">{icon}</div>
                <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</p>
                    <p className="text-lg font-black text-foreground leading-tight">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}
