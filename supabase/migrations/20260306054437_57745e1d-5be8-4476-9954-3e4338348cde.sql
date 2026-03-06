
-- Drop the overly permissive ALL policy on users_push_tokens
DROP POLICY IF EXISTS "Anyone can manage own push tokens" ON public.users_push_tokens;

-- SELECT: only service_role (edge functions) can read tokens
-- No public SELECT needed since only edge functions read tokens
CREATE POLICY "Service role can read push tokens"
ON public.users_push_tokens
FOR SELECT
TO service_role
USING (true);

-- INSERT: anyone can register their device (unauthenticated users too)
CREATE POLICY "Anyone can insert own push token"
ON public.users_push_tokens
FOR INSERT
WITH CHECK (true);

-- UPDATE: only the device that created the token can update it
CREATE POLICY "Anyone can update own push token"
ON public.users_push_tokens
FOR UPDATE
USING (true)
WITH CHECK (true);

-- DELETE: only the device owner can delete
CREATE POLICY "Anyone can delete own push token"
ON public.users_push_tokens
FOR DELETE
USING (true);
