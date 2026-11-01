import { CANONICAL_ACCOUNTS, suggestAccount, type CanonicalAccount, type ImportedRow } from '../../../engine/historicalImport';
import type { RowError, UploadSchema } from '../../../lib/excel-upload/types';

/**
 * Upload schemas for historical financial statements, on the shared Excel upload engine.
 * Two layouts are accepted:
 * - Standard: one account per year per row (account | year | amount | optional canonical).
 * - Bank statement: TICKER | ACCOUNT TYPE | PARTICULAR | AMOUNT | ACCOUNT DATE, one or more sheets.
 * Validation here is per row; statement-level reconciliation stays in the historical engines.
 */

const KNOWN = new Set<string>(CANONICAL_ACCOUNTS.map((a) => a.id));
const isYear = (n: number) => Number.isInteger(n) && n >= 1900 && n <= 2200;

export type HistoricalRow = Omit<ImportedRow, 'id' | 'line'>;

export const HISTORICAL_UPLOAD_SCHEMA: UploadSchema<HistoricalRow> = {
  id: 'historical-financials',
  title: 'Historical financial data',
  description: 'One account per year per row, in the units you select on the import page.',
  columns: [
    { key: 'account', label: 'account', type: 'text', required: true, help: 'Account name as it appears in your statements.', width: 32 },
    { key: 'year', label: 'year', type: 'number', required: true, help: 'Four-digit financial year, e.g. 2024.', width: 10 },
    { key: 'amount', label: 'amount', type: 'number', required: true, help: 'Signed amount; (1,234) is read as negative.', width: 14 },
    { key: 'canonical', label: 'canonical', type: 'text', help: 'Optional standard account ID from the Reference sheet. Left blank, the app suggests one.', width: 22 },
  ],
  instructions: [
    'Fill in the Data sheet with one account per year per row. Several years can sit in the same sheet.',
    'Use the units you will select on the import page (units, thousands or millions) for every amount.',
    'Optionally set "canonical" to a standard account ID from the Reference sheet. Unknown IDs are flagged for manual mapping.',
    'Upload the file on the Financial history page. You will review mapping and balance-sheet checks before anything is saved or activated.',
  ],
  sampleRows: [
    { account: 'Revenue', year: 2024, amount: 120, canonical: 'revenue' },
    { account: 'Cost of goods sold', year: 2024, amount: 50, canonical: 'cogs' },
    { account: 'Operating expenses', year: 2024, amount: 30, canonical: 'operating_expenses' },
    { account: 'Interest expense', year: 2024, amount: 3, canonical: 'interest_expense' },
    { account: 'Income tax', year: 2024, amount: 7, canonical: 'income_tax' },
    { account: 'Cash', year: 2024, amount: 40, canonical: 'cash' },
    { account: 'Accounts receivable', year: 2024, amount: 20, canonical: 'receivables' },
    { account: 'Inventory', year: 2024, amount: 10, canonical: 'inventory' },
    { account: 'Property plant and equipment', year: 2024, amount: 50, canonical: 'ppe' },
    { account: 'Other assets', year: 2024, amount: 5, canonical: 'other_assets' },
    { account: 'Accounts payable', year: 2024, amount: 15, canonical: 'payables' },
    { account: 'Debt', year: 2024, amount: 30, canonical: 'debt' },
    { account: 'Other liabilities', year: 2024, amount: 10, canonical: 'other_liabilities' },
    { account: 'Total equity', year: 2024, amount: 70, canonical: 'equity' },
    { account: 'Depreciation', year: 2024, amount: 5, canonical: 'depreciation' },
    { account: 'Operating cash flow', year: 2024, amount: 30, canonical: 'operating_cash_flow' },
    { account: 'Investing cash flow', year: 2024, amount: -15, canonical: 'investing_cash_flow' },
    { account: 'Financing cash flow', year: 2024, amount: -5, canonical: 'financing_cash_flow' },
    { account: 'Beginning cash', year: 2024, amount: 30, canonical: 'beginning_cash' },
    { account: 'Ending cash', year: 2024, amount: 40, canonical: 'ending_cash' },
    { account: 'Capex', year: 2024, amount: 15, canonical: 'capex' },
  ],
  reference: {
    title: 'Standard account IDs',
    columns: [{ key: 'id', label: 'canonical' }, { key: 'label', label: 'Meaning' }, { key: 'statement', label: 'Statement' }],
    rows: CANONICAL_ACCOUNTS.map((a) => ({ id: a.id, label: a.label, statement: a.statement })),
  },
  maxRows: 5000,
  validateRow: (cells) => {
    const errors: RowError[] = [];
    const warnings: RowError[] = [];
    const sourceAccount = String(cells.account ?? '').trim();
    const period = Number(cells.year);
    if (!isYear(period)) errors.push({ field: 'year', message: 'year must be a four-digit year between 1900 and 2200.' });
    const explicit = String(cells.canonical ?? '').trim();
    let canonical: CanonicalAccount | '' = '';
    if (explicit && KNOWN.has(explicit)) canonical = explicit as CanonicalAccount;
    else if (explicit) warnings.push({ field: 'canonical', message: `Unknown canonical account "${explicit}"; manual mapping required.` });
    else canonical = suggestAccount(sourceAccount);
    if (errors.length) return { errors };
    return { value: { sourceAccount, period, amount: Number(cells.amount), canonical, sourceFormat: 'canonical' }, errors, warnings };
  },
};

