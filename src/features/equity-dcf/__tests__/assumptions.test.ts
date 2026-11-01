import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyAssumptionPatch, reviewAssumptions, sanitizeValuationAssumptions } from '../engine/assumptions';
import { calculateFinancialModel } from '../../../engine/financialEngine';
import { INITIAL_COMPANIES, getHistoricalBase } from '../../../data/mockData';
import type { ValuationOverrides } from '../../../types/finance';

test('sanitize keeps well-formed fields and drops everything else', () => {
  const out = sanitizeValuationAssumptions({
    riskFreeRate: 4,
    equityBeta: 'high',
    terminalGrowthRate: 999,
    exitMultiple: Number.NaN,
    leaseLiabilities: -5,
    waccMode: 'direct',
    terminalValueMethod: 'magic',
    valuationDate: '2026-11-01',
    cashFlowTiming: 'end_of_year',
    __proto__pollution: 1,
  });
  assert.deepEqual(out, { riskFreeRate: 4, waccMode: 'direct', valuationDate: '2026-11-01', cashFlowTiming: 'end_of_year' });
  assert.deepEqual(sanitizeValuationAssumptions(null), {});
  assert.deepEqual(sanitizeValuationAssumptions('{"riskFreeRate":4}'), {});
  assert.deepEqual(sanitizeValuationAssumptions({ valuationDate: '1 Nov 2026' }), {});
});

test('patch with undefined removes the override so the model default applies again', () => {
  const next = applyAssumptionPatch({ riskFreeRate: 4, equityBeta: 1.1 }, { riskFreeRate: undefined, preTaxCostOfDebt: 6 });
  assert.deepEqual(next, { equityBeta: 1.1, preTaxCostOfDebt: 6 });
});

test('review notes flag values outside the illustrative band without blocking them', () => {
  const notes = reviewAssumptions({ terminalGrowthRate: 4.5, equityBeta: 1.1, exitMultiple: undefined });
  assert.deepEqual(notes.map((n) => n.key), ['terminalGrowthRate']);
});

// Data lineage: assumptions entered in the guided flow must reach the one model run every page reads.
const company = { ...INITIAL_COMPANIES[0], shareCount: 60 };
const run = (o?: ValuationOverrides) =>
  calculateFinancialModel({ company, scenarioId: 'base', driverOverrides: {}, historicalBase: getHistoricalBase(company), valuationOverrides: o }).valuation;

test('bridge items reduce shareholder value one-for-one and are no longer flagged', () => {
  const base = run();
  const withClaims = run({ leaseLiabilities: 10, minorityInterest: 5, preferredEquity: 3, nonOperatingInvestments: 4 });
  assert.ok(Math.abs(base.enterpriseValue - withClaims.enterpriseValue) < 1e-9);
  assert.ok(Math.abs(base.impliedEquityValue - 14 - withClaims.impliedEquityValue) < 1e-9);
  assert.deepEqual(withClaims.bridge?.notProvided, []);
  assert.ok(!withClaims.dcfChecks.some((c) => c.id === 'dcf-bridge-incomplete'));
  assert.ok(base.dcfChecks.some((c) => c.id === 'dcf-bridge-incomplete'));
});

test('direct WACC replaces the build-up', () => {
  const v = run({ waccMode: 'direct', directWacc: 11 });
  assert.equal(v.dcfStatus, 'valid');
  assert.ok(Math.abs(v.waccInputs.wacc - 11) < 1e-9);
  assert.equal(run({ waccMode: 'direct' }).dcfStatus, 'invalid', 'direct mode without a rate must not fall back silently');
});

test('valuation date creates a stub first year; a date outside the year is rejected', () => {
  const firstYear = run().fcffSchedule[0].period.year;
  const stub = run({ valuationDate: `${firstYear}-07-01` });
  assert.ok(Math.abs(stub.firstPeriodFraction - 183 / 365) < 1e-9);
  assert.ok(stub.fcffSchedule[0].discountPeriod < 0.5);
  assert.equal(run().firstPeriodFraction, 1);
  const bad = run({ valuationDate: `${firstYear + 3}-01-01` });
  assert.equal(bad.dcfStatus, 'invalid');
  assert.match(bad.dcfErrors[0], /valuation date/i);
});

test('end-of-year timing values the business below mid-year timing', () => {
  assert.ok(run({ cashFlowTiming: 'end_of_year' }).enterpriseValue < run().enterpriseValue);
});
