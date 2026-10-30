import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateForActivation, calibrateHistoricalDrivers, buildHistoricalBase } from './historicalActivation';
import type { ImportedRow, CanonicalAccount } from './historicalImport';

const sample: Record<string, number> = {
  revenue: 120, cogs: 50, operating_expenses: 30, interest_expense: 3, income_tax: 7,
  cash: 40, receivables: 20, inventory: 10, ppe: 50, other_assets: 5,
  payables: 15, debt: 30, other_liabilities: 10, equity: 70,
  depreciation: 5, operating_cash_flow: 30, investing_cash_flow: -15,
  financing_cash_flow: -5, beginning_cash: 30, ending_cash: 40, capex: 15,
};
const makeRows = (data: Record<string, number>, year = 2024): ImportedRow[] =>
  Object.entries(data).map(([canonical, amount], line) => ({
    id: String(line), sourceAccount: canonical, canonical: canonical as CanonicalAccount,
    amount, period: year, line: line + 6,
  }));
test('incomplete but balanced import is blocked', () => {
  const issues = validateForActivation(makeRows({ revenue: 120, cash: 40, equity: 40 }));
  assert.ok(issues.some(issue => issue.severity === 'error' && issue.message.includes('required account')));
});
test('complete and reconciled dataset can be converted', () => {
  const rows = makeRows(sample);
  assert.deepEqual(validateForActivation(rows).filter(issue => issue.severity === 'error'), []);
  const base = buildHistoricalBase(rows, 'Millions');
  assert.equal(base.incomeStatements[0].revenue, 120);
  assert.equal(base.balanceSheets[0].balanceDelta, 0);
  assert.equal(base.cashFlowStatements[0].endingCash, 40);
});
test('cash-flow mismatch blocks activation', () => {
  const issues = validateForActivation(makeRows({ ...sample, ending_cash: 41 }));
  assert.ok(issues.some(issue => issue.message.includes('cash flow roll-forward')));
});
test('driver calibration uses historical years and working capital', () => {
  const rows = [...makeRows({ ...sample, revenue: 100 }, 2023), ...makeRows(sample, 2024)];
  const drivers = calibrateHistoricalDrivers(rows);
  assert.ok(Math.abs((drivers.revenueGrowthPct ?? 0) - 20) < 1e-9);
  assert.ok(Math.abs((drivers.dsoDays ?? 0) - (20 / 120 * 365)) < 1e-9);
});
