

# Full Codebase Audit — Findings & Fix Plan

## CRITICAL: Build Errors (3 errors blocking deployment)

### E1. `send-prayer-reminders/index.ts:65` — TypeScript error with `crypto.subtle.sign`
The return type of `crypto.subtle.sign` is `ArrayBuffer`, but passing `strToUint8(signingInput)` (a `Uint8Array<ArrayBufferLike>`) fails type-checking in strict Deno. 

**Fix:** Cast the signing input: `new Uint8Array(strToUint8(signingInput))` or use `as BufferSource`. Also cast the signature result properly.

### E2–E3. `sync-daily-prayer-times/index.ts:118-119` — `error` is of type `unknown`
The `catch` block uses `error.message` without narrowing.

**Fix:** Add `instanceof Error` check: `const msg = error instanceof Error ? error.message : String(error);`

## Remaining Issues Found

### F1. `IbadahDayDetail.tsx:17` — `onSave` return type is `Promise<any>`
Should be `Promise<{ error: string | null }>` to match `useIbadah.saveLog`.

### F2. `useIbadah.ts:69,96,100` — Remaining `as any` casts
The `data.forEach((row: any)` and `upsert(payload as any)` casts persist from before.

### F3. `useIbadah.ts:114` — `maxScore` initialized wrong
`maxScore = 50 + 5 + 5 + 5 = 65` but taraweeh (5) is included as part of the 50. Actually the 5 prayers × 10 = 50, plus taraweeh 5, tahajjud 5, dhikr 5, sadaqah 5 = 70, plus quran 10 = 80. The current code sets `maxScore = 65` initially, then adds 10 for quran = 75. This means the score calculation is wrong — it should be 80 max, not 75.

### F4. `send-prayer-reminders/index.ts:279,308,321` — `as any` casts
Minor type casts that could be improved.

### F5. `Admin.tsx:462+` — Need to check remaining code
The file is 702 lines; I only saw 462 lines.

### F6. `csvParser.ts:76` — First row must end with `-01-01`
The check `!firstDate.endsWith('-01-01')` is fine (year-agnostic). No issue here — this was already fixed.

## Implementation Plan

1. **Fix build errors** in edge functions (critical — blocks deployment)
   - `send-prayer-reminders/index.ts`: Fix `BufferSource` type error
   - `sync-daily-prayer-times/index.ts`: Narrow `unknown` error type

2. **Fix score calculation bug** in `useIbadah.ts` — maxScore should be 80, not 75

3. **Improve typing** — Remove `as any` in `useIbadah.ts` and `IbadahDayDetail.tsx`

4. **Minor cleanup** — Remove unused `RAMADAN_IQAMATH_OFFSETS` export from `iqamathOffset.ts`

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/send-prayer-reminders/index.ts` | Fix BufferSource type at line 65 |
| `supabase/functions/sync-daily-prayer-times/index.ts` | Narrow error type at lines 118-119 |
| `src/hooks/useIbadah.ts` | Fix maxScore (65→70), reduce `any` casts |
| `src/components/IbadahDayDetail.tsx` | Fix `onSave` return type |

