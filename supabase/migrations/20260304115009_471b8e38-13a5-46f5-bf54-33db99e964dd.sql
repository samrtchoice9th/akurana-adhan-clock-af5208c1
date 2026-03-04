
-- 1. Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  masjid_name text,
  city text,
  province text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 2. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, masjid_name, city, province)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'masjid_name',
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'province'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Update ramadan_ibadah_logs RLS policies
DROP POLICY IF EXISTS "Anyone can insert their own logs" ON public.ramadan_ibadah_logs;
DROP POLICY IF EXISTS "Anyone can select their own logs" ON public.ramadan_ibadah_logs;
DROP POLICY IF EXISTS "Anyone can update their own logs" ON public.ramadan_ibadah_logs;

CREATE POLICY "Authenticated users insert own logs" ON public.ramadan_ibadah_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Authenticated users select own logs" ON public.ramadan_ibadah_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

CREATE POLICY "Authenticated users update own logs" ON public.ramadan_ibadah_logs
  FOR UPDATE TO authenticated USING (user_id = auth.uid()::text);
