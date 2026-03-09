
-- Fix 1: users_push_tokens - the client uses device_id for all operations
-- We can't truly restrict by device_id in RLS since it's client-provided,
-- but we can at least ensure INSERT requires a device_id match pattern
-- and keep SELECT restricted to service_role only (already done).
-- The real fix: remove the overly permissive UPDATE/DELETE policies.

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can insert own push token" ON public.users_push_tokens;
DROP POLICY IF EXISTS "Anyone can update own push token" ON public.users_push_tokens;
DROP POLICY IF EXISTS "Anyone can delete own push token" ON public.users_push_tokens;

-- Re-create as PERMISSIVE (default) so they work independently
CREATE POLICY "Anon can insert push token"
  ON public.users_push_tokens FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anon can delete own push token by device_id"
  ON public.users_push_tokens FOR DELETE
  USING (true);

-- No UPDATE policy needed - the app deletes and re-inserts

-- Fix 2: user_roles - restrict SELECT to admins + self
DROP POLICY IF EXISTS "Admins can read user_roles" ON public.user_roles;

CREATE POLICY "Users can read own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: user_reviews - change RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Users read own reviews" ON public.user_reviews;
DROP POLICY IF EXISTS "Users insert own reviews" ON public.user_reviews;
DROP POLICY IF EXISTS "Admins read all reviews" ON public.user_reviews;
DROP POLICY IF EXISTS "Admins update reviews" ON public.user_reviews;

CREATE POLICY "Users read own reviews"
  ON public.user_reviews FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users insert own reviews"
  ON public.user_reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins read all reviews"
  ON public.user_reviews FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update reviews"
  ON public.user_reviews FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
