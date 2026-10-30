import type { ImportedRow, ImportIssue } from './historicalImport';

export interface BankIncomeStatement {
  ticker: string; year: number;
  interestIncome?: number; interestExpense?: number; netInterestIncome?: number;
  feeIncome?: number; feeExpense?: number; netFeeIncome?: number;
  operatingIncome?: number; operatingExpenses?: number; profitBeforeTax?: number;
  incomeTax?: number; profitAfterTax?: number;
}
const labels: Record<string, keyof Omit<BankIncomeStatement, 'ticker' | 'year'>> = {
  'interest income calculated using the effective interest method': 'interestIncome',
  'interest expense calculated using the effective interest method': 'interestExpense',
  'net interest income': 'netInterestIncome',
  'fee and commission income': 'feeIncome',
  'fee and commission expense': 'feeExpense',
  'net fee and commission income': 'netFeeIncome',
  'operating income': 'operatingIncome',
  'operating expenses': 'operatingExpenses',
  'profit before tax': 'profitBeforeTax',
  'income tax expense': 'incomeTax',
  'profit for the year': 'profitAfterTax',
  'profit after tax': 'profitAfterTax',
};
const normal = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
export function classifyBankLine(particular: string) { return labels[normal(particular)]; }
export function summarizeBankIncome(rows: readonly ImportedRow[]): { statements: BankIncomeStatement[]; issues: ImportIssue[] } {
  const byKey = new Map<string, BankIncomeStatement>();
  const issues: ImportIssue[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (row.sourceFormat !== 'long_form' || normal(row.statementType ?? '') !== 'income statement') continue;
    const ticker = row.ticker?.trim().toUpperCase() ?? '';
    if (!ticker) { issues.push({ line: row.line, severity: 'error', message: 'Missing ticker.' }); continue; }
    const key = `${ticker}:${row.period}`;
    if (!byKey.has(key)) byKey.set(key, { ticker, year: row.period });
    const field = classifyBankLine(row.sourceAccount);
    if (!field) continue; // Preserve original source rows without inventing mappings.
    const unique = `${key}:${field}`;
    if (seen.has(unique)) { issues.push({ line: row.line, severity: 'error', message: `Duplicate reported bank subtotal: ${row.sourceAccount}` }); continue; }
    seen.add(unique);
    const target = byKey.get(key)!;
    (target as unknown as Record<string, string | number>)[field] = row.amount;
  }
  for (const statement of byKey.values()) {
    const check = (a: number | undefined, b: number | undefined, total: number | undefined, name: string) => {
      if (a !== undefined && b !== undefined && total !== undefined && Math.abs(a + b - total) > Math.max(1, Math.abs(total) * 0.00001)) {
        issues.push({ severity: 'error', message: `${statement.ticker} FY${statement.year}: ${name} does not reconcile.` });
      }
    };
    check(statement.interestIncome, statement.interestExpense, statement.netInterestIncome, 'Net interest income');
    check(statement.feeIncome, statement.feeExpense, statement.netFeeIncome, 'Net fee and commission income');
    if (statement.operatingIncome === undefined) issues.push({ severity: 'warning', message: `${statement.ticker} FY${statement.year}: operating income subtotal not found.` });
  }
  return { statements: [...byKey.values()].sort((a,b) => a.ticker.localeCompare(b.ticker) || a.year - b.year), issues };
}
/** Equity-focused bank valuation. Never use industrial FCFF/enterprise-value logic for banks. */
export function valueBankWithDividendDiscount(input: { nextDividendPerShare: number; costOfEquity: number; perpetualGrowth: number }) {
  const { nextDividendPerShare, costOfEquity, perpetualGrowth } = input;
  if (![nextDividendPerShare, costOfEquity, perpetualGrowth].every(Number.isFinite) || nextDividendPerShare < 0 || costOfEquity <= perpetualGrowth || perpetualGrowth < 0) throw new Error('Invalid DDM assumptions: require nonnegative dividend, growth and cost of equity greater than growth.');
  return { intrinsicValuePerShare: nextDividendPerShare / (costOfEquity - perpetualGrowth), method: 'Gordon growth dividend discount model' as const };
}
