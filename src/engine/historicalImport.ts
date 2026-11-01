export const CANONICAL_ACCOUNTS = [
  { id: 'revenue', label: 'Revenue', statement: 'Income statement' },
  { id: 'cogs', label: 'Cost of goods sold', statement: 'Income statement' },
  { id: 'operating_expenses', label: 'Operating expenses', statement: 'Income statement' },
  { id: 'interest_expense', label: 'Interest expense', statement: 'Income statement' },
  { id: 'income_tax', label: 'Income tax', statement: 'Income statement' },
  { id: 'cash', label: 'Cash and cash equivalents', statement: 'Balance sheet' },
  { id: 'receivables', label: 'Accounts receivable', statement: 'Balance sheet' },
  { id: 'inventory', label: 'Inventory', statement: 'Balance sheet' },
  { id: 'ppe', label: 'Property, plant and equipment', statement: 'Balance sheet' },
  { id: 'other_assets', label: 'Other assets', statement: 'Balance sheet' },
  { id: 'payables', label: 'Accounts payable', statement: 'Balance sheet' },
  { id: 'debt', label: 'Interest-bearing debt', statement: 'Balance sheet' },
  { id: 'other_liabilities', label: 'Other liabilities', statement: 'Balance sheet' },
  { id: 'equity', label: 'Total equity', statement: 'Balance sheet' },
  { id: 'depreciation', label: 'Depreciation and amortization', statement: 'Cash flow statement' },
  { id: 'operating_cash_flow', label: 'Net cash from operations', statement: 'Cash flow statement' },
  { id: 'investing_cash_flow', label: 'Net cash from investing', statement: 'Cash flow statement' },
  { id: 'financing_cash_flow', label: 'Net cash from financing', statement: 'Cash flow statement' },
  { id: 'beginning_cash', label: 'Beginning cash', statement: 'Cash flow statement' },
  { id: 'ending_cash', label: 'Ending cash', statement: 'Cash flow statement' },
  { id: 'capex', label: 'Capital expenditure (positive outflow)', statement: 'Cash flow statement' },
] as const;

export type CanonicalAccount = typeof CANONICAL_ACCOUNTS[number]['id'];
export interface ImportedRow {
  id: string;
  sourceAccount: string;
  period: number;
  amount: number;
  canonical: CanonicalAccount | '';
  line: number;
  ticker?: string;
  statementType?: string;
  accountDate?: string;
  sourceFormat?: 'long_form' | 'canonical';
}
export interface ImportIssue { line?: number; severity: 'error' | 'warning'; message: string }
export interface ImportResult { rows: ImportedRow[]; issues: ImportIssue[] }

/** RFC-4180 style CSV parsing, including escaped quotes and embedded newlines. */
export function parseCsv(input: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (char === '"') {
      if (quoted && input[i + 1] === '"') { field += '"'; i++; }
      else if (!quoted && field.length === 0) quoted = true;
      else if (quoted) quoted = false;
      else throw new Error('Invalid quotation in CSV.');
    } else if (char === ',' && !quoted) {
      record.push(field.trim()); field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[i + 1] === '\n') i++;
      record.push(field.trim());
      if (record.some(value => value !== '')) records.push(record);
      record = []; field = '';
    } else field += char;
  }
  if (quoted) throw new Error('Unterminated quoted field in CSV.');
  record.push(field.trim());
  if (record.some(value => value !== '')) records.push(record);
  return records;
}

