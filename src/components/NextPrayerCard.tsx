import type { PrayerEntry } from '@/hooks/usePrayerTimes';
import { Badge } from '@/components/ui/badge';

interface NextPrayerCardProps {
  prayer: PrayerEntry;
  countdown: string;
}

export function NextPrayerCard({ prayer, countdown }: NextPrayerCardProps) {
  return (
    <div className="relative rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-secondary/5 p-5 shadow-[0_0_30px_hsl(var(--primary)/0.1)]">
      <div className="flex items-center justify-between mb-3">
        <Badge className="bg-primary/20 text-primary border-primary/30 text-xs font-semibold">
          NEXT
        </Badge>
        {countdown && (
          <span className="text-muted-foreground text-sm font-mono">{countdown}</span>
        )}
      </div>
      <h2 className="text-2xl font-bold text-primary mb-4">{prayer.name}</h2>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Adhan</p>
          <p className="text-2xl font-mono font-bold text-primary">{prayer.adhan || '—'}</p>
        </div>
        {prayer.hasIqamath && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Iqamath</p>
            <p className="text-2xl font-mono font-bold text-secondary">{prayer.iqamath || '—'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
