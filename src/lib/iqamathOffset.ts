/**
 * Adds minutes to a time string in HH:MM AM/PM format.
 * Returns the result in the same format.
 * Returns null if input is invalid.
 */
export function addMinutesToTime(timeStr: string | null, minutes: number): string | null {
  if (!timeStr || !timeStr.trim()) return null;
  const cleaned = timeStr.trim().toUpperCase();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const period = match[3];

  // Convert to 24h
  let h24 = hours;
  if (period === 'PM' && hours !== 12) h24 += 12;
  if (period === 'AM' && hours === 12) h24 = 0;

  let totalMins = h24 * 60 + mins + minutes;
  // Wrap around midnight
  totalMins = ((totalMins % 1440) + 1440) % 1440;

  let newH = Math.floor(totalMins / 60);
  const newM = totalMins % 60;

  // Convert back to 12h
  let newPeriod = 'AM';
  if (newH >= 12) {
    newPeriod = 'PM';
    if (newH > 12) newH -= 12;
  }
  if (newH === 0) newH = 12;

  return `${newH}:${String(newM).padStart(2, '0')} ${newPeriod}`;
}

/** Fixed Iqamath offsets per prayer (normal days) */
export const IQAMATH_OFFSETS: Record<string, number> = {
  Subah: 30,
  Luhar: 15,
  Asr: 15,
  Magrib: 10,
  Isha: 15,
};

/** Iqamath offsets during Ramadan (month 9) */
export const RAMADAN_IQAMATH_OFFSETS: Record<string, number> = {
  Subah: 15,   // adhan + 15 min
  Luhar: 15,   // unchanged
  Asr: 15,     // unchanged
  Magrib: 20,  // adhan + 20 min
};

/** Fixed iqamah time for Isha during Ramadan */
export const RAMADAN_ISHA_IQAMAH = '8:15 PM';

/** Fixed time for Taraweeh prayer during Ramadan */
export const RAMADAN_TARAWEEH_TIME = '8:30 PM';
