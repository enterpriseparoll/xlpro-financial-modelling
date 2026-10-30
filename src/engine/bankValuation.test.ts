import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bankValuation } from './bankValuation';
import { summarizeBankIncome } from './bankingModel';
import type { ImportedRow } from './historicalImport';

test('bank DDM, residual income and price to book are independently calculated', () => {
  const result = bankValuation({ bookValuePerShare: 10, costOfEquityPct: 12, perpetualGrowthPct: 4, sustainableRoePct: 16, nextDividendPerShare: 0.8, peerPriceToBook: 1.5 });
  assert.ok(Math.abs(result.ddmPerShare - 10) < 1e-10);
  assert.ok(Math.abs(result.residualIncomePerShare - 15) < 1e-10);
  assert.equal(result.priceToBookPerShare, 15);
});
test('bank valuation blocks impossible terminal assumptions', () => {
  assert.throws(() => bankValuation({ bookValuePerShare: 10, costOfEquityPct: 4, perpetualGrowthPct: 5, sustainableRoePct: 12, nextDividendPerShare: 1 }));
});
test('bank income reconciliation respects signed interest expense', () => {
  const row = (sourceAccount: string, amount: number, line: number): ImportedRow => ({ id: String(line), line, ticker: 'SCB', statementType: 'Income Statement', sourceFormat: 'long_form', period: 2025, sourceAccount, amount, canonical: '' });
  const { statements, issues } = summarizeBankIncome([
    row('Interest income calculated using the effective interest method', 1130790, 2),
    row('Interest expense calculated using the effective interest method', -127846, 3),
    row('Net interest income', 1002944, 4),
  ]);
  assert.equal(statements[0].netInterestIncome, 1002944);
  assert.equal(issues.filter(i => i.severity === 'error').length, 0);
});
