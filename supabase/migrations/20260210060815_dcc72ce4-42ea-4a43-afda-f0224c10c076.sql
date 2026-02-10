
-- Table: prayer_time_changes (CSV change-point rows)
CREATE TABLE public.prayer_time_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  effective_from date NOT NULL UNIQUE,
  subah_adhan text,
  sunrise text,
  luhar_adhan text,
  asr_adhan text,
  magrib_adhan text,
  isha_adhan text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prayer_time_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prayer_time_changes" ON public.prayer_time_changes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert prayer_time_changes" ON public.prayer_time_changes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update prayer_time_changes" ON public.prayer_time_changes FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete prayer_time_changes" ON public.prayer_time_changes FOR DELETE USING (true);

-- Table: hijri_date (single row, admin-controlled)
CREATE TABLE public.hijri_date (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hijri_year integer NOT NULL,
  hijri_month integer NOT NULL,
  hijri_day integer NOT NULL,
  last_updated date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hijri_date ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read hijri_date" ON public.hijri_date FOR SELECT USING (true);
CREATE POLICY "Anyone can insert hijri_date" ON public.hijri_date FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update hijri_date" ON public.hijri_date FOR UPDATE USING (true);

-- Seed initial Hijri date row
INSERT INTO public.hijri_date (hijri_year, hijri_month, hijri_day) VALUES (1447, 8, 1);
