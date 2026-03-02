

# Fully Automated Prayer Reminder System

## Current State

The system already has most pieces in place:
- **Firebase Cloud Function** (`sendPrayerReminders`): Runs every minute via Cloud Scheduler, reads `daily_prayer_times`, sends FCM push notifications, deduplicates via `notification_sent_log`, and auto-removes invalid tokens.
- **Edge Function** (`sync-daily-prayer-times`): Reads `prayer_time_changes`, applies carry-forward logic, upserts into `daily_prayer_times`.
- **Tables**: `users_push_tokens` (5 active tokens), `daily_prayer_times` (1 row for today), `notification_sent_log` (empty -- notifications haven't fired yet).

**The missing piece**: No automated daily trigger for `sync-daily-prayer-times`. It only runs when an admin uploads Excel data.

## Plan

### 1. Create `system_logs` Table

A new table to log automated edge function executions for debugging.

Columns: `id`, `function_name`, `status` (success/error), `message`, `created_at`

RLS: public read/insert (no auth in this app).

### 2. Update `sync-daily-prayer-times` Edge Function

Add logging to `system_logs` after each run. Add `verify_jwt = false` to `config.toml` so pg_cron can call it without auth issues.

### 3. Set Up pg_cron for Daily Sync

Enable `pg_cron` and `pg_net` extensions, then schedule:
- `sync-daily-prayer-times` at **00:05 Asia/Colombo** daily
- This ensures `daily_prayer_times` is populated before any prayer time the next day

### 4. Firebase Function -- No Changes Needed

The existing Firebase function already:
- Runs every minute
- Checks `daily_prayer_times` for matching prayer times
- Sends FCM notifications with deduplication
- Removes invalid tokens
- Handles all reminder types (10min, 5min, adhan, iqamah)

It was already fixed in the previous session (token field name fix). It just needs to be **redeployed to Firebase** by you (the admin) -- Lovable cannot deploy Firebase functions.

### 5. Why NOT a Supabase "trigger-prayer-reminders" Edge Function

The Firebase Cloud Function already runs every minute on its own Cloud Scheduler. Adding a Supabase edge function to trigger it would be redundant and add unnecessary complexity/cost. The current architecture (Firebase handles sending, Supabase handles data) is clean and reliable.

## Technical Details

### Database Migration

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- system_logs table
CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read system_logs" ON public.system_logs FOR SELECT USING (true);
CREATE POLICY "Anyone can insert system_logs" ON public.system_logs FOR INSERT WITH CHECK (true);

-- Index for querying recent logs
CREATE INDEX idx_system_logs_created ON public.system_logs (created_at DESC);
```

### pg_cron Schedule (via SQL insert tool)

```sql
SELECT cron.schedule(
  'sync-daily-prayer-times',
  '35 18 * * *',  -- 00:05 AM Sri Lanka (UTC+5:30) = 18:35 UTC previous day
  $$
  SELECT net.http_post(
    url := 'https://dvdiflgkitqywaaplobz.supabase.co/functions/v1/sync-daily-prayer-times',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <anon_key>"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
```

### Edge Function Update (`sync-daily-prayer-times`)

- Add `system_logs` insert on success and failure
- Keep existing carry-forward logic unchanged

### Config Update (`supabase/config.toml`)

```toml
[functions.sync-daily-prayer-times]
verify_jwt = false
```

## Files to Create/Modify

1. **Database migration**: Create `system_logs` table, enable extensions
2. **`supabase/functions/sync-daily-prayer-times/index.ts`**: Add logging to `system_logs`
3. **pg_cron schedule**: SQL to set up daily cron job

## Post-Implementation Checklist

- Redeploy the Firebase Cloud Function with the `token` field fix (must be done manually via `firebase deploy --only functions`)
- Verify `daily_prayer_times` is populated each day by checking `system_logs`
- Test a notification by checking `notification_sent_log` after a prayer time passes

