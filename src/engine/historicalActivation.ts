import type { ImportedRow, CanonicalAccount, ImportIssue } from './historicalImport';
import type { IncomeStatementRow, BalanceSheetRow, CashFlowStatementRow, ModelPeriod } from '@/types/finance';
import { validateHistoricalRows } from './historicalImport';

export interface HistoricalDataset {
  id: string;
  companyId: string;
  fileName: string;
  importedAt: string;
  activatedAt: string;
  units: 'Units' | 'Thousands' | 'Millions';
  rows: ImportedRow[];
  version: number;
  status: 'active';
}
export interface CalibrationResult { revenueGrowthPct?: number; grossMarginPct?: number; dsoDays?: number; dioDays?: number; dpoDays?: number }
export const ACTIVATION_REQUIRED: readonly CanonicalAccount[] = [
  'revenue', 'cogs', 'operating_expenses', 'interest_expense', 'income_tax',
  'cash', 'receivables', 'inventory', 'ppe', 'other_assets',
  'payables', 'debt', 'other_liabilities', 'equity',
  'depreciation', 'operating_cash_flow', 'investing_cash_flow',
  'financing_cash_flow', 'beginning_cash', 'ending_cash', 'capex',
];
const sum = (map: Map<CanonicalAccount, number>, keys: readonly CanonicalAccount[]) => keys.reduce((n, key) => n + (map.get(key) ?? 0), 0);
export function aggregateHistorical(rows: readonly ImportedRow[]) {
  const years = new Map<number, Map<CanonicalAccount, number>>();
  for (const row of rows) {
    if (!row.canonical) continue;
    if (!years.has(row.period)) years.set(row.period, new Map());
    const values = years.get(row.period)!;
    values.set(row.canonical, (values.get(row.canonical) ?? 0) + row.amount);
  }
  return years;
}
export function validateForActivation(rows: readonly ImportedRow[]): ImportIssue[] {
  const issues = validateHistoricalRows(rows);
  const years = aggregateHistorical(rows);
  for (const [year, values] of years) {
    for (const account of ACTIVATION_REQUIRED) {
      if (!values.has(account)) issues.push({ severity: 'error', message: `FY${year}: required account ${account} missing. Activation blocked.` });
    }
    if (ACTIVATION_REQUIRED.every(account => values.has(account))) {
      const cashDifference = (values.get('beginning_cash') ?? 0) + (values.get('operating_cash_flow') ?? 0) + (values.get('investing_cash_flow') ?? 0) + (values.get('financing_cash_flow') ?? 0) - (values.get('ending_cash') ?? 0);
      if (Math.abs(cashDifference) > 0.01) issues.push({ severity: 'error', message: `FY${year}: cash flow roll-forward mismatch ${cashDifference.toFixed(2)}.` });
      if (Math.abs((values.get('cash') ?? 0) - (values.get('ending_cash') ?? 0)) > 0.01) issues.push({ severity: 'error', message: `FY${year}: balance sheet cash and ending cash do not agree.` });
    }
  }
  return issues;
}
export function calibrateHistoricalDrivers(rows: readonly ImportedRow[]): CalibrationResult {
  const entries = [...aggregateHistorical(rows).entries()].sort(([a], [b]) => a - b);
  if (!entries.length) return {};
  const [, last] = entries[entries.length - 1];
  const previous = entries.length > 1 ? entries[entries.length - 2][1] : undefined;
  const revenue = last.get('revenue') ?? 0;
  const cogs = last.get('cogs') ?? 0;
  const previousRevenue = previous?.get('revenue') ?? 0;
  const result: CalibrationResult = {};
  if (previousRevenue > 0 && revenue >= 0) result.revenueGrowthPct = (revenue / previousRevenue - 1) * 100;
  if (revenue > 0) {
    result.grossMarginPct = (1 - cogs / revenue) * 100;
    result.dsoDays = (last.get('receivables') ?? 0) / revenue * 365;
  }
  if (cogs > 0) {
    result.dioDays = (last.get('inventory') ?? 0) / cogs * 365;
    result.dpoDays = (last.get('payables') ?? 0) / cogs * 365;
  }
  return result;
}
export function nextHistoricalVersion(companyId: string): number {
  try { return (JSON.parse(localStorage.getItem(`xlpro:historical-versions:v1:${companyId}`) ?? '[]') as HistoricalDataset[]).length + 1; }
  catch { return 1; }
}
export function activateHistoricalDataset(dataset: Omit<HistoricalDataset, 'status' | 'version' | 'activatedAt'>): HistoricalDataset {
  const errors = validateForActivation(dataset.rows).filter(issue => issue.severity === 'error');
  if (errors.length) throw new Error(errors[0].message);
  const record: HistoricalDataset = { ...dataset, status: 'active', version: nextHistoricalVersion(dataset.companyId), activatedAt: new Date().toISOString() };
  const key = `xlpro:historical-versions:v1:${dataset.companyId}`;
  const history = JSON.parse(localStorage.getItem(key) ?? '[]') as HistoricalDataset[];
  localStorage.setItem(key, JSON.stringify([...history, record]));
  return record;
}

