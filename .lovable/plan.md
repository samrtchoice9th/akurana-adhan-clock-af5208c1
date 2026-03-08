

# Fix Adhan Voice Alert

## Bugs Found

1. **Critical: `currentSeconds !== 0` race condition** — The `setInterval` fires every 1000ms but JavaScript timers drift. There's no guarantee the callback executes at exactly `:00` seconds. This means the alert **frequently misses its window entirely**.

2. **No audio duration limit** — The takbeer.mp3 plays to completion. The requirement is 1-2 seconds only.

3. **Autoplay policy not handled** — Modern browsers block `audio.play()` unless the user has interacted with the page. The current code silently catches the error but never retries. A user who opens the app and leaves it in the background will never hear the alert.

## Fixes

### Fix 1: Replace seconds check with minute-based dedup (in `useAdhanAlert.ts`)

Instead of checking `currentSeconds === 0`, track the last checked minute. On each tick, if the minute has changed, run the check. This guarantees we never miss a minute window.

```ts
const lastCheckedMinuteRef = useRef<string>('');
// Inside interval:
const minuteKey = `${currentMinutes}-${dateKey}`;
if (minuteKey === lastCheckedMinuteRef.current) return;
lastCheckedMinuteRef.current = minuteKey;
```

### Fix 2: Limit audio to ~1.5 seconds

After calling `play()`, set a timeout to pause and reset the audio:

```ts
audio.play().then(() => {
  setTimeout(() => {
    audio.pause();
    audio.currentTime = 0;
  }, 1500);
});
```

### Fix 3: Pre-warm audio on first user interaction

Add a one-time `click`/`touchstart` listener on `document` that calls `audio.play()` then immediately pauses. This unlocks the audio context for future programmatic plays.

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useAdhanAlert.ts` | All three fixes above |