/** Year of an account date given as an Excel date serial, a plain year, or text starting YYYY-/YYYY/. */
export function accountDateYear(raw: string): { year?: number; iso?: string } {
  const text = raw.trim();
  if (/^\d+(\.\d+)?$/.test(text)) {
    const n = Number(text);
    if (isYear(n)) return { year: n };
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86_400_000);
    const y = d.getUTCFullYear();
    return isYear(y) ? { year: y, iso: d.toISOString().slice(0, 10) } : {};
  }
  const m = /^(\d{4})[-/]/.exec(text);
  if (m && isYear(Number(m[1]))) return { year: Number(m[1]), iso: /^\d{4}-\d{2}-\d{2}$/.test(text.slice(0, 10)) ? text.slice(0, 10) : undefined };
  const parsed = Date.parse(text);
  if (Number.isFinite(parsed)) {
    const d = new Date(parsed);
    return isYear(d.getUTCFullYear()) ? { year: d.getUTCFullYear(), iso: d.toISOString().slice(0, 10) } : {};
  }
  return {};
}

export const BANK_STATEMENT_UPLOAD_SCHEMA: UploadSchema<HistoricalRow> = {
  id: 'bank-statements',
  title: 'Bank financial statements',
  description: 'Five-column long-form statements; one sheet per statement is fine.',
  allSheets: true,
  columns: [
    { key: 'ticker', label: 'TICKER', type: 'text', required: true, width: 10 },
    { key: 'accountType', label: 'ACCOUNT TYPE', type: 'text', required: true, help: 'Income Statement, Balance Sheet or Cash Flow Statement.', width: 22 },
    { key: 'particular', label: 'PARTICULAR', type: 'text', required: true, help: 'Line item as reported.', width: 40 },
    { key: 'amount', label: 'AMOUNT', type: 'number', required: true, help: 'Signed amount as reported; (1,234) is negative.', width: 16 },
    { key: 'accountDate', label: 'ACCOUNT DATE', type: 'text', required: true, help: 'Statement date, e.g. 2024-12-31.', width: 14 },
  ],
  instructions: [
    'One row per reported line item, with the bank ticker, statement type, line item, amount and statement date.',
    'Statements may be on separate sheets as long as each sheet has the same five column headings.',
    'Report subtotals as they appear; they are checked against their components, never added to them.',
  ],
  sampleRows: [
    { ticker: 'BANK', accountType: 'Income Statement', particular: 'Interest income', amount: 1000, accountDate: '2024-12-31' },
  ],
  maxRows: 20000,
  validateRow: (cells) => {
    const { year, iso } = accountDateYear(String(cells.accountDate ?? ''));
    if (!year) return { errors: [{ field: 'accountDate', message: 'ACCOUNT DATE must be a date (e.g. 2024-12-31) or a four-digit year.' }] };
    return {
      value: {
        ticker: String(cells.ticker ?? '').trim().toUpperCase(),
        statementType: String(cells.accountType ?? '').trim(),
        sourceAccount: String(cells.particular ?? '').trim(),
        amount: Number(cells.amount),
        period: year,
        accountDate: iso ?? String(cells.accountDate ?? ''),
        canonical: '',
        sourceFormat: 'long_form',
      },
      errors: [],
    };
  },
};
