import * as XLSX from 'xlsx-js-style';
import type { ImportResult, ImportedRow } from './historicalImport';

const normalize = (v: unknown) => String(v ?? '').trim().toLowerCase().replace(/\s+/g, '_');
export function readBankWorkbook(buffer: ArrayBuffer): ImportResult | null {
  const book = XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: false });
  const rows: ImportedRow[] = [];
  const issues: ImportResult['issues'] = [];
  let found = false;
  for (const sheetName of book.SheetNames) {
    const data = XLSX.utils.sheet_to_json<(string | number | null)[]>(book.Sheets[sheetName], { header: 1, defval: '', raw: true });
    const headerIndex = data.findIndex(row => ['ticker', 'account_type', 'particular', 'amount', 'account_date'].every(field => row.map(normalize).includes(field)));
    if (headerIndex < 0) continue;
    found = true;
    const header = data[headerIndex].map(normalize);
    const col = (name: string) => header.indexOf(name);
    data.slice(headerIndex + 1).forEach((row, index) => {
      if (row.every(v => v == null || v === '')) return;
      const line = headerIndex + index + 2;
      const ticker = String(row[col('ticker')] ?? '').trim().toUpperCase();
      const statementType = String(row[col('account_type')] ?? '').trim();
      const sourceAccount = String(row[col('particular')] ?? '').trim();
      const rawAmount = row[col('amount')];
      const amount = typeof rawAmount === 'number' ? rawAmount : Number(String(rawAmount ?? '').replace(/,/g, '').replace(/^\((.*)\)$/, '-$1'));
      const date = row[col('account_date')];
      const year = typeof date === 'number' ? XLSX.SSF.parse_date_code(date)?.y : /^(\d{4})[-/]/.exec(String(date))?.[1];
      const period = Number(year ?? new Date(String(date)).getUTCFullYear());
      if (!ticker || !statementType || !sourceAccount || rawAmount === '' || !Number.isFinite(amount) || !Number.isInteger(period) || period < 1900 || period > 2200) {
        issues.push({ line, severity: 'error', message: `${sheetName}: invalid ticker, account type, particular, amount or date` }); return;
      }
      rows.push({ id: `${sheetName}-${line}`, sourceAccount, period, amount, canonical: '', line, ticker, statementType, accountDate: String(date), sourceFormat: 'long_form' });
    });
  }
  return found ? { rows, issues } : null;
}
