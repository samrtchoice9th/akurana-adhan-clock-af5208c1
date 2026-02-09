
-- Create prayer_times table
CREATE TABLE public.prayer_times (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  hijri_date TEXT,
  subah_adhan TEXT,
  subah_iqamath TEXT,
  sunrise TEXT,
  luhar_adhan TEXT,
  luhar_iqamath TEXT,
  asr_adhan TEXT,
  asr_iqamath TEXT,
  magrib_adhan TEXT,
  magrib_iqamath TEXT,
  isha_adhan TEXT,
  isha_iqamath TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prayer_times ENABLE ROW LEVEL SECURITY;

-- Everyone can read prayer times (public display)
CREATE POLICY "Anyone can read prayer times"
  ON public.prayer_times
  FOR SELECT
  USING (true);

-- Anyone can insert (admin will be password-gated in the app)
CREATE POLICY "Anyone can insert prayer times"
  ON public.prayer_times
  FOR INSERT
  WITH CHECK (true);

-- Anyone can update
CREATE POLICY "Anyone can update prayer times"
  ON public.prayer_times
  FOR UPDATE
  USING (true);

-- Anyone can delete
CREATE POLICY "Anyone can delete prayer times"
  ON public.prayer_times
  FOR DELETE
  USING (true);

-- Create index on date for fast lookups
CREATE INDEX idx_prayer_times_date ON public.prayer_times (date);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_prayer_times_updated_at
  BEFORE UPDATE ON public.prayer_times
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
