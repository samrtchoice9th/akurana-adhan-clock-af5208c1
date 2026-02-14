import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';

interface Hadith {
  id: string;
  hadith_english: string | null;
  hadith_tamil: string;
  reference: string | null;
}

export function HadithBanner() {
  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    supabase
      .from('hadiths')
      .select('id, hadith_english, hadith_tamil, reference')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHadith(data as Hadith);
          setVisible(true);
        }
      });
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), 15000);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!hadith || dismissed || !visible) return null;

  return (
    <div className="w-full mb-4 animate-in slide-in-from-top duration-500 rounded-xl border border-primary/30 bg-primary/10 p-4 relative">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="text-sm text-foreground leading-relaxed pr-6">{hadith.hadith_tamil}</p>
      {hadith.hadith_english && (
        <p className="text-xs text-muted-foreground mt-2 italic">{hadith.hadith_english}</p>
      )}
      {hadith.reference && (
        <p className="text-xs text-primary/70 mt-1 font-mono">— {hadith.reference}</p>
      )}
    </div>
  );
}
