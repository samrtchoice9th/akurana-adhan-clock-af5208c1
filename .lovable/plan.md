

# Ibadah Chart: Monthly Continuation & New Items

## Current State
- The `ramadan_ibadah_logs` table uses `hijri_date` (text) + `user_id` as the unique key
- `hijri_date` currently stores just a day number (e.g., "1", "2", ... "30")
- The chart is hardcoded to 30 days (Ramadan-specific)
- No month/year context is stored in `hijri_date`

## Design Decisions

### Key format for `hijri_date`
Change from storing just `"1"` to storing `"1447-09-01"` (hijri year-month-day). This:
- Naturally separates months
- Allows querying by month/year
- Is backward-compatible (old data keeps working, just won't appear in the new month view)

### New columns needed
Add 8 boolean columns to `ramadan_ibadah_logs`:
- `sunnah_before` (boolean, default false)
- `sunnah_after` (boolean, default false)
- `surah_yaseen` (boolean, default false)
- `surah_mulk` (boolean, default false)
- `surah_sajdah` (boolean, default false)
- `surah_waqiah` (boolean, default false)
- `morning_adhkar` (boolean, default false)
- `evening_adhkar` (boolean, default false)

### Score recalculation
Current max = 80. New items add 8 × 3 points each = 24 more. New max = 104.
- 5 prayers × 10 = 50
- Taraweeh = 5, Tahajjud = 5, Dhikr = 5, Sadaqah = 5
- Quran minutes = 10
- Sunnah before/after = 3 each = 6
- 4 Surahs × 3 each = 12
- Morning/Evening Adhkar × 3 each = 6
- **New max = 104**

## Database Migration

```sql
ALTER TABLE public.ramadan_ibadah_logs
  ADD COLUMN IF NOT EXISTS sunnah_before boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sunnah_after boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS surah_yaseen boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS surah_mulk boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS surah_sajdah boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS surah_waqiah boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS morning_adhkar boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS evening_adhkar boolean DEFAULT false;
```

## Implementation Plan

### 1. Database migration
Add the 8 new boolean columns to `ramadan_ibadah_logs`.

### 2. Update `useIbadah.ts`
- Add new fields to `IbadahLog` interface
- Accept `month` and `year` parameters (Hijri) for fetching/saving
- Change `hijri_date` key format to `YYYY-MM-DD` (e.g., `"1447-09-15"`)
- Filter queries by month prefix: `.like('hijri_date', '1447-09-%')`
- Update `calculateScore` to include new items (max 104)
- Update `saveLog` to include new fields

### 3. Update `RamadanChart.tsx` → rename to generic "Ibadah Chart"
- Add month/year selector using the current Hijri date from `useHijriDate`
- Allow navigating to previous months
- Dynamically determine days in selected Hijri month (29 or 30)
- Show month name in header instead of hardcoded "Ramadan"
- Keep all existing UI (grid, legend, insights, score card)

### 4. Update `IbadahDayDetail.tsx`
- Add 3 new sections in the modal:
  - **Sunnah Prayers**: `sunnah_before`, `sunnah_after` (switches)
  - **Qur'an Recitation**: `surah_yaseen`, `surah_mulk`, `surah_sajdah`, `surah_waqiah` (switches)
  - **Daily Adhkar**: `morning_adhkar`, `evening_adhkar` (switches)
- Update dialog title to show month name instead of "Ramadan"

## Files to Modify

| File | Change |
|------|--------|
| DB migration | Add 8 boolean columns |
| `src/hooks/useIbadah.ts` | New fields, month-based fetch, updated scoring |
| `src/pages/RamadanChart.tsx` | Month selector, dynamic days, generic title |
| `src/components/IbadahDayDetail.tsx` | New ibadah sections in modal |

