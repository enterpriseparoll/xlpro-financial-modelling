import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSensitivity,
  bridgeToEquity,
  calculateWacc,
  DcfInputError,
  runDcf,
  yearFractionRemaining,
  type DcfInputs,
  type DcfPeriodInput,
} from '../index';

const close = (actual: number | null | undefined, expected: number, tol = 1e-9) =>
  assert.ok(actual !== null && actual !== undefined && Math.abs(actual - expected) < tol, `expected ${expected}, got ${actual}`);

// Golden case: FCFF = EBIT·(1−25%) + 20 − capex − ΔNWC → 65.00, 72.50, 80.75.
// Expected values below were computed independently of this engine.
const periods: DcfPeriodInput[] = [
  { label: 'FY1', year: 2027, ebit: 100, depreciationAmortization: 20, capex: 25, deltaNwc: 5, ebitda: 120 },
  { label: 'FY2', year: 2028, ebit: 110, depreciationAmortization: 20, capex: 25, deltaNwc: 5, ebitda: 130 },
  { label: 'FY3', year: 2029, ebit: 121, depreciationAmortization: 20, capex: 25, deltaNwc: 5, ebitda: 141 },
];

const base: DcfInputs = {
  periods,
  taxRate: 0.25,
  wacc: { mode: 'direct', wacc: 0.1 },
  terminal: { method: 'gordon_growth', growthRate: 0.02 },
  timing: 'end_of_year',
  bridge: { cash: 100, debt: 300, leaseLiabilities: 0, minorityInterest: 0, preferredEquity: 0, nonOperatingInvestments: 0, dilutedShares: 50 },
  moneyUnit: 'millions',
};

test('golden case, end-of-year timing', () => {
  const r = runDcf(base);
  assert.deepEqual(r.rows.map((x) => x.fcff), [65, 72.5, 80.75]);
  assert.deepEqual(r.rows.map((x) => x.discountPeriod), [1, 2, 3]);
  close(r.sumPvFcff, 179.6769346356123);
  close(r.terminal.value, 1029.5625);
  assert.equal(r.terminal.discountPeriod, 3);
  close(r.terminal.presentValue, 773.5255447032304);
  close(r.enterpriseValue, 953.2024793388426);
  close(r.bridge.equityValue, 953.2024793388426 + 100 - 300);
  close(r.valuePerShare, (953.2024793388426 - 200) / 50);
});

test('golden case, mid-year timing discounts Gordon terminal value from H − 0.5', () => {
  const r = runDcf({ ...base, timing: 'mid_year' });
  assert.deepEqual(r.rows.map((x) => x.discountPeriod), [0.5, 1.5, 2.5]);
  close(r.sumPvFcff, 188.44675885792014);
  assert.equal(r.terminal.discountPeriod, 2.5);
  close(r.terminal.presentValue, 811.2804355703843);
  close(r.enterpriseValue, 999.7271944283044);
});

test('exit multiple is discounted from the end of the horizon even under mid-year timing', () => {
  const r = runDcf({ ...base, timing: 'mid_year', terminal: { method: 'exit_multiple', evToEbitda: 8 } });
  close(r.terminal.value, 1128);
  assert.equal(r.terminal.discountPeriod, 3);
  close(r.enterpriseValue, 1035.9298542748998);
});

test('first-period stub scales the cash flow and shifts discount timing', () => {
  const stubbed = periods.map((p, i) => (i === 0 ? { ...p, yearFraction: 0.5 } : p));
  const r = runDcf({ ...base, periods: stubbed, timing: 'mid_year' });
  assert.deepEqual(r.rows.map((x) => x.discountPeriod), [0.25, 1, 2]);
  close(r.rows[0].fcffInPeriod, 32.5);
  close(r.sumPvFcff, 164.37938601365363);
  assert.equal(r.terminal.discountPeriod, 2);
  close(r.enterpriseValue, 1015.2574851872072);
});

test('only the first period may be a stub', () => {
  const bad = periods.map((p, i) => (i === 1 ? { ...p, yearFraction: 0.5 } : p));
  assert.throws(() => runDcf({ ...base, periods: bad }), DcfInputError);
});

test('WACC: target and market weights agree for the same capital structure', () => {
  const capm = { riskFreeRate: 0.04, equityBeta: 1.2, equityRiskPremium: 0.05, preTaxCostOfDebt: 0.06, taxRate: 0.25 };
  const target = calculateWacc({ mode: 'target_weights', ...capm, targetDebtWeight: 0.3 });
  const market = calculateWacc({ mode: 'market_weights', ...capm, marketValueEquity: 700, marketValueDebt: 300 });
  close(target.costOfEquity, 0.1);
  close(target.afterTaxCostOfDebt, 0.045);
  close(target.wacc, 0.0835);
  close(market.wacc, 0.0835);
  assert.throws(() => calculateWacc({ mode: 'market_weights', ...capm, marketValueEquity: 0, marketValueDebt: 0 }), DcfInputError);
  assert.throws(() => calculateWacc({ mode: 'target_weights', ...capm, targetDebtWeight: 1.2 }), DcfInputError);
});

