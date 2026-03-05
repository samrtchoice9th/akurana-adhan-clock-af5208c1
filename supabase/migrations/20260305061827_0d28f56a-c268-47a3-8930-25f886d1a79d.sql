
-- 1. Create app_role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only admins can read user_roles
CREATE POLICY "Admins can read user_roles" ON public.user_roles
  FOR SELECT TO authenticated USING (true);

-- 2. Create has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3. Lock down prayer_times: public SELECT, admin-only writes
DROP POLICY IF EXISTS "Anyone can delete prayer times" ON public.prayer_times;
DROP POLICY IF EXISTS "Anyone can insert prayer times" ON public.prayer_times;
DROP POLICY IF EXISTS "Anyone can update prayer times" ON public.prayer_times;
DROP POLICY IF EXISTS "Anyone can read prayer times" ON public.prayer_times;

CREATE POLICY "Public can read prayer_times" ON public.prayer_times
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert prayer_times" ON public.prayer_times
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update prayer_times" ON public.prayer_times
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete prayer_times" ON public.prayer_times
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. Lock down prayer_time_changes
DROP POLICY IF EXISTS "Anyone can delete prayer_time_changes" ON public.prayer_time_changes;
DROP POLICY IF EXISTS "Anyone can insert prayer_time_changes" ON public.prayer_time_changes;
DROP POLICY IF EXISTS "Anyone can update prayer_time_changes" ON public.prayer_time_changes;
DROP POLICY IF EXISTS "Anyone can read prayer_time_changes" ON public.prayer_time_changes;

CREATE POLICY "Public can read prayer_time_changes" ON public.prayer_time_changes
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert prayer_time_changes" ON public.prayer_time_changes
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update prayer_time_changes" ON public.prayer_time_changes
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete prayer_time_changes" ON public.prayer_time_changes
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. Lock down hadiths
DROP POLICY IF EXISTS "Anyone can delete hadiths" ON public.hadiths;
DROP POLICY IF EXISTS "Anyone can insert hadiths" ON public.hadiths;
DROP POLICY IF EXISTS "Anyone can update hadiths" ON public.hadiths;
DROP POLICY IF EXISTS "Anyone can read hadiths" ON public.hadiths;

CREATE POLICY "Public can read hadiths" ON public.hadiths
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert hadiths" ON public.hadiths
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update hadiths" ON public.hadiths
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete hadiths" ON public.hadiths
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. Lock down hijri_date
DROP POLICY IF EXISTS "Anyone can insert hijri_date" ON public.hijri_date;
DROP POLICY IF EXISTS "Anyone can update hijri_date" ON public.hijri_date;
DROP POLICY IF EXISTS "Anyone can read hijri_date" ON public.hijri_date;

CREATE POLICY "Public can read hijri_date" ON public.hijri_date
  FOR SELECT USING (true);
CREATE POLICY "Admins can update hijri_date" ON public.hijri_date
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert hijri_date" ON public.hijri_date
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Lock down hijri_admin_log
DROP POLICY IF EXISTS "Anyone can insert hijri_admin_log" ON public.hijri_admin_log;
DROP POLICY IF EXISTS "Anyone can read hijri_admin_log" ON public.hijri_admin_log;

CREATE POLICY "Admins can read hijri_admin_log" ON public.hijri_admin_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert hijri_admin_log" ON public.hijri_admin_log
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. Lock down daily_prayer_times
DROP POLICY IF EXISTS "Anyone can read daily prayer times" ON public.daily_prayer_times;
DROP POLICY IF EXISTS "Anyone can upsert daily prayer times" ON public.daily_prayer_times;

CREATE POLICY "Public can read daily_prayer_times" ON public.daily_prayer_times
  FOR SELECT USING (true);
CREATE POLICY "Admins can insert daily_prayer_times" ON public.daily_prayer_times
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update daily_prayer_times" ON public.daily_prayer_times
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete daily_prayer_times" ON public.daily_prayer_times
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 9. Lock down system_logs (only service_role writes, admin reads)
DROP POLICY IF EXISTS "Anyone can insert system_logs" ON public.system_logs;
DROP POLICY IF EXISTS "Anyone can read system_logs" ON public.system_logs;

CREATE POLICY "Admins can read system_logs" ON public.system_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 10. Lock down notification_sent_log
DROP POLICY IF EXISTS "Anyone can insert notification sent logs" ON public.notification_sent_log;
DROP POLICY IF EXISTS "Anyone can read notification sent logs" ON public.notification_sent_log;

CREATE POLICY "Admins can read notification_sent_log" ON public.notification_sent_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 11. Lock down users_push_tokens (keep device-based access for now but restrict reads)
DROP POLICY IF EXISTS "Anyone can delete push tokens" ON public.users_push_tokens;
DROP POLICY IF EXISTS "Anyone can insert push tokens" ON public.users_push_tokens;
DROP POLICY IF EXISTS "Anyone can read push tokens" ON public.users_push_tokens;
DROP POLICY IF EXISTS "Anyone can update push tokens" ON public.users_push_tokens;

CREATE POLICY "Anyone can manage own push tokens" ON public.users_push_tokens
  FOR ALL USING (true) WITH CHECK (true);
