

# Fix: Ibadah Chart Data Not Persisting Across Navigation

## Root Cause

There are **10 different device IDs** in the database for what appears to be a small number of users. This means the `deviceId` is regenerating on page reloads instead of being read back from localStorage.

The likely cause: on non-secure contexts (HTTP or Lovable preview iframe), `crypto.randomUUID()` is unavailable, so the fallback generates a new `dev-XXXX` ID. If localStorage is cleared (e.g., by the preview iframe resetting, browser clearing storage, or private browsing), a new ID is generated each time, orphaning all previously saved data.

## Plan

### 1. Add robust deviceId logging and validation

Add `console.log` in `useIbadah.ts` to log the deviceId being used for fetch and save operations, making issues immediately visible in the console.

### 2. Fix the fetch to also try recovering orphaned data

When `fetchLogs` returns 0 results for the current deviceId, attempt a secondary lookup: check if there's recent data saved from this browser by looking at the most recent `user_id` that has data. This is a safety net, not a primary fix.

### 3. Make deviceId more resilient in `device.ts`

- Add a fallback to `sessionStorage` if `localStorage` fails
- Log a warning when a NEW deviceId is generated (vs. reading an existing one)
- Never return `'unknown-device'` or random fallbacks -- these create orphaned data

### 4. Add `refetchOnMount` behavior

In the `RamadanChart` component, ensure `fetchLogs` is called every time the chart page is navigated to (not just on initial hook mount). Use a key or manual trigger to force re-fetch.

## Files to Modify

1. **`src/lib/device.ts`** -- Add logging, sessionStorage fallback, prevent orphaned IDs
2. **`src/hooks/useIbadah.ts`** -- Add deviceId logging on fetch/save
3. **`src/pages/RamadanChart.tsx`** -- No changes needed (already uses the hook correctly)

## Technical Details

The core fix is ensuring `getOrCreateDeviceId()` never silently generates a new ID when old data exists. Adding `console.warn` when a new ID is generated will make debugging trivial. The sessionStorage fallback ensures that even if localStorage is unavailable (iframe restrictions), the ID persists within the session.

