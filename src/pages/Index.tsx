import { format } from 'date-fns';
import { useClock } from '@/hooks/useClock';
import { usePrayerTimes, getPrayerList, getNextPrayerIndex, getCountdown } from '@/hooks/usePrayerTimes';
import { NextPrayerCard } from '@/components/NextPrayerCard';
import { PrayerRow } from '@/components/PrayerRow';
import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const now = useClock();
  const { record, loading, error } = usePrayerTimes();
  const prayers = getPrayerList(record);
  const nextIndex = getNextPrayerIndex(prayers, now);
  const countdown = getCountdown(prayers, nextIndex, now);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-6 max-w-md mx-auto">
      {/* Header */}
      <header className="w-full text-center mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-8" />
          <h1 className="text-lg font-bold text-primary tracking-wide">AKURANA PRAYER TIME</h1>
          <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors">
            <Settings className="h-5 w-5" />
          </Link>
        </div>

        {/* Live Clock */}
        <p className="text-5xl font-mono font-bold text-foreground tracking-wider">
          {format(now, 'hh:mm:ss')}
        </p>
        <p className="text-xs text-muted-foreground font-mono mt-1">{format(now, 'a')}</p>

        {/* Date */}
        <p className="text-sm text-muted-foreground mt-3">
          {format(now, 'EEEE, MMMM d, yyyy')}
        </p>
        {record?.hijri_date && (
          <p className="text-sm text-primary/80 mt-1">{record.hijri_date}</p>
        )}
      </header>

      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading prayer times...</div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-secondary text-center font-medium">{error}</p>
        </div>
      ) : (
        <div className="w-full space-y-4">
          {/* Next Prayer Card */}
          {nextIndex >= 0 && (
            <NextPrayerCard prayer={prayers[nextIndex]} countdown={countdown} />
          )}

          {/* Column Headers */}
          <div className="flex items-center justify-between px-4 text-xs text-muted-foreground uppercase tracking-wider">
            <span>Prayer</span>
            <div className="flex items-center gap-6">
              <span className="min-w-[70px] text-center text-primary/70">Adhan</span>
              <span className="min-w-[70px] text-center text-secondary/70">Iqamath</span>
            </div>
          </div>

          {/* Prayer List */}
          <div className="space-y-2">
            {prayers.map((prayer, i) => (
              <PrayerRow key={prayer.name} prayer={prayer} isNext={i === nextIndex} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
