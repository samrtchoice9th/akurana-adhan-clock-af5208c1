

# Code Health Review — Bugs, Security Issues & Fixes

## Issues Found

### 1. SECURITY (Critical): Push tokens table wide open to anonymous users
The `users_push_tokens` table has INSERT, UPDATE, and DELETE policies with `USING (true)` / `WITH CHECK (true)`. Any anonymous user can modify or delete all push notification tokens in the database.

**Fix**: Restrict INSERT/UPDATE/DELETE policies to match on `device_id` or require authentication. Since tokens aren't tied to auth users, use a device_id check pattern.

### 2. SECURITY (Warning): user_roles table readable by all authenticated users
The SELECT policy on `user_roles` uses `USING (true)` — any signed-in user can enumerate all admin users. Should restrict to admins only.

**Fix**: Change the USING expression to `has_role(auth.uid(), 'admin'::app_role)`, and add a separate policy allowing users to read their own role: `user_id = auth.uid()`.

### 3. BUG: Adhan alert skips Taraweeh during Ramadan
In `useAdhanAlert.ts`, the loop skips `Sunrise` but not `Taraweeh`. Since Taraweeh has a hardcoded time and no real "adhan", it should also be skipped to avoid false alerts.

**Fix**: Add `prayer.name === 'Taraweeh'` to the skip condition.

### 4. BUG: Stale localStorage keys never cleaned up
`useAdhanAlert` writes `adhan-alert-${date}-${prayer}` keys daily but never removes old ones. Over months, localStorage accumulates hundreds of orphaned entries.

**Fix**: On each run, clean up keys older than 2 days.

### 5. BUG: `useNotifications` prefs not synced on change
When a user toggles individual notification preferences (e.g. "10 minutes before"), `setPreference` only updates local state. The `syncToken` effect on line 216 fires, but `prefs` in the dependency array is the state object — since `setPrefs` creates a new object each time, this works. However, there's a race condition: if the user rapidly toggles multiple preferences, the intermediate syncs may overlap because `isSyncing` blocks concurrent calls, potentially dropping a preference update.

**Fix**: Debounce the sync effect (e.g. 500ms delay) to batch rapid preference changes.

### 6. STRUCTURAL: Admin page has no protection against non-admin route access
The `/admin` route has no `AuthGuard` wrapper in `App.tsx`. The Admin component handles its own auth check, which is fine, but it's inconsistent with how `/ramadan-chart` uses `AuthGuard`.

**Fix**: Minor — no action needed since Admin.tsx handles it internally, but noting for consistency.

### 7. BUG: `user_reviews` RLS uses RESTRICTIVE policies
All policies on `user_reviews` are `Permissive: No` (RESTRICTIVE). When a user who is also an admin tries to read reviews, both the "Users read own reviews" and "Admins read all reviews" policies must BOTH pass (since RESTRICTIVE = AND logic). This means an admin can only see their own reviews, not all reviews.

**Fix**: Change policies to PERMISSIVE (the default) so they use OR logic — a user can read if they own the review OR if they're an admin.

### 8. Same issue on `hadiths` table
All hadiths RLS policies are RESTRICTIVE. The "Public can read hadiths" policy combined with "Admins can insert" means both must pass for admin inserts — but "public read" is SELECT only, so this should be fine for different commands. However, the RESTRICTIVE nature means if there were ever two SELECT policies, they'd AND together. Currently safe but fragile.

## Summary of Changes

| File/Resource | Change |
|---|---|
| DB migration | Fix `users_push_tokens` RLS: restrict UPDATE/DELETE to `device_id` match |
| DB migration | Fix `user_roles` SELECT policy to admin-only + self-read |
| DB migration | Fix `user_reviews` policies to PERMISSIVE |
| `src/hooks/useAdhanAlert.ts` | Skip Taraweeh; add localStorage cleanup for old keys |
| `src/hooks/useNotifications.ts` | Debounce preference sync to prevent race conditions |

The security fixes (items 1, 2, 7) are highest priority.

