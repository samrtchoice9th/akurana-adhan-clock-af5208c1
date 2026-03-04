

# Login System for Ibadah Chart Personalization

## Overview

Add a lightweight authentication system so each user has a unique account. Ibadah data will be linked to the authenticated user's ID instead of the volatile device ID. The login/signup flow will be accessible from the Ibadah Chart page (redirecting unauthenticated users) and optionally from Settings.

## Database Changes

### 1. Create `profiles` table

```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
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
```

### 2. Auto-create profile on signup (trigger)

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 3. Update `ramadan_ibadah_logs` RLS policies

Update existing RLS policies so authenticated users can only access their own rows:

```sql
-- Drop old open policies
DROP POLICY "Anyone can insert their own logs" ON public.ramadan_ibadah_logs;
DROP POLICY "Anyone can select their own logs" ON public.ramadan_ibadah_logs;
DROP POLICY "Anyone can update their own logs" ON public.ramadan_ibadah_logs;

-- New policies using auth.uid()
CREATE POLICY "Authenticated users insert own logs" ON public.ramadan_ibadah_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Authenticated users select own logs" ON public.ramadan_ibadah_logs
  FOR SELECT TO authenticated USING (user_id = auth.uid()::text);

CREATE POLICY "Authenticated users update own logs" ON public.ramadan_ibadah_logs
  FOR UPDATE TO authenticated USING (user_id = auth.uid()::text);
```

## New Files

### 1. `src/hooks/useAuth.ts`

Auth hook wrapping Supabase auth:
- `user`, `session`, `loading` state
- `signUp(email, password, metadata)` -- metadata includes full_name, masjid_name, city, province
- `signIn(email, password)`
- `signOut()`
- `onAuthStateChange` listener set up before `getSession()`

### 2. `src/pages/Auth.tsx`

A single page with Login/Register tabs:
- **Login tab**: Email + Password fields
- **Register tab**: Email, Password, Full Name, Masjid Name, City, Province fields
- After successful login/signup, redirect to `/ramadan-chart`
- Clean design matching existing theme (cards, primary colors)

### 3. `src/components/AuthGuard.tsx`

A wrapper component that checks auth state and redirects to `/auth` if not logged in. Used to protect the Ramadan Chart route.

## Modified Files

### 1. `src/hooks/useIbadah.ts`

- Replace `deviceId` with `user.id` from auth context
- If user is not authenticated, return empty state (no anonymous tracking)
- `saveLog` uses `auth.uid()` as `user_id`

### 2. `src/App.tsx`

- Add `/auth` route pointing to `Auth.tsx`
- Wrap `/ramadan-chart` route with `AuthGuard`
- Provide auth context at app level

### 3. `src/pages/RamadanChart.tsx`

- Display user's name and masjid from profile in the header
- Add logout button

### 4. `src/pages/Settings.tsx`

- Add a "Login / Account" card section showing login status
- If logged in: show name, masjid, logout button
- If not logged in: link to `/auth`

## Auth Flow

```text
User opens /ramadan-chart
  |
  +--> AuthGuard checks session
  |      |
  |      +--> No session → redirect to /auth
  |      +--> Has session → render chart
  |
  /auth page
  |
  +--> Register: email, password, full_name, masjid_name, city, province
  |      +--> signUp() with metadata
  |      +--> Trigger creates profile row
  |      +--> Email verification required (no auto-confirm)
  |
  +--> Login: email, password
         +--> signIn()
         +--> Redirect to /ramadan-chart
```

## Data Migration Note

Existing device-based data in `ramadan_ibadah_logs` will remain but won't be accessible to new authenticated users (different `user_id`). This is acceptable since the old device-ID approach was unreliable anyway. If needed, a manual migration script could reassign old rows to new user IDs, but this is outside the current scope.

## Security

- Email verification required before login (no auto-confirm)
- RLS policies restrict data to authenticated user's own rows only
- Profile data protected by RLS
- No client-side role checks or localStorage-based auth

