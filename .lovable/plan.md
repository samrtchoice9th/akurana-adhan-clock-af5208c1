

# Fix Plan: Three Issues

## Investigation Findings

### 1. Asr Notifications -- NOT a code bug
The `notification_sent_log` confirms Asr notifications **are being sent successfully** for all registered tokens (both `10min` and `5min` types) on 2026-03-03 and 2026-03-02. The backend is working correctly. If a specific device isn't receiving them, it's a device-level delivery issue (e.g., notification permissions, Do Not Disturb mode, battery optimization killing the service worker). No code change needed here.

### 2. Notification Toggle Not Persisting
**Root cause:** In `useNotifications.ts`, the `loadExistingState` function (lines 123-176) runs on mount to restore the toggle state from the database. However:
- The entire function is wrapped in a `try/catch` that **silently swallows all errors** (line 166-168)
- If `getToken()` or SW registration fails (common on reload), the function exits early without setting `enabled=true`
- Additionally, when `loadExistingState` successfully sets `enabled=true` and new `prefs`, the sync effect (line 217-220) fires and **deletes + re-inserts all rows** unnecessarily, creating a race condition window

**Fix:**
- Add console error logging inside the catch block
- Skip the sync effect during initial load by adding a `hasLoadedRef` guard
- Make `loadExistingState` more resilient: if FCM token retrieval fails, still check the database for existing preferences and set `enabled=true` based on stored data

### 3. Ibadah Chart Data Not Persisting
**Root cause:** In `useIbadah.ts`, the `fetchLogs` function (lines 44-62) queries `ramadan_ibadah_logs` using `as any` type casts and **silently ignores errors** -- if the query fails, `logs` stays as empty `{}`. The error variable is checked (`if (!error && data)`) but there's no logging when it fails.

Additionally, the `saveLog` function (lines 68-88) uses `upsert` with `onConflict: 'user_id, hijri_date'` but the `newLog` object spreads `existing` which may include the database `id` field. On a fresh page load where `logs` is empty (due to a failed fetch), saving creates new rows instead of upserting, potentially causing duplicate key errors that are silently swallowed.

**Fix:**
- Add `console.error` logging for fetch and save errors
- Strip database-generated fields (`id`, `created_at`, `updated_at`, `masjid_id`) from the upsert payload to avoid conflicts
- Ensure `fetchLogs` is called after navigation back (it already is via `useEffect`, but errors need visibility)

## Changes

### File 1: `src/hooks/useNotifications.ts`
- Add `hasLoadedRef` to prevent sync effect from firing during initial load
- Add error logging in the `loadExistingState` catch block
- If FCM token retrieval fails but permission is granted, still query DB to restore toggle state
- Guard sync effect: skip when `hasLoadedRef.current` is false

### File 2: `src/hooks/useIbadah.ts`
- Add `console.error` logging when `fetchLogs` query fails
- Strip non-upsertable fields from `saveLog` payload (remove `id`, `created_at`, `updated_at`, `masjid_id`)
- Add error logging when `saveLog` fails