test('growth at or above WACC is rejected, never clamped', () => {
  assert.throws(() => runDcf({ ...base, terminal: { method: 'gordon_growth', growthRate: 0.1 } }), /must be below WACC/);
  assert.throws(() => runDcf({ ...base, terminal: { method: 'gordon_growth', growthRate: 0.12 } }), DcfInputError);
});

test('negative and zero values flow through without being floored', () => {
  const loss = periods.map((p) => ({ ...p, ebit: -10, capex: 0, deltaNwc: -3 }));
  const r = runDcf({ ...base, periods: loss });
  // No tax credit on losses: FCFF = −10 + 20 − 0 + 3 = 13.
  assert.deepEqual(r.rows.map((x) => x.taxOnEbit), [0, 0, 0]);
  assert.deepEqual(r.rows.map((x) => x.fcff), [13, 13, 13]);

  const burning = periods.map((p) => ({ ...p, capex: 200 }));
  const b = runDcf({ ...base, periods: burning });
  assert.ok(b.terminal.value < 0);
  assert.ok(b.checks.some((c) => c.id === 'dcf-terminal-negative' && c.status === 'fail'));
});

test('missing share count yields null per-share value and a warning, not an assumed count', () => {
  const r = runDcf({ ...base, bridge: { ...base.bridge, dilutedShares: 0 } });
  assert.equal(r.dilutedShares, null);
  assert.equal(r.valuePerShare, null);
  assert.equal(r.upside, null);
  assert.ok(r.checks.some((c) => c.id === 'dcf-shares-missing'));
});

test('bridge subtracts every claim and lists items not provided', () => {
  const full = bridgeToEquity(1000, { cash: 100, debt: 300, leaseLiabilities: 50, minorityInterest: 20, preferredEquity: 10, nonOperatingInvestments: 30 });
  close(full.equityValue, 750);
  close(full.netDebt, 250);
  assert.deepEqual(full.notProvided, []);

  const partial = bridgeToEquity(1000, { cash: 100, debt: 300 });
  close(partial.equityValue, 800);
  assert.deepEqual(partial.notProvided, ['nonOperatingInvestments', 'leaseLiabilities', 'minorityInterest', 'preferredEquity']);
  assert.throws(() => bridgeToEquity(1000, { debt: -1 }), DcfInputError);
});

test('upside compares value per share with a positive market price only', () => {
  const r = runDcf({ ...base, marketPrice: 10 });
  close(r.upside, r.valuePerShare! / 10 - 1);
  assert.equal(runDcf({ ...base, marketPrice: 0 }).upside, null);
});

test('sensitivity: every cell is a full recalculation; invalid cells are null', () => {
  const s = buildSensitivity(base, { waccSteps: [-0.08, 0, 0.01], secondAxisSteps: [-0.01, 0, 0.01] });
  assert.equal(s.metric, 'value_per_share');
  close(s.cells[1][1], runDcf(base).valuePerShare!);
  close(s.cells[2][2], runDcf({ ...base, wacc: { mode: 'direct', wacc: 0.11 }, terminal: { method: 'gordon_growth', growthRate: 0.03 } }).valuePerShare!);
  // WACC 2% with growth 2% or 3% has no finite value.
  assert.equal(s.cells[0][1], null);
  assert.equal(s.cells[0][2], null);
  assert.notEqual(s.cells[0][0], s.cells[1][1]);
});

test('sensitivity falls back to equity value when shares are missing', () => {
  const s = buildSensitivity({ ...base, bridge: { ...base.bridge, dilutedShares: undefined } });
  assert.equal(s.metric, 'equity_value');
  close(s.cells[2][2], runDcf(base).bridge.equityValue);
});

test('stub fraction is day-accurate and timezone independent', () => {
  close(yearFractionRemaining('2026-07-01', '2026-12-31'), 183 / 365);
  close(yearFractionRemaining('2026-11-01', '2026-12-31'), 60 / 365);
  close(yearFractionRemaining('2023-12-31', '2024-12-31'), 1);
  close(yearFractionRemaining('2024-06-30', '2025-06-30'), 1);
  assert.throws(() => yearFractionRemaining('2026-12-31', '2026-12-31'), DcfInputError);
  assert.throws(() => yearFractionRemaining('2025-12-30', '2026-12-31'), DcfInputError);
  assert.throws(() => yearFractionRemaining('2026-02-30', '2026-12-31'), DcfInputError);
});

test('non-finite inputs are rejected with a readable message', () => {
  const bad = periods.map((p, i) => (i === 2 ? { ...p, capex: Number.NaN } : p));
  assert.throws(() => runDcf({ ...base, periods: bad }), /FY3 capex must be a finite number/);
  assert.throws(() => runDcf({ ...base, periods: [] }), DcfInputError);
  assert.throws(() => runDcf({ ...base, terminal: { method: 'exit_multiple', evToEbitda: 8 }, periods: periods.map(({ ebitda, ...p }) => p) }), /EBITDA is required/);
});
