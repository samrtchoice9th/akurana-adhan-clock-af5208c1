

# Supabase-Only Prayer Reminder System

## Architecture Change

Replace Firebase Cloud Scheduler with Supabase pg_cron. The new flow:

```text
pg_cron (every minute)
  |
  v
Supabase Edge Function: send-prayer-reminders
  |
  +--> Reads daily_prayer_times (today's times)
  +--> Reads users_push_tokens (active tokens)
  +--> Calculates which reminders match current minute
  +--> Deduplicates via notification_sent_log
  +--> Calls FCM HTTP v1 API directly
  +--> Logs results to system_logs
  +--> Removes invalid tokens
```

No Firebase Scheduler. No Blaze plan requirement for scheduling. Firebase is only used as a push delivery API.

## What Already Exists (No Changes Needed)

- `daily_prayer_times` table with today's data
- `users_push_tokens` table with 5 active tokens
- `notification_sent_log` table for deduplication
- `system_logs` table for execution logging
- `sync-daily-prayer-times` edge function + its pg_cron job (daily at 00:05 AM Colombo)
- pg_cron and pg_net extensions already enabled

## New Components

### 1. Secret: FIREBASE_SERVICE_ACCOUNT_JSON

The FCM HTTP v1 API requires OAuth2 authentication using a Google service account. You will need to:
1. Go to Firebase Console -> Project Settings -> Service Accounts
2. Click "Generate new private key" to download the JSON file
3. Provide the JSON contents as a secret

This replaces the need for Firebase Admin SDK -- the edge function will generate OAuth2 tokens directly.

### 2. Edge Function: `send-prayer-reminders`

A new Supabase Edge Function that runs every minute (triggered by pg_cron). It replicates all logic currently in the Firebase Cloud Function:

- Get current time in Asia/Colombo timezone
- Fetch today's prayer times from `daily_prayer_times`
- Fetch all enabled push tokens from `users_push_tokens`
- For each token+prayer combination, calculate reminder time based on `reminder_type` (10min, 5min, adhan, iqamah)
- Skip if reminder time does not equal current minute
- Deduplicate against `notification_sent_log`
- Send via FCM HTTP v1 API: `POST https://fcm.googleapis.com/v1/projects/akurana-prayer-app/messages:send`
- Log sent notifications to `notification_sent_log`
- Delete invalid/expired tokens from `users_push_tokens`
- Log execution summary to `system_logs`

### 3. pg_cron Job: Every Minute

Schedule the edge function to run every minute using pg_cron + pg_net:

```sql
SELECT cron.schedule(
  'send-prayer-reminders',
  '* * * * *',
  $$ SELECT net.http_post(
    url := 'https://dvdiflgkitqywaaplobz.supabase.co/functions/v1/send-prayer-reminders',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id; $$
);
```

### 4. Config Update

Add `verify_jwt = false` for the new function in `supabase/config.toml` so pg_cron can call it.

## FCM HTTP v1 Auth Flow (Inside Edge Function)

The edge function handles OAuth2 token generation internally:

1. Parse the service account JSON from the secret
2. Create a JWT signed with the service account's RSA private key
3. Exchange the JWT for a Google OAuth2 access token (1-hour validity, cached)
4. Use the access token to call FCM HTTP v1 API

This is a standard Google service account auth flow -- no Firebase Admin SDK needed.

## Files to Create/Modify

1. **`supabase/functions/send-prayer-reminders/index.ts`** -- New edge function with all reminder logic + FCM HTTP v1 integration
2. **pg_cron schedule** -- SQL to set up every-minute cron job (via insert tool, not migration)

## What Happens to the Firebase Cloud Function

The existing `firebase/functions/index.js` remains in the codebase for reference but is no longer needed for scheduling. You do NOT need to deploy it. All scheduling and sending is handled by Supabase.

## Production Safety

- **Idempotent**: Deduplication via `notification_sent_log` with unique `dedupe_key` (date:tokenId:prayer:reminderType)
- **No duplicate notifications**: Checked before every send
- **Invalid token cleanup**: Automatic removal on FCM 404/UNREGISTERED errors
- **Graceful failure**: Each notification send is independent; one failure does not block others
- **Logging**: Every run logged to `system_logs` with candidate/sent/failed counts
- **Timezone-safe**: All time comparisons use `Asia/Colombo` via `Intl.DateTimeFormat`

## Required User Action

Provide the Firebase service account JSON key (downloaded from Firebase Console -> Project Settings -> Service Accounts -> Generate new private key). This will be stored as a backend secret.

