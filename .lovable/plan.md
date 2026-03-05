

# Full Application Review -- Play Store Readiness

## Critical Security Issues (Must Fix)

### 1. Admin Panel Uses Client-Side Password Hash (CRITICAL)
The `/admin` route authenticates by comparing a SHA-256 hash against `VITE_ADMIN_PASSWORD_HASH` stored in an environment variable exposed to the client bundle. **Anyone can extract the hash from the built JS bundle and brute-force it offline**, or simply bypass the check by modifying client-side code. All admin operations (prayer times, hijri date, hadiths) use the same open RLS policies, meaning **anyone can call the database directly without even visiting the admin page**.

**Fix:** Create an admin role system using the `user_roles` table pattern. Protect admin-only tables with RLS policies that check `has_role(auth.uid(), 'admin')`. Remove the client-side password hash.

### 2. Overly Permissive RLS Policies (CRITICAL -- 17 findings)
The security scan found that these tables allow **anyone** (including unauthenticated users) to INSERT, UPDATE, and DELETE:
- `prayer_times` -- attackers can corrupt prayer schedules
- `prayer_time_changes` -- attackers can sabotage schedule changes
- `hijri_date` -- attackers can manipulate the Islamic calendar
- `hadiths` -- attackers can post fake/offensive religious content
- `daily_prayer_times` -- attackers can corrupt daily schedules
- `users_push_tokens` -- FCM tokens and device IDs exposed
- `notification_sent_log` -- prayer habits and tokens publicly readable
- `system_logs` -- internal operations visible to anyone
- `hijri_admin_log` -- admin actions publicly visible

**Fix:** Restrict write operations on admin-managed tables to users with an admin role. Keep SELECT as public for prayer_times, daily_prayer_times, hijri_date, hadiths. Restrict system_logs, notification_sent_log, and users_push_tokens to service_role only (or authenticated admin).

### 3. Leaked Password Protection Disabled
The authentication system does not check passwords against known breach databases.

**Fix:** Enable leaked password protection in auth settings.

## Bugs and Functional Issues

### 4. No Password Reset Flow
There is no forgot password or reset password page. Users who forget their password have no recovery path. This is a Play Store requirement for apps with accounts.

**Fix:** Add a "Forgot Password" link on the Auth page and a `/reset-password` route.

### 5. No Email Verification Handling
After registration, users are told to check email, but there's no handling for the email confirmation redirect. The `emailRedirectTo` points to `window.location.origin` (root), which just shows the main prayer page with no feedback.

**Fix:** Handle the auth callback on the root route or add a dedicated `/auth/callback` route.

### 6. AuthGuard Does Not Listen for Auth Changes
`AuthGuard.tsx` only checks `getSession()` once on mount. If the session expires or the user logs out in another tab, the guard won't react.

**Fix:** Add `onAuthStateChange` listener in AuthGuard.

### 7. Hardcoded "Ramadan 1447 AH" in RamadanChart
Line 66 of `RamadanChart.tsx` has `Ramadan 1447 AH` hardcoded. This will be wrong next year.

**Fix:** Derive from the hijri date data.

## Play Store Compliance Issues

### 8. Missing Privacy Policy
Google Play requires a privacy policy URL for apps that collect personal data (email, name, location, device tokens, prayer habits). No privacy policy page exists in the app.

**Fix:** Add a privacy policy page and link it from the Auth registration page and Settings.

### 9. Missing Account Deletion Feature
Google Play requires apps with account creation to provide an in-app account deletion option. There is no way for users to delete their account.

**Fix:** Add a "Delete Account" button in Settings that calls `supabase.auth.admin.deleteUser()` via an edge function and clears all user data.

### 10. No Data Export / Portability
While not strictly required, providing data export improves Play Store review and GDPR compliance.

## Performance and Quality

### 11. Console Logs in Production
Multiple `console.log` and `console.warn` statements throughout the codebase (device.ts, useIbadah.ts, useNotifications.ts). These should be removed or gated behind a debug flag for production.

### 12. Firebase Config Exposed in Client Bundle
Firebase API keys in `.env` with `VITE_` prefix are bundled into the client. Firebase API keys are designed to be public, but the VAPID key and other config should be reviewed. This is acceptable but worth noting.

## Recommended Implementation Order

1. **Create admin role system** -- user_roles table, has_role function, assign admin role
2. **Lock down all RLS policies** -- restrict write access on admin tables, restrict sensitive logs
3. **Remove client-side admin password** -- replace with role-based auth check
4. **Add password reset flow** -- forgot password + /reset-password page
5. **Add account deletion** -- edge function + UI in Settings
6. **Add privacy policy page** -- static page with link from Auth and Settings
7. **Enable leaked password protection** -- auth config change
8. **Fix AuthGuard** -- add onAuthStateChange listener
9. **Fix hardcoded Ramadan year** -- derive dynamically
10. **Remove console.log statements** -- clean up for production

### Files to Create/Modify
- New migration: user_roles table, has_role function, updated RLS policies for all tables
- `src/pages/Admin.tsx` -- replace password auth with role check
- `src/pages/Auth.tsx` -- add forgot password link
- `src/pages/ResetPassword.tsx` -- new page
- `src/pages/PrivacyPolicy.tsx` -- new page
- `src/pages/Settings.tsx` -- add delete account, privacy policy link
- `src/components/AuthGuard.tsx` -- add auth state listener
- `src/pages/RamadanChart.tsx` -- fix hardcoded year
- `src/App.tsx` -- add new routes
- New edge function: `delete-user-account`

