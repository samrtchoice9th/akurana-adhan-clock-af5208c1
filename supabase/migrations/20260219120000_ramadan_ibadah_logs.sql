-- Create ramadan_ibadah_logs table
CREATE TABLE public.ramadan_ibadah_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL, -- Device ID
    masjid_id uuid, -- Optional link to masjid
    hijri_date text NOT NULL, -- Format: YYYY-MM-DD or just Hijri day (1-30)
    
    -- Obligatory Prayers Status: 'completed', 'delayed', 'missed'
    fajr_status text DEFAULT 'missed',
    dhuhr_status text DEFAULT 'missed',
    asr_status text DEFAULT 'missed',
    maghrib_status text DEFAULT 'missed',
    isha_status text DEFAULT 'missed',
    taraweeh_status text DEFAULT 'missed',
    
    -- Extra Ibadah
    quran_minutes integer DEFAULT 0,
    tahajjud boolean DEFAULT false,
    dhikr boolean DEFAULT false,
    sadaqah boolean DEFAULT false,
    
    -- Behavioral Feedback
    missed_reasons jsonb DEFAULT '{}'::jsonb, -- e.g., {"fajr": "overslept"}
    notes text,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    UNIQUE(user_id, hijri_date)
);

-- Enable RLS
ALTER TABLE public.ramadan_ibadah_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can insert their own logs" ON public.ramadan_ibadah_logs 
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can select their own logs" ON public.ramadan_ibadah_logs 
    FOR SELECT USING (true);

CREATE POLICY "Anyone can update their own logs" ON public.ramadan_ibadah_logs 
    FOR UPDATE USING (true);

-- Functions
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.ramadan_ibadah_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
