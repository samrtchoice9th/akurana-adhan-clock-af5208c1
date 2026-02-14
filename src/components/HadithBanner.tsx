import { useState, useEffect, useCallback } from 'react';
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
  const [dismissed, setDismissed] = useState(false);

  const fetchActiveHadith = useCallback(async () => {
    const { data, error } = await supabase
      .from('hadiths')
      .select('id, hadith_english, hadith_tamil, reference')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Failed to load active hadith:', error.message);
      setHadith(null);
      return;
    }

    setHadith((data as Hadith) ?? null);
  }, []);

  useEffect(() => {
    fetchActiveHadith();
  }, [fetchActiveHadith]);

  if (!hadith || dismissed) return null;

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
