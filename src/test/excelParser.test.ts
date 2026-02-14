import { describe, it, expect } from 'vitest';
import { parseExcel } from '@/lib/excelParser';
import * as XLSX from 'xlsx';

function buildWorkbookBuffer(rows: any[][]): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return out as ArrayBuffer;
}

describe('parseExcel', () => {

  it('parses Luhar late-morning values as AM for 11:xx', () => {
    const buffer = buildWorkbookBuffer([
      ['JANUARY'],
      ['DATE', 'SUBAH', 'SUNRISE', 'LUHAR', 'ASR', 'MAGRIB', 'ISHA'],
      ['1', '5-08', '6-15', '11-50', '3-30', '6-10', '7-20'],
    ]);

    const result = parseExcel(buffer);

    expect(result.success).toBe(true);
    expect(result.rows[0].luhar_adhan).toBe('11:50 AM');
  });

  it('parses Luhar as PM for 1:xx values', () => {
    const buffer = buildWorkbookBuffer([
      ['JANUARY'],
      ['DATE', 'SUBAH', 'SUNRISE', 'LUHAR', 'ASR', 'MAGRIB', 'ISHA'],
      ['1', '5-08', '6-15', '1-05', '3-30', '6-10', '7-20'],
    ]);

    const result = parseExcel(buffer);

    expect(result.success).toBe(true);
    expect(result.rows[0].luhar_adhan).toBe('1:05 PM');
  });
});
