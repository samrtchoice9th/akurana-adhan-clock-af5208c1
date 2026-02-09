import { cn } from '@/lib/utils';
import { Sun, Sunrise, Moon, CloudSun, Clock } from 'lucide-react';
import type { PrayerEntry } from '@/hooks/usePrayerTimes';

const prayerIcons: Record<string, React.ElementType> = {
  Subah: Moon,
  Sunrise: Sunrise,
  Luhar: Sun,
  Asr: CloudSun,
  Magrib: Sunrise,
  Isha: Moon,
};

interface PrayerRowProps {
  prayer: PrayerEntry;
  isNext: boolean;
}

export function PrayerRow({ prayer, isNext }: PrayerRowProps) {
  const Icon = prayerIcons[prayer.name] || Clock;

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300',
        isNext
          ? 'bg-primary/10 border border-primary/40 shadow-[0_0_15px_hsl(var(--primary)/0.15)]'
          : 'bg-card border border-transparent'
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn('h-5 w-5', isNext ? 'text-primary' : 'text-muted-foreground')} />
        <span className={cn('font-semibold text-base', isNext ? 'text-primary' : 'text-foreground')}>
          {prayer.name}
        </span>
      </div>
      <div className="flex items-center gap-6 text-right">
        <div className="min-w-[70px]">
          <span className="text-primary font-mono font-semibold text-sm">
            {prayer.adhan || '—'}
          </span>
        </div>
        {prayer.hasIqamath && (
          <div className="min-w-[70px]">
            <span className="text-secondary font-mono font-semibold text-sm">
              {prayer.iqamath || '—'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
