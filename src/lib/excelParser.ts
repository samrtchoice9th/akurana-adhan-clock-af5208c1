import * as XLSX from 'xlsx';
import { CsvChangeRow } from './csvParser';

const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER',
];

const YEAR = 2026;

export interface ExcelParseResult {
  success: boolean;
  rows: CsvChangeRow[];
  error: string | null;
}

/**
 * Normalize a time value like "5-08", "5:08", "12-23", "12:23" to "5:08 AM" etc.
 * AM/PM is assigned based on prayer column index.
 */
function normalizeTime(raw: string, prayerIndex: number): string {
  // prayerIndex: 0=subah, 1=sunrise, 2=luhar, 3=asr, 4=magrib, 5=isha
  const cleaned = String(raw).trim();
  if (!cleaned || cleaned === '') return '';

  // Replace first hyphen with colon (handles "5-08" → "5:08")
  // But be careful: only replace the separator between hour and minute
  const parts = cleaned.split(/[-:]/);
  if (parts.length !== 2) return '';

  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  if (isNaN(hour) || isNaN(minute)) return '';

  let meridiem: string;
  switch (prayerIndex) {
    case 0: // Subah - always AM
    case 1: // Sunrise - always AM
      meridiem = 'AM';
      break;
    case 2: // Luhar - can be late morning (e.g. 11:50 AM) or afternoon
      meridiem = hour === 12 || (hour >= 1 && hour <= 4) ? 'PM' : 'AM';
      break;
    case 3: // Asr - always PM
    case 4: // Magrib - always PM
    case 5: // Isha - always PM
      meridiem = 'PM';
      break;
    default:
      meridiem = 'AM';
  }

  const displayHour = hour;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${meridiem}`;
}

/**
 * Parse a date cell value. Handles:
 * - Single day: "1", "31"
 * - Date range: "01-06", "25-29"
 * Returns the start day number, or null if invalid.
 */
function parseStartDay(raw: string): number | null {
  const cleaned = String(raw).trim();
  if (!cleaned) return null;

  // Check if it's a range like "01-06"
  const rangeParts = cleaned.split('-');
  if (rangeParts.length === 2) {
    const start = parseInt(rangeParts[0], 10);
    if (!isNaN(start) && start >= 1 && start <= 31) return start;
  }

  // Single day
  const day = parseInt(cleaned, 10);
  if (!isNaN(day) && day >= 1 && day <= 31) return day;

  return null;
}

export function parseExcel(data: ArrayBuffer): ExcelParseResult {
  try {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    const rows: CsvChangeRow[] = [];
    let currentMonth = -1; // 0-indexed month

    for (let i = 0; i < jsonRows.length; i++) {
      const row = jsonRows[i].map((c: any) => String(c).trim());

      // Check if this row contains a month name
      const monthMatch = row.find((cell: string) => MONTHS.includes(cell.toUpperCase()));
      if (monthMatch) {
        currentMonth = MONTHS.indexOf(monthMatch.toUpperCase());
        continue;
      }

      // Skip header rows (DATE, SUBAH, etc.) and empty rows
      if (currentMonth < 0) continue;
      if (row.length < 7) continue;
      if (row[0].toUpperCase() === 'DATE') continue;
      if (row.every((c: string) => c === '')) continue;

      const startDay = parseStartDay(row[0]);
      if (startDay === null) continue;

      // Build effective_from date
      const monthNum = currentMonth + 1;
      const dateStr = `${YEAR}-${monthNum.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`;

      // Validate the date is real
      const dateObj = new Date(dateStr + 'T00:00:00');
      if (isNaN(dateObj.getTime())) {
        return { success: false, rows: [], error: `Invalid date at row ${i + 1}: ${dateStr}` };
      }

      const subah = normalizeTime(row[1], 0);
      const sunrise = normalizeTime(row[2], 1);
      const luhar = normalizeTime(row[3], 2);
      const asr = normalizeTime(row[4], 3);
      const magrib = normalizeTime(row[5], 4);
      const isha = normalizeTime(row[6], 5);

      if (!subah && !sunrise && !luhar && !asr && !magrib && !isha) continue;

      rows.push({
        effective_from: dateStr,
        subah_adhan: subah,
        sunrise: sunrise,
        luhar_adhan: luhar,
        asr_adhan: asr,
        magrib_adhan: magrib,
        isha_adhan: isha,
      });
    }

    if (rows.length === 0) {
      return { success: false, rows: [], error: 'No valid prayer time data found in the Excel file.' };
    }

    // Sort by date
    rows.sort((a, b) => a.effective_from.localeCompare(b.effective_from));

    // Verify first row starts with January 1
    if (rows[0].effective_from !== '2026-01-01') {
      return { success: false, rows: [], error: `First record must be 2026-01-01, got "${rows[0].effective_from}".` };
    }

    return { success: true, rows, error: null };
  } catch (err: any) {
    return { success: false, rows: [], error: `Failed to parse Excel file: ${err.message}` };
  }
}
