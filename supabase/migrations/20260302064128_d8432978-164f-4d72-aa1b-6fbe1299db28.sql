
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- system_logs table
CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read system_logs" ON public.system_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert system_logs" ON public.system_logs FOR INSERT WITH CHECK (true);

-- Index for querying recent logs
CREATE INDEX idx_system_logs_created ON public.system_logs (created_at DESC);
