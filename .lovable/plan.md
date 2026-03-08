

# Full Codebase Audit — Findings & Fix Plan

## Security Issues (4 findings)

### S1. `users_push_tokens` — Fully Public (CRITICAL)
**File:** Database RLS  
The table has `ALL` policy with `USING (true)` and `WITH CHECK (true)`. Anyone can read all FCM tokens, device IDs, and locations. This is a data leak and spam vector.

**Fix:** Replace the permissive ALL policy with device_id-scoped policies. Since push tokens aren't tied to auth users, use device_id matching. For service-role-only inserts from edge functions, restrict INSERT/UPDATE/DELETE to authenticated or service_role, keep SELECT restricted.

### S2. Leaked Password Protection Disabled
**File:** Auth config  
The security scan flags this. Passwords aren't checked against breach databases.

**Fix:** Enable leaked password protection via auth settings tool.

### S3. `profiles` RLS uses RESTRICTIVE policies only
**File:** Database RLS  
All three policies on `profiles` are `RESTRICTIVE` (Permissive: No). In Postgres, RESTRICTIVE policies are combined with AND — meaning if there are no PERMISSIVE policies, access is denied by default. However, the `handle_new_user` trigger uses `SECURITY DEFINER` so it bypasses RLS for inserts. The current setup works but is fragile — if anyone changes the trigger, profile creation breaks silently.

**Fix:** No change needed — the SECURITY DEFINER trigger correctly handles this. But worth noting.

### S4. `HadithBanner.tsx` — `console.error` remains
**File:** `src/components/HadithBanner.tsx:34`  
A `console.error` call was missed in the previous cleanup.

**Fix:** Remove it.

## Bugs (5 findings)

### B1. `IbadahDayDetail.tsx` — Local `Card` component shadows imported `Card`
**File:** `src/components/IbadahDayDetail.tsx:260-265`  
A local `Card` function is defined at the bottom of the file, but the real `Card` from `@/components/ui/card` is imported at line 4. The local one is used only in the "missed reason" overlay. This causes inconsistent styling.

**Fix:** Remove the local `Card` and use the imported one.

### B2. `csvParser.ts` — Hardcoded `2026-01-01` check
**File:** `src/lib/csvParser.ts:75`  
The CSV parser requires the first row to be `2026-01-01`. This will break in 2027.

**Fix:** Remove the hardcoded year check or make it dynamic.

### B3. `excelParser.ts` — Hardcoded `YEAR = 2026`
**File:** `src/lib/excelParser.ts:9` and line 148  
Same hardcoded year issue. Will break next year.

**Fix:** Derive from the current year or the Excel data itself.

### B4. `NotFound.tsx` — `console.error` in production
**File:** `src/pages/NotFound.tsx:8`  
Logs 404 errors to console unnecessarily.

**Fix:** Remove.

### B5. `useIbadah.ts` — `saveLog` return type inconsistency
**File:** `src/hooks/useIbadah.ts:86,108`  
Returns `{ message: string }` when not authenticated but returns `error` object (or undefined) on success. The caller in `IbadahDayDetail` doesn't check the return value, so no runtime bug, but the inconsistent return type is fragile.

**Fix:** Normalize to always return `{ error: string | null }`.

## Performance Issues (2 findings)

### P1. `useClock` — 1-second interval causes full re-render tree
**File:** `src/hooks/useClock.ts`  
Every second, `setNow(new Date())` triggers a re-render of the entire `Index` page and all children. This is acceptable for a clock app but worth noting.

**Fix:** No change needed — this is intentional for a live clock.

### P2. `RamadanChart` — `getWeeklyReport()` called on every render
**File:** `src/pages/RamadanChart.tsx:33`  
`getWeeklyReport()` is called directly in render without memoization. It iterates all logs each time.

**Fix:** Wrap in `useMemo` or move the call result to state.

## Code Quality (6 findings)

### Q1. Unused CSS theme classes in `index.css`
**File:** `src/index.css:51-224`  
All `.theme-*` classes are defined but never applied — the theme is applied via inline CSS variables in `useTheme.tsx`. These ~170 lines are dead code.

**Fix:** Remove the unused `.theme-*` classes.

### Q2. `NavLink.tsx` — Unused component
**File:** `src/components/NavLink.tsx`  
Not imported anywhere in the project.

**Fix:** Remove the file.

### Q3. `RAMADAN_IQAMATH_OFFSETS` and constants — Partially unused
**File:** `src/lib/iqamathOffset.ts:49-60`  
`RAMADAN_IQAMATH_OFFSETS` is exported but never imported. `RAMADAN_ISHA_IQAMAH` and `RAMADAN_TARAWEEH_TIME` are also unused — the values are hardcoded directly in `usePrayerTimes.ts:75-76`.

**Fix:** Use the constants from `iqamathOffset.ts` in `usePrayerTimes.ts` instead of hardcoded strings, or remove the unused exports.

### Q4. `useIbadah.ts` — `any` type casts
**File:** `src/hooks/useIbadah.ts:69,96,118,147`  
Multiple `as any` casts throughout.

**Fix:** Use proper typed access with keyof patterns.

### Q5. `parseTimeToMinutes` duplicated
**File:** `src/hooks/usePrayerTimes.ts:26-40` and `src/hooks/useHijriDate.ts:70-84`  
Identical function defined in two files.

**Fix:** Extract to a shared utility in `src/lib/timeUtils.ts`.

### Q6. `Lovable badge hiding CSS` 
**File:** `src/index.css:266-272`  
CSS to hide the Lovable badge. This is fine for production but uses `[class*="lovable"]` which could accidentally hide legitimate elements.

**Fix:** No change — acceptable for production.

## Implementation Order

1. **Database migration** — Fix `users_push_tokens` RLS, enable leaked password protection
2. **Remove dead code** — Unused CSS theme classes, NavLink.tsx, console statements
3. **Fix hardcoded years** — csvParser.ts, excelParser.ts
4. **Fix IbadahDayDetail** — Remove local Card shadow
5. **Use shared constants** — iqamathOffset constants in usePrayerTimes
6. **Extract shared utility** — parseTimeToMinutes
7. **Improve typing** — Remove `any` casts in useIbadah
8. **Memoize** — getWeeklyReport in RamadanChart

## Files to Create/Modify

| File | Action |
|------|--------|
| DB migration | Fix `users_push_tokens` RLS policies |
| Auth config | Enable leaked password protection |
| `src/index.css` | Remove ~170 lines of unused `.theme-*` classes |
| `src/components/NavLink.tsx` | Delete |
| `src/components/HadithBanner.tsx` | Remove console.error |
| `src/pages/NotFound.tsx` | Remove console.error |
| `src/lib/csvParser.ts` | Remove hardcoded 2026 check |
| `src/lib/excelParser.ts` | Make year dynamic |
| `src/components/IbadahDayDetail.tsx` | Remove local Card, use imported |
| `src/hooks/usePrayerTimes.ts` | Use constants from iqamathOffset |
| `src/lib/timeUtils.ts` | New — shared parseTimeToMinutes |
| `src/hooks/useHijriDate.ts` | Import shared parseTimeToMinutes |
| `src/hooks/useIbadah.ts` | Fix any casts, normalize return type |
| `src/pages/RamadanChart.tsx` | Memoize getWeeklyReport |

