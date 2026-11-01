import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRunOutputs, canonicalJson, sameAssumptions } from '../engine/runSnapshot';
import { rowToVersion, sha256Hex } from '../services/valuationAssumptionsRepository';
import { canEdit, defaultWorkspaceName, friendlyAuthError, parseWorkspaceRows, pickWorkspace, validateCredentials } from '../../auth/engine/workspace';
import { calculateFinancialModel } from '../../../engine/financialEngine';
import { INITIAL_COMPANIES, getHistoricalBase } from '../../../data/mockData';

test('canonical JSON ignores key order and undefined values', () => {
  assert.equal(canonicalJson({ b: 1, a: { d: [2, { y: 1, x: 2 }], c: undefined } }), '{"a":{"d":[2,{"x":2,"y":1}]},"b":1}');
  assert.ok(sameAssumptions({ riskFreeRate: 4, equityBeta: 1 }, { equityBeta: 1, riskFreeRate: 4 }));
  assert.ok(!sameAssumptions({ riskFreeRate: 4 }, { riskFreeRate: 4.1 }));
});

test('input hash is a stable 64-character hex digest', async () => {
  const a = await sha256Hex(canonicalJson({ x: 1, y: 2 }));
  const b = await sha256Hex(canonicalJson({ y: 2, x: 1 }));
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
});

test('database rows map to versions; malformed rows and fields are rejected', () => {
  const v = rowToVersion({ id: 'u1', version: 3, assumptions: { riskFreeRate: 4, evil: 'x', terminalGrowthRate: 500 }, note: 'n', created_at: '2026-11-01T00:00:00Z', created_by: 'user' });
  assert.deepEqual(v?.assumptions, { riskFreeRate: 4 });
  assert.equal(v?.version, 3);
  assert.equal(rowToVersion({ id: 'u1', version: '3', created_at: 'x', created_by: 'y' }), null);
  assert.equal(rowToVersion(null), null);
});

test('workspace rows: roles validated, joined tenant accepted as object or array', () => {
  const ws = parseWorkspaceRows([
    { role: 'editor', tenants: { id: 't2', name: 'Beta' } },
    { role: 'owner', tenants: [{ id: 't1', name: 'Alpha' }] },
    { role: 'admin', tenants: { id: 't3', name: 'Bad role' } },
    { role: 'viewer', tenants: null },
  ]);
  assert.deepEqual(ws.map((w) => w.id), ['t1', 't2']);
  assert.equal(pickWorkspace(ws, 't2')?.id, 't2');
  assert.equal(pickWorkspace(ws, 'gone')?.id, 't1');
  assert.equal(pickWorkspace([], 't1'), null);
  assert.ok(canEdit(ws[0]) && canEdit(ws[1]));
  assert.ok(!canEdit({ id: 'v', name: 'v', role: 'viewer' }) && !canEdit(null));
  assert.equal(parseWorkspaceRows('nope').length, 0);
});

test('workspace naming and credential checks', () => {
  assert.equal(defaultWorkspaceName('ama@example.com'), "ama's workspace");
  assert.equal(defaultWorkspaceName(''), 'My workspace');
  assert.equal(validateCredentials('bad', 'x', 'sign_in'), 'Enter a valid email address.');
  assert.equal(validateCredentials('a@b.co', 'short', 'sign_up'), 'Use at least 8 characters for your password.');
  assert.equal(validateCredentials('a@b.co', 'short', 'sign_in'), null);
  assert.match(friendlyAuthError('TypeError: Failed to fetch'), /Could not reach/);
  assert.match(friendlyAuthError('Invalid login credentials'), /do not match/);
  assert.equal(friendlyAuthError('Something specific'), 'Something specific');
});

test('run outputs never store NaN; invalid runs keep their reason', () => {
  const company = { ...INITIAL_COMPANIES[0], shareCount: 0 };
  const run = (o?: object) => calculateFinancialModel({ company, scenarioId: 'base', driverOverrides: {}, historicalBase: getHistoricalBase(company), valuationOverrides: o }).valuation;
  const ok = buildRunOutputs(run());
  assert.equal(ok.status, 'valid');
  assert.equal(ok.valuePerShare, null, 'no share count → no per-share value');
  assert.ok(typeof ok.enterpriseValue === 'number');
  const bad = buildRunOutputs(run({ terminalGrowthRate: 15 }));
  assert.equal(bad.status, 'invalid');
  assert.equal(bad.enterpriseValue, null);
  assert.match(bad.errors[0], /below WACC/);
  assert.ok(!JSON.stringify(bad).includes('NaN'));
});