/** Convert complete reviewed data into engine-native historical statements.
 * Values must use positive expense and debt balances; cash flow signed.
 * No plug accounts or illustrative historical values are introduced.
 */
export function buildHistoricalBase(rows: readonly ImportedRow[], units: HistoricalDataset['units']) {
  const scale = units === 'Units' ? 1e-6 : units === 'Thousands' ? 1e-3 : 1;
  const errors = validateForActivation(rows).filter(issue => issue.severity === 'error');
  if (errors.length) throw new Error(errors[0].message);
  const entries = [...aggregateHistorical(rows).entries()].sort(([a], [b]) => a - b);
  const periods: ModelPeriod[] = [];
  const incomeStatements: IncomeStatementRow[] = [];
  const balanceSheets: BalanceSheetRow[] = [];
  const cashFlowStatements: CashFlowStatementRow[] = [];
  for (const [year, map] of entries) {
    const n = (account: CanonicalAccount) => (map.get(account) ?? 0) * scale;
    const period: ModelPeriod = { year, periodLabel: `FY${year}A`, type: 'historical' };
    periods.push(period);
    const revenue = n('revenue'), cogs = n('cogs'), opex = n('operating_expenses');
    const grossProfit = revenue - cogs, ebitda = grossProfit - opex;
    const depreciationAmortization = n('depreciation'), ebit = ebitda - depreciationAmortization;
    const interestExpense = n('interest_expense'), taxExpense = n('income_tax');
    const ebt = ebit - interestExpense, netIncome = ebt - taxExpense;
    const previousRevenue = incomeStatements.at(-1)?.revenue;
    incomeStatements.push({ period, revenue, revenueGrowthPct: previousRevenue ? (revenue / previousRevenue - 1) * 100 : 0, cogs, grossProfit, grossMarginPct: revenue ? grossProfit / revenue * 100 : 0,
      salesMarketing: 0, researchDevelopment: 0, generalAdmin: opex, totalOpex: opex, ebitda, ebitdaMarginPct: revenue ? ebitda / revenue * 100 : 0,
      depreciationAmortization, ebit, interestExpense, interestIncome: 0, ebt, taxExpense, effectiveTaxRatePct: ebt > 0 ? taxExpense / ebt * 100 : 0,
      netIncome, netMarginPct: revenue ? netIncome / revenue * 100 : 0 });
    const cashAndEquivalents = n('cash'), accountsReceivable = n('receivables'), inventory = n('inventory'), netPPE = n('ppe'), other = n('other_assets');
    const accountsPayable = n('payables'), debt = n('debt'), otherLiabilities = n('other_liabilities'), totalEquity = n('equity');
    const totalCurrentAssets = cashAndEquivalents + accountsReceivable + inventory;
    const totalNonCurrentAssets = netPPE + other;
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;
    const totalLiabilities = accountsPayable + debt + otherLiabilities;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    balanceSheets.push({ period, cashAndEquivalents, accountsReceivable, inventory, otherCurrentAssets: 0, totalCurrentAssets,
      grossPPE: netPPE, accumulatedDepreciation: 0, netPPE, intangiblesAndOther: other, totalNonCurrentAssets, totalAssets,
      accountsPayable, accruedExpenses: otherLiabilities, shortTermDebt: 0, totalCurrentLiabilities: accountsPayable + otherLiabilities,
      longTermDebt: debt, totalLiabilities, commonStock: totalEquity, retainedEarnings: 0, totalEquity, totalLiabilitiesAndEquity, balanceDelta: totalAssets - totalLiabilitiesAndEquity });
    const cashFromOperations = n('operating_cash_flow'), cashFromInvesting = n('investing_cash_flow'), cashFromFinancing = n('financing_cash_flow');
    const beginningCash = n('beginning_cash'), endingCash = n('ending_cash');
    cashFlowStatements.push({ period, netIncome, depreciationAmortization, deltaAccountsReceivable: 0, deltaInventory: 0,
      deltaAccountsPayable: 0, deltaAccruedExpenses: 0, cashFromOperations, capex: -n('capex'), cashFromInvesting,
      debtIssued: 0, debtRepaid: 0, equityIssued: 0, dividendsPaid: 0, cashFromFinancing,
      netChangeInCash: cashFromOperations + cashFromInvesting + cashFromFinancing, beginningCash, endingCash });
  }
  return { periods, incomeStatements, balanceSheets, cashFlowStatements };
}
