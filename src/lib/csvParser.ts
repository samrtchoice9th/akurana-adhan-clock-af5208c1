export interface CsvChangeRow {
  effective_from: string;
  subah_adhan: string;
  sunrise: string;
  luhar_adhan: string;
  asr_adhan: string;
  magrib_adhan: string;
  isha_adhan: string;
}

const EXPECTED_HEADER = 'effective_from,subah_adhan,sunrise,luhar_adhan,asr_adhan,magrib_adhan,isha_adhan';
const TIME_REGEX = /^\d{1,2}:\d{2}\s*(AM|PM)$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface CsvParseResult {
  success: boolean;
  rows: CsvChangeRow[];
  error: string | null;
}

export function parseCsv(text: string): CsvParseResult {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    return { success: false, rows: [], error: 'CSV must have a header and at least one data row.' };
  }

  // Validate header
  const header = lines[0].split(',').map(h => h.trim().toLowerCase()).join(',');
  if (header !== EXPECTED_HEADER) {
    return { success: false, rows: [], error: `Invalid header. Expected:\n${EXPECTED_HEADER}\nGot:\n${header}` };
  }

  const rows: CsvChangeRow[] = [];
  const seenDates = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length !== 7) {
      return { success: false, rows: [], error: `Row ${i + 1}: Expected 7 columns, got ${cols.length}.` };
    }

    const [effective_from, subah_adhan, sunrise, luhar_adhan, asr_adhan, magrib_adhan, isha_adhan] = cols;

    // Validate date
    if (!DATE_REGEX.test(effective_from)) {
      return { success: false, rows: [], error: `Row ${i + 1}: Invalid date format "${effective_from}". Must be YYYY-MM-DD.` };
    }
    const d = new Date(effective_from + 'T00:00:00');
    if (isNaN(d.getTime())) {
      return { success: false, rows: [], error: `Row ${i + 1}: Invalid date "${effective_from}".` };
    }

    // Check duplicates
    if (seenDates.has(effective_from)) {
      return { success: false, rows: [], error: `Row ${i + 1}: Duplicate date "${effective_from}".` };
    }
    seenDates.add(effective_from);

    // Validate time fields
    const timeFields = [subah_adhan, sunrise, luhar_adhan, asr_adhan, magrib_adhan, isha_adhan];
    const fieldNames = ['subah_adhan', 'sunrise', 'luhar_adhan', 'asr_adhan', 'magrib_adhan', 'isha_adhan'];
    for (let j = 0; j < timeFields.length; j++) {
      if (timeFields[j] !== '' && !TIME_REGEX.test(timeFields[j])) {
        return { success: false, rows: [], error: `Row ${i + 1}, ${fieldNames[j]}: Invalid time "${timeFields[j]}". Must be HH:MM AM or HH:MM PM, or empty.` };
      }
    }

    rows.push({ effective_from, subah_adhan, sunrise, luhar_adhan, asr_adhan, magrib_adhan, isha_adhan });
  }

  // Sort by date ascending
  rows.sort((a, b) => a.effective_from.localeCompare(b.effective_from));

  // First row must be 2026-01-01
  if (rows[0].effective_from !== '2026-01-01') {
    return { success: false, rows: [], error: `First row must have effective_from = 2026-01-01. Got "${rows[0].effective_from}".` };
  }

  return { success: true, rows, error: null };
}
