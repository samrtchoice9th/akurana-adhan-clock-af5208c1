ALTER TABLE public.ramadan_ibadah_logs
  ADD COLUMN IF NOT EXISTS adhkar_checklist jsonb DEFAULT '{"morning":[],"evening":[]}'::jsonb;