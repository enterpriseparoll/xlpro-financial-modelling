import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkStatementIntegrity, modelIntegritySummary, type StatementSnapshot } from './modelIntegrity';

const valid: StatementSnapshot = {
  period: 'FY2027E',
  assets: 120,
  liabilities: 70,
  equity: 50,
  beginningCash: 10,
  endingCash: 14,
  netChangeInCash: 4,
  netIncome: 8,
  operatingCashFlow: 10,
  investingCashFlow: -5,
  financingCashFlow: -1,
};

test('balanced statements pass', () => {
  assert.deepEqual(checkStatementIntegrity([valid]), []);
  assert.equal(modelIntegritySummary([]).status, 'passed');
});

test('balance sheet mismatch is reported', () => {
  const issues = checkStatementIntegrity([{ ...valid, assets: 121 }]);
  assert.equal(issues[0].code, 'BALANCE_SHEET_MISMATCH');
  assert.equal(issues[0].difference, 1);
});

test('cash roll-forward and cash flow components are independently checked', () => {
  const issues = checkStatementIntegrity([{ ...valid, endingCash: 16, financingCashFlow: 0 }]);
  assert.deepEqual(issues.map(issue => issue.code), [
    'CASH_ROLL_FORWARD_MISMATCH',
    'CASH_FLOW_COMPONENTS_MISMATCH',
  ]);
});

test('non-finite values are errors, never silently accepted', () => {
  const issues = checkStatementIntegrity([{ ...valid, assets: Number.NaN }]);
  assert.equal(issues[0].code, 'NON_FINITE_VALUE');
  assert.equal(modelIntegritySummary(issues).status, 'failed');
});

test('negative cash is a warning, not a fabricated balance-sheet fix', () => {
  const issues = checkStatementIntegrity([{
    ...valid,
    beginningCash: -10,
    endingCash: -6,
  }]);
  assert.equal(issues[0].code, 'NEGATIVE_CASH');
  assert.equal(modelIntegritySummary(issues).status, 'warning');
});

test('invalid tolerances are rejected', () => {
  assert.throws(() => checkStatementIntegrity([valid], -1), RangeError);
});