const aliases: Record<string, CanonicalAccount> = {
  sales: 'revenue', 'net revenue': 'revenue', revenue: 'revenue',
  cogs: 'cogs', 'cost of sales': 'cogs', 'cost of goods sold': 'cogs',
  'operating expenses': 'operating_expenses', opex: 'operating_expenses',
  'interest expense': 'interest_expense', 'income tax': 'income_tax',
  cash: 'cash', 'cash and equivalents': 'cash', 'accounts receivable': 'receivables',
  inventory: 'inventory', 'property plant and equipment': 'ppe',
  'other assets': 'other_assets', 'accounts payable': 'payables',
  debt: 'debt', 'other liabilities': 'other_liabilities', equity: 'equity',
  'total equity': 'equity', depreciation: 'depreciation',
  'operating cash flow': 'operating_cash_flow', 'investing cash flow': 'investing_cash_flow',
  'financing cash flow': 'financing_cash_flow', 'beginning cash': 'beginning_cash',
  'ending cash': 'ending_cash', capex: 'capex',
};
export function suggestAccount(name: string): CanonicalAccount | '' {
  return aliases[name.trim().toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ')] ?? '';
}

export function parseHistoricalCsv(csv: string): ImportResult {
  const records = parseCsv(csv.replace(/^\uFEFF/, ''));
  if (!records.length) return { rows: [], issues: [{ severity: 'error', message: 'CSV file is empty.' }] };
  const headers = records[0].map(value => value.trim().toLowerCase().replace(/\s+/g, '_'));
  const column = (name: string) => headers.indexOf(name);
  if (['account', 'year', 'amount'].some(name => column(name) < 0)) {
    return { rows: [], issues: [{ severity: 'error', message: 'Required CSV columns: account,year,amount. Optional: canonical.' }] };
  }
  const issues: ImportIssue[] = [];
  const rows: ImportedRow[] = [];
  records.slice(1).forEach((record, index) => {
    const line = index + 2;
    if (record.length !== headers.length) { issues.push({ line, severity: 'error', message: 'Incorrect column count.' }); return; }
    const sourceAccount = record[column('account')].trim();
    const yearRaw = record[column('year')].trim();
    const amountRaw = record[column('amount')].replace(/,/g, '').trim();
    const period = Number(yearRaw);
    const amount = Number(amountRaw);
    if (!sourceAccount || !/^\d{4}$/.test(yearRaw) || period < 1900 || period > 2200 || !amountRaw || !Number.isFinite(amount)) {
      issues.push({ line, severity: 'error', message: 'Account, four-digit year, or numeric amount is invalid.' }); return;
    }
    const explicit = column('canonical') >= 0 ? record[column('canonical')].trim() : '';
    const known = CANONICAL_ACCOUNTS.some(item => item.id === explicit);
    const canonical = explicit && known ? explicit as CanonicalAccount : explicit ? '' : suggestAccount(sourceAccount);
    if (explicit && !known) issues.push({ line, severity: 'warning', message: `Unknown canonical account "${explicit}"; manual mapping required.` });
    rows.push({ id: `csv-${line}`, sourceAccount, period, amount, canonical, line });
  });
  return { rows, issues };
}

export function validateHistoricalRows(rows: readonly ImportedRow[], tolerance = 0.01): ImportIssue[] {
  const issues: ImportIssue[] = [];
  if (!rows.length) return [{ severity: 'error', message: 'No financial rows to validate.' }];
  const byYear = new Map<number, Map<CanonicalAccount, number>>();
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row.canonical) { issues.push({ line: row.line, severity: 'error', message: `Unmapped account: ${row.sourceAccount}` }); continue; }
    if (!Number.isFinite(row.amount)) { issues.push({ line: row.line, severity: 'error', message: 'Non-finite amount.' }); continue; }
    const identity = `${row.period}:${row.sourceAccount.trim().toLowerCase()}:${row.canonical}`;
    if (seen.has(identity)) issues.push({ line: row.line, severity: 'error', message: `Duplicate source account ${row.sourceAccount} for FY${row.period}.` });
    seen.add(identity);
    if (!byYear.has(row.period)) byYear.set(row.period, new Map());
    const year = byYear.get(row.period)!;
    year.set(row.canonical, (year.get(row.canonical) ?? 0) + row.amount);
  }
  for (const [period, totals] of byYear) {
    const required: CanonicalAccount[] = ['cash', 'equity'];
    for (const account of required) if (!totals.has(account)) issues.push({ severity: 'warning', message: `FY${period}: missing ${account}; balance sheet cannot be fully checked.` });
    const assets: CanonicalAccount[] = ['cash', 'receivables', 'inventory', 'ppe', 'other_assets'];
    const liabilities: CanonicalAccount[] = ['payables', 'debt', 'other_liabilities'];
    if (totals.has('cash') && totals.has('equity')) {
      const sum = (accounts: CanonicalAccount[]) => accounts.reduce((n, key) => n + (totals.get(key) ?? 0), 0);
      const delta = sum(assets) - sum(liabilities) - (totals.get('equity') ?? 0);
      if (Math.abs(delta) > tolerance) issues.push({ severity: 'error', message: `FY${period}: balance sheet does not reconcile (difference ${delta.toFixed(2)} in imported units). Verify complete account coverage and sign conventions.` });
    }
  }
  return issues;
}
