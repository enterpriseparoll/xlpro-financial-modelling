import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateResidualIncome, residualSensitivity } from './residualIncome';
import type { ForecastRow } from '../../../engine/bankForecast';

const forecast = (afterTax: number[]): ForecastRow[] =>
  afterTax.map((v, i) => ({ year: 2030 + i, interest: 0, fees: 0, revenue: 0, costs: 0, provisions: 0, beforeTax: v, afterTax: v }));

const base = { openingEquityMillions: 1000, sharesMillions: 100, costOfEquityPct: 20, terminalGrowthPct: 5, payoutPct: 50, forecast: forecast([300, 330, 360, 400, 440]) };

test('equity roll-forward preserves clean surplus each forecast year', () => {
  const result = calculateResidualIncome(base);
  assert.equal(result.years.length, 5);
  result.years.forEach((y, i) => {
    const opening = i === 0 ? base.openingEquityMillions : result.years[i - 1].closingEquity;
    assert.ok(Math.abs(y.openingEquity - opening) < 1e-9);
    assert.ok(Math.abs(y.dividends - Math.max(0, y.earnings) * 0.5) < 1e-9);
    assert.ok(Math.abs(y.closingEquity - (y.openingEquity + y.earnings - y.dividends)) < 1e-9);
    assert.ok(Math.abs(y.equityCharge - y.openingEquity * 0.2) < 1e-9);
    assert.ok(Math.abs(y.residualIncome - (y.earnings - y.equityCharge)) < 1e-9);
    assert.ok(Math.abs(y.presentValue - y.residualIncome / Math.pow(1.2, i + 1)) < 1e-9);
  });
});

test('intrinsic value reconciles to opening equity plus discounted residual income', () => {
  const result = calculateResidualIncome(base);
  assert.ok(Math.abs(result.equityValueMillions - (result.openingEquity + result.forecastResidualPV + result.terminalResidualPV)) < 1e-9);
  assert.ok(Math.abs(result.intrinsicPerShare - result.equityValueMillions / base.sharesMillions) < 1e-9);
  // Terminal residual uses the final-year implied ROE grown at the terminal rate.
  const last = result.years[4];
  const terminalEarnings = last.closingEquity * (last.earnings / last.closingEquity) * 1.05;
  assert.ok(Math.abs(result.terminalResidual - (terminalEarnings - 0.2 * last.closingEquity)) < 1e-9);
  assert.ok(Math.abs(result.terminalResidualPV - (result.terminalResidual / 0.15) / Math.pow(1.2, 5)) < 1e-9);
});

test('upside is only reported against a positive observed market price', () => {
  const withMarket = calculateResidualIncome({ ...base, marketPrice: 10 });
  assert.ok(Math.abs(withMarket.upsidePct! - (100 * (withMarket.intrinsicPerShare / 10 - 1))) < 1e-9);
  const without = calculateResidualIncome({ ...base, marketPrice: 0 });
  assert.equal(without.upsidePct, undefined);
});

test('impossible valuation inputs are rejected', () => {
  assert.throws(() => calculateResidualIncome({ ...base, terminalGrowthPct: 20 }));
  assert.throws(() => calculateResidualIncome({ ...base, openingEquityMillions: 0 }));
  assert.throws(() => calculateResidualIncome({ ...base, sharesMillions: -5 }));
  assert.throws(() => calculateResidualIncome({ ...base, payoutPct: 120 }));
  assert.throws(() => calculateResidualIncome({ ...base, costOfEquityPct: 0 }));
  assert.throws(() => calculateResidualIncome({ ...base, forecast: [] }));
});

test('sensitivity returns undefined for invalid shifted assumptions', () => {
  assert.equal(typeof residualSensitivity(base, 0, 0), 'number');
  assert.equal(residualSensitivity(base, -20, 0), undefined);
  assert.equal(residualSensitivity(base, 0, 20), undefined);
});
