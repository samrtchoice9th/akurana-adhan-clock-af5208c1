import { useEffect } from 'react';
import { format } from 'date-fns';
import { useClock } from '@/hooks/useClock';
import { usePrayerTimes, getPrayerList, getNextPrayerIndex, getCountdown, getPrayerPhase } from '@/hooks/usePrayerTimes';
import { useHijriDate, formatHijriDate } from '@/hooks/useHijriDate';
import { useNotifications } from '@/hooks/useNotifications';
import { useTheme } from '@/hooks/useTheme';
import { useLocation } from '@/hooks/useLocation';
import { NextPrayerCard } from '@/components/NextPrayerCard';
import { PrayerRow } from '@/components/PrayerRow';
import { JumuahBanner } from '@/components/JumuahBanner';
import { HadithBanner } from '@/components/HadithBanner';
import { Settings as SettingsIcon, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const now = useClock();
  const { merged, loading, error } = usePrayerTimes();
  const { hijri } = useHijriDate();
  const { setIsRamadan, isRamadan } = useTheme();
  const { offsetMinutes } = useLocation();
  const prayers = getPrayerList(merged, offsetMinutes);
  const nextIndex = getNextPrayerIndex(prayers, now);
  const countdown = getCountdown(prayers, nextIndex, now);
  const phase = nextIndex >= 0 ? getPrayerPhase(prayers[nextIndex], now) : 'passed';
  const hijriDisplay = formatHijriDate(hijri);

  // Auto-activate Ramadan theme
  useEffect(() => {
    if (hijri) {
      setIsRamadan(hijri.hijri_month === 9);
    }
  }, [hijri?.hijri_month, setIsRamadan]);

  // Initialize notifications (runs in background)
  useNotifications(prayers);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center px-4 py-6 max-w-md mx-auto">
      {/* Hadith Banner */}
      <HadithBanner />

      {/* Friday Banner */}
      <JumuahBanner hijriDisplay={hijriDisplay} />

      {/* Header */}
      <header className="w-full text-center mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="w-8" />
          <div className="flex items-center gap-2">
            {isRamadan && <Moon className="h-4 w-4 text-primary" />}
            <h1 className="text-lg font-bold text-primary tracking-wide">AKURANA PRAYER TIME</h1>
            {isRamadan && <Moon className="h-4 w-4 text-primary" />}
          </div>
          <Link to="/settings" className="text-muted-foreground hover:text-foreground transition-colors">
            <SettingsIcon className="h-5 w-5" />
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
        {hijriDisplay && (
          <p className="text-sm text-primary/80 mt-1">{hijriDisplay}</p>
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
          {nextIndex >= 0 && (
            <NextPrayerCard prayer={prayers[nextIndex]} countdown={countdown} phase={phase} />
          )}

          <div className="flex items-center justify-between px-4 text-xs text-muted-foreground uppercase tracking-wider">
            <span>Prayer</span>
            <div className="flex items-center gap-6">
              <span className="min-w-[70px] text-center text-primary/70">Adhan</span>
              <span className="min-w-[70px] text-center text-secondary/70">Iqamath</span>
            </div>
          </div>

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
