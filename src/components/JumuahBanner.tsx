import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface JumuahBannerProps {
  hijriDisplay: string;
}

export function JumuahBanner({ hijriDisplay }: JumuahBannerProps) {
  const [visible, setVisible] = useState(true);
  const isFriday = new Date().getDay() === 5;

  useEffect(() => {
    if (!isFriday) return;
    const timer = setTimeout(() => setVisible(false), 10000);
    return () => clearTimeout(timer);
  }, [isFriday]);

  if (!isFriday || !visible) return null;

  return (
    <div className="w-full rounded-xl bg-primary/15 border border-primary/30 px-4 py-3 mb-4 animate-in fade-in slide-in-from-top-2 duration-500 relative">
      <button
        onClick={() => setVisible(false)}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="text-center text-lg font-bold text-primary">Jumu'ah Mubarak</p>
      {hijriDisplay && (
        <p className="text-center text-xs text-muted-foreground mt-1">{hijriDisplay}</p>
      )}
    </div>
  );
}
