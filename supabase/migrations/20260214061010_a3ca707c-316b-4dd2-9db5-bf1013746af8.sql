
CREATE TABLE public.hadiths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hadith_english TEXT,
  hadith_tamil TEXT NOT NULL,
  reference TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hadiths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read hadiths" ON public.hadiths FOR SELECT USING (true);
CREATE POLICY "Anyone can insert hadiths" ON public.hadiths FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update hadiths" ON public.hadiths FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete hadiths" ON public.hadiths FOR DELETE USING (true);
