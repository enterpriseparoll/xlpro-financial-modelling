import type { ImportedRow, CanonicalAccount, ImportIssue } from './historicalImport';
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
    // The import schema has no full cash-flow statement or depreciation detail.
    // Never silently substitute illustrative cash flows into a real-data model.
    issues.push({ severity: 'error', message: `FY${year}: cash flow statement and depreciation schedules are not yet importable. Full three-statement activation is blocked until those schedules are supplied and reconciled.` });
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
