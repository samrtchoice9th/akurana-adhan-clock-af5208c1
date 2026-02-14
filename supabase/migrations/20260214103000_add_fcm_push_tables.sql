CREATE TABLE IF NOT EXISTS public.users_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL,
  device_id TEXT NOT NULL,
  location TEXT,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('10min','5min','adhan','iqamah')),
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  platform TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (device_id, reminder_type)
);

CREATE TABLE IF NOT EXISTS public.daily_prayer_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  fajr TEXT NOT NULL,
  dhuhr TEXT NOT NULL,
  asr TEXT NOT NULL,
  maghrib TEXT NOT NULL,
  isha TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_sent_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL,
  prayer_name TEXT NOT NULL,
  reminder_type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.users_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_prayer_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_sent_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read push tokens" ON public.users_push_tokens;
DROP POLICY IF EXISTS "Anyone can insert push tokens" ON public.users_push_tokens;
DROP POLICY IF EXISTS "Anyone can update push tokens" ON public.users_push_tokens;
DROP POLICY IF EXISTS "Anyone can delete push tokens" ON public.users_push_tokens;
CREATE POLICY "Anyone can read push tokens" ON public.users_push_tokens FOR SELECT USING (true);
CREATE POLICY "Anyone can insert push tokens" ON public.users_push_tokens FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update push tokens" ON public.users_push_tokens FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete push tokens" ON public.users_push_tokens FOR DELETE USING (true);

DROP POLICY IF EXISTS "Anyone can read daily prayer times" ON public.daily_prayer_times;
DROP POLICY IF EXISTS "Anyone can upsert daily prayer times" ON public.daily_prayer_times;
CREATE POLICY "Anyone can read daily prayer times" ON public.daily_prayer_times FOR SELECT USING (true);
CREATE POLICY "Anyone can upsert daily prayer times" ON public.daily_prayer_times FOR ALL USING (true);

DROP POLICY IF EXISTS "Anyone can read notification sent logs" ON public.notification_sent_log;
DROP POLICY IF EXISTS "Anyone can insert notification sent logs" ON public.notification_sent_log;
CREATE POLICY "Anyone can read notification sent logs" ON public.notification_sent_log FOR SELECT USING (true);
CREATE POLICY "Anyone can insert notification sent logs" ON public.notification_sent_log FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_users_push_tokens_token ON public.users_push_tokens(token);
CREATE INDEX IF NOT EXISTS idx_users_push_tokens_enabled ON public.users_push_tokens(notifications_enabled);
CREATE INDEX IF NOT EXISTS idx_notification_sent_log_sent_at ON public.notification_sent_log(sent_at);
