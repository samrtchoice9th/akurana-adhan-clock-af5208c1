ALTER TABLE public.ramadan_ibadah_logs
  ADD COLUMN IF NOT EXISTS sunnah_before boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS sunnah_after boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS surah_yaseen boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS surah_mulk boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS surah_sajdah boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS surah_waqiah boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS morning_adhkar boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS evening_adhkar boolean DEFAULT false;