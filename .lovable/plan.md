# Adhan Voice Alert — Implementation Plan

## Approach

Create a new `useAdhanAlert` hook that runs a check every second. When the current time matches exactly 5 minutes before any prayer's Adhan time, it plays a short "Allahu Akbar" audio clip once. A localStorage key tracks which alerts have already fired today to prevent repeats.

## Audio File

A short MP3/OGG file is needed for the "Allahu Akbar, Allahu Akbar" clip. Since I cannot generate audio files, the plan uses a publicly hosted takbeer audio clip. If you have a specific audio file you'd like to use, you can replace the URL later.

I'll place a small MP3 in `public/sounds/takbeer.mp3` — you'll need to upload the actual audio file there. For now I'll wire up the code to reference it.

## Files to Create/Modify


| File                         | Change                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/hooks/useAdhanAlert.ts` | **New** — checks prayer times every second, plays audio 5 min before each prayer, deduplicates via localStorage |
| `src/pages/Index.tsx`        | Add `useAdhanAlert(prayers)` call                                                                               |
| `src/pages/Settings.tsx`     | Add a toggle for "Adhan voice alert" (stored in localStorage)                                                   |


## How It Works

1. Every second, the hook computes `currentHH:MM` and compares it against each prayer's adhan time minus 5 minutes
2. When a match is found and hasn't been played today (checked via localStorage key like `adhan-alert-2026-03-08-Fajr`), it plays the audio
3. The audio element is created once and reused
4. On date change, old keys are automatically irrelevant (date is part of the key)
5. A settings toggle (`adhan-alert-enabled` in localStorage) lets users enable/disable the feature

## Important Note

The audio will only play while the app tab is open/active. Browser tabs that are in the background may not reliably fire timers. This is a browser limitation — the existing push notification system handles background alerts. This feature complements push notifications for users who have the app open.  
please keep push notification also 