import * as XLSX from 'xlsx-js-style';
import { parseHistoricalCsv, type ImportResult, type ImportedRow } from '@/engine/historicalImport';

export function readHistoricalWorkbook(bytes: ArrayBuffer): ImportResult {
  const workbook = XLSX.read(new Uint8Array(bytes), { type: 'array', cellDates: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return { rows: [], issues: [{ severity: 'error', message: 'Workbook has no worksheet.' }] };
  const data = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, { header: 1, defval: '', raw: true });
  if (!data.length) return { rows: [], issues: [{ severity: 'error', message: 'Worksheet is empty.' }] };
  // Branded exports place the actual table header below title and metadata.
  // Scan for the exact required column names rather than assuming row 1.
  const normalized = (value: unknown) => String(value ?? '').trim().toLowerCase().replace(/\\s+/g, '_');
  const headerRowIndex = data.findIndex(row => {
    const headers = row.map(normalized);
    return ['account', 'year', 'amount'].every(name => headers.includes(name));
  });
  if (headerRowIndex < 0) return { rows: [], issues: [{ severity: 'error', message: 'Could not find a header row containing account, year, amount (optional canonical). Branded templates may have title rows above the header.' }] };
  const headers = data[headerRowIndex].map(normalized);
  const indexes = ['account', 'year', 'amount'].map(name => headers.indexOf(name));
  const canonicalIndex = headers.indexOf('canonical');
  const csvRows = ['account,year,amount,canonical'];
  const rowNumbers: number[] = [];
  const escape = (v: unknown) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  data.slice(headerRowIndex + 1).forEach((row, idx) => {
    if (row.every(v => v === '' || v === null)) return;
    const values = [row[indexes[0]], row[indexes[1]], row[indexes[2]], canonicalIndex >= 0 ? row[canonicalIndex] : ''];
    csvRows.push(values.map(escape).join(','));
    rowNumbers.push(headerRowIndex + idx + 2);
  });
  const result = parseHistoricalCsv(csvRows.join('\n'));
  result.rows = result.rows.map((row, idx) => ({ ...row, line: rowNumbers[idx] ?? row.line }));
  result.issues = result.issues.map(issue => ({ ...issue, line: issue.line ? rowNumbers[issue.line - 2] ?? issue.line : undefined }));
  return result;
}

export interface WorkbookBranding { companyName: string; currency: string; primaryColor?: string; accentColor?: string }
const rgb = (value: string | undefined, fallback: string) => (value || fallback).replace(/^#/, '').toUpperCase();

export function downloadBrandedWorkbook(name: string, title: string, columns: string[], rows: (string | number)[][], brand: WorkbookBranding) {
  const sheet = XLSX.utils.aoa_to_sheet([[brand.companyName], [title], [`Currency: ${brand.currency} | Generated: ${new Date().toISOString().slice(0, 10)}`], [], columns, ...rows]);
  const primary = rgb(brand.primaryColor, '17324D');
  const accent = rgb(brand.accentColor, '31789B');
  const max = Math.max(columns.length, 1);
  sheet['!merges'] = [0, 1, 2].map(r => ({ s: { r, c: 0 }, e: { r, c: max - 1 } }));
  sheet['!cols'] = columns.map((col, i) => ({ wch: Math.max(17, col.length + 5, ...rows.map(row => Math.min(46, String(row[i] ?? '').length + 3))) }));
  for (let r = 0; r < rows.length + 5; r++) for (let c = 0; c < max; c++) {
    const address = XLSX.utils.encode_cell({ r, c });
    const cell = sheet[address]; if (!cell) continue;
    if (r < 2) cell.s = { fill: { fgColor: { rgb: primary } }, font: { color: { rgb: 'FFFFFF' }, bold: true, sz: r === 0 ? 17 : 13 }, alignment: { vertical: 'center' } };
    else if (r === 4) cell.s = { fill: { fgColor: { rgb: accent } }, font: { color: { rgb: 'FFFFFF' }, bold: true }, alignment: { wrapText: true } };
    else if (r > 4) cell.s = { fill: { fgColor: { rgb: r % 2 ? 'FFFFFF' : 'F0F5FA' } }, font: { color: { rgb: '17324D' } }, numFmt: typeof cell.v === 'number' ? (/^(year|source row|row)$/i.test(columns[c] ?? '') ? '0' : '#,##0.00;[Red](#,##0.00)') : undefined };
  }
  sheet['!freeze'] = { xSplit: 0, ySplit: 5 };
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, 'Financial Data');
  XLSX.writeFile(book, name.endsWith('.xlsx') ? name : name + '.xlsx');
}

export function reviewedRowsToExcel(rows: ImportedRow[], brand: WorkbookBranding) {
  downloadBrandedWorkbook('xlpro-reviewed-financial-data', 'Reviewed Historical Financial Data', ['Account', 'Year', 'Amount', 'Canonical', 'Source Row'], rows.map(row => [row.sourceAccount, row.period, row.amount, row.canonical, row.line]), brand);
}
