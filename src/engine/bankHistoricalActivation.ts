import type { ImportedRow, ImportIssue } from './historicalImport';
import { BANK_CANONICAL, suggestBankCanonical, loadBankMappingOverrides, type BankCanonical } from './bankingCanonical';

export type BankValidatedPeriod = {
  ticker: string; year: number;
  accounts: Partial<Record<BankCanonical, number>>;
  sourceRows: number;
};
export type BankValidationResult = {
  periods: BankValidatedPeriod[];
  issues: ImportIssue[];
  canActivate: boolean;
};
const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const tolerance = (reported: number) => Math.max(1, Math.abs(reported) * 0.00001);
export function validateBankHistorical(rows: readonly ImportedRow[], expectedTicker?: string): BankValidationResult {
  const issues: ImportIssue[] = [];
  const byPeriod = new Map<string, BankValidatedPeriod>();
  const seen = new Set<string>();
  const overrides = loadBankMappingOverrides();
  const valid = new Set<string>(BANK_CANONICAL.map(([id]) => id));
  for (const row of rows) {
    if (row.sourceFormat !== 'long_form') {
      issues.push({ line: row.line, severity: 'error', message: 'Mixed industrial and bank source formats cannot be activated together.' });
      continue;
    }
    const ticker = (row.ticker || '').trim().toUpperCase();
    if (!ticker) { issues.push({ line: row.line, severity: 'error', message: 'Bank row has no ticker.' }); continue; }
    if (expectedTicker && ticker !== expectedTicker.toUpperCase()) {
      issues.push({ line: row.line, severity: 'error', message: 'Ticker ' + ticker + ' does not match selected company ' + expectedTicker.toUpperCase() + '.' });
      continue;
    }
    if (!Number.isFinite(row.amount)) { issues.push({ line: row.line, severity: 'error', message: 'Amount is not finite.' }); continue; }
    const suggested = suggestBankCanonical(row.sourceAccount, overrides, row.statementType);
    const canonical = row.canonical && valid.has(row.canonical) ? row.canonical as BankCanonical : suggested.needsReview ? '' : suggested.canonical;
    if (!canonical) { issues.push({ line: row.line, severity: 'error', message: 'Unreviewed bank mapping: ' + row.sourceAccount }); continue; }
    const key = ticker + ':' + row.period;
    const identity = key + ':' + canonical;
    if (seen.has(identity)) { issues.push({ line: row.line, severity: 'error', message: 'Duplicate canonical account for ' + key + ': ' + canonical }); continue; }
    seen.add(identity);
    if (!byPeriod.has(key)) byPeriod.set(key, { ticker, year: row.period, accounts: {}, sourceRows: 0 });
    const period = byPeriod.get(key)!;
    period.accounts[canonical] = row.amount;
    period.sourceRows++;
  }
  const periods = [...byPeriod.values()].sort((a,b) => a.ticker.localeCompare(b.ticker) || a.year - b.year);
  for (const p of periods) {
    const n = (key: BankCanonical) => p.accounts[key];
    const check = (parts: BankCanonical[], total: BankCanonical, label: string) => {
      const values = parts.map(n);
      const reported = n(total);
      if (reported === undefined || values.some(v => v === undefined)) return;
      const delta = values.reduce<number>((sum, v) => sum + (v ?? 0), 0) - reported;
      if (Math.abs(delta) > tolerance(reported)) issues.push({ severity: 'error', message: p.ticker + ' FY' + p.year + ': ' + label + ' mismatch (' + delta.toLocaleString() + ' in source units).' });
    };
    check(['interest_income','interest_expense'], 'net_interest_income', 'Net interest income');
    check(['fee_income','fee_expense'], 'net_fee_income', 'Net fee income');
    check(['impairment_investment_securities','impairment_loans_advances','impairment_leases'], 'total_impairment', 'Total impairment');
    check(['operating_income','total_impairment'], 'operating_income_after_impairment', 'Operating income after impairment');
    check(['personnel_expenses','depreciation','other_operating_expenses'], 'total_operating_expenses', 'Total operating expenses');
    check(['operating_income_after_impairment','total_operating_expenses'], 'profit_before_tax', 'Profit before tax');
    check(['profit_before_tax','income_tax'], 'net_profit', 'Net profit');
    check(['total_liabilities','total_equity'], 'total_assets', 'Balance sheet');
    check(['cf_cash_opening','cf_net_change_cash','cf_exchange_on_cash'], 'cf_cash_closing', 'Cash flow closing cash');
    if (n('total_assets') !== undefined && n('total_equity_liabilities') !== undefined && Math.abs(n('total_assets')! - n('total_equity_liabilities')!) > tolerance(n('total_assets')!)) issues.push({severity:'error',message:p.ticker+' FY'+p.year+': total assets do not equal total equity and liabilities.'});
    if (n('net_profit') === undefined) issues.push({ severity: 'warning', message: p.ticker + ' FY' + p.year + ': no reported net profit subtotal.' });
    if (n('total_assets') === undefined || n('total_equity') === undefined) issues.push({ severity: 'warning', message: p.ticker + ' FY' + p.year + ': balance sheet coverage incomplete. Residual income and P/B require verified equity and shares.' });
  }
  if (!periods.length) issues.push({ severity: 'error', message: 'No banking statement periods available.' });
  return { periods, issues, canActivate: !issues.some(i => i.severity === 'error') };
}
export function activateBankHistorical(companyId: string, fileName: string, rows: ImportedRow[], units: 'Units'|'Thousands'|'Millions', expectedTicker: string) {
  if (!expectedTicker.trim()) throw new Error('Select a company with a verified ticker before activating bank statements.');
  const validation = validateBankHistorical(rows, expectedTicker);
  if (!validation.canActivate) throw new Error(validation.issues.find(i => i.severity === 'error')?.message || 'Bank validation failed');
  const key = 'xlpro:bank-activated:v1:' + companyId;
  const previous = JSON.parse(localStorage.getItem(key) || 'null') as {version?:number}|null;
  const record = { companyId, ticker: expectedTicker.toUpperCase(), fileName, units, version: (previous?.version ?? 0)+1, activatedAt: new Date().toISOString(), rows, periods: validation.periods };
  localStorage.setItem(key, JSON.stringify(record));
  return record;
}
export function readBankActivation(companyId: string) {
  try {
    return JSON.parse(localStorage.getItem('xlpro:bank-activated:v1:' + companyId) || 'null') as ReturnType<typeof activateBankHistorical> | null;
  } catch { return null; }
}
