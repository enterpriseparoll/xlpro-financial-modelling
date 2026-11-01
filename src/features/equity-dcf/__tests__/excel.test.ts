import { test } from 'node:test';
import assert from 'node:assert/strict';
import XLSX from '../../../lib/xlsx';
import type * as XLSXTypes from 'xlsx-js-style';
import { buildWorkbook, workbookToBytes, NOT_AVAILABLE_TEXT, safeText } from '../../../lib/export';
import { buildProblemRowsWorkbook, buildTemplateWorkbook, parseUploadWorkbook, uploadStats } from '../../../lib/excel-upload';
import { ASSUMPTIONS_UPLOAD_SCHEMA, diffImportedAssumptions, importedToPatch, resolveAssumptionName } from '../engine/assumptionsImport';
import { applyAssumptionPatch } from '../engine/assumptions';
import { buildValuationReportDocs } from '../services/valuationExport';
import { calculateFinancialModel } from '../../../engine/financialEngine';
import { INITIAL_COMPANIES, getHistoricalBase } from '../../../data/mockData';
import type { ValuationOverrides } from '../../../types/finance';

const brand = { companyName: 'Test Co' };
const bytesOf = (wb: XLSXTypes.WorkBook) => workbookToBytes(wb);

/** Builds a plain workbook from rows of cells (simulating a user-made file). */
function userFile(rows: unknown[][], percentCells: string[] = []): Uint8Array {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  for (const ref of percentCells) if (ws[ref]) ws[ref].z = '0.00%';
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

test('export: missing numbers are "Not available", never zero; no formulas are written', () => {
  const wb = buildWorkbook([{
    reportTitle: 'T', branding: brand, currency: 'USD',
    metaBlocks: [{ title: 'M', rows: [{ label: 'Missing', value: null, format: 'number' }, { label: 'NaN', value: Number.NaN, format: 'number' }] }],
    sections: [{ columns: [{ header: 'Name', accessor: 'n' }, { header: 'Amount', accessor: 'a', format: 'number' }], rows: [{ n: '=HYPERLINK("x")', a: null }, { n: 'ok', a: 5 }] }],
  }]);
  const back = XLSX.read(bytesOf(wb), { type: 'array', cellFormula: true });
  const ws = back.Sheets[back.SheetNames[0]];
  const cells = Object.entries(ws).filter(([k]) => !k.startsWith('!')).map(([, c]) => c as XLSXTypes.CellObject);
  assert.ok(cells.every((c) => !c.f), 'no formula cells');
  const values = cells.map((c) => c.v);
  assert.ok(values.includes(NOT_AVAILABLE_TEXT));
  assert.ok(!values.includes(0), 'missing values are never written as 0');
  assert.ok(values.includes('=HYPERLINK("x")'), 'untrusted text is kept as inert text');
  assert.equal(safeText('a\u0001b'), 'ab');
});

test('template round trip: the downloaded template parses back with its sample rows valid', () => {
  const parsed = parseUploadWorkbook(bytesOf(buildTemplateWorkbook(ASSUMPTIONS_UPLOAD_SCHEMA, brand, 'USD')), ASSUMPTIONS_UPLOAD_SCHEMA);
  assert.deepEqual(parsed.fileErrors, []);
  assert.equal(parsed.sheetName, 'Data');
  assert.equal(uploadStats(parsed.rows).valid, ASSUMPTIONS_UPLOAD_SCHEMA.sampleRows.length);
  assert.ok(parsed.headerRowNumber! > 1, 'header found below the branded title rows');
});

test('malformed workbooks are rejected with plain messages', () => {
  assert.match(parseUploadWorkbook(new Uint8Array(), ASSUMPTIONS_UPLOAD_SCHEMA).fileErrors[0], /empty/);
  assert.match(parseUploadWorkbook(new Uint8Array(6 * 1024 * 1024), ASSUMPTIONS_UPLOAD_SCHEMA).fileErrors[0], /larger than/);
  assert.match(parseUploadWorkbook(userFile([['Name', 'Amount'], ['x', 1]]), ASSUMPTIONS_UPLOAD_SCHEMA).fileErrors[0], /Could not find a header row/);
  assert.match(parseUploadWorkbook(userFile([['Assumption', 'Value']]), ASSUMPTIONS_UPLOAD_SCHEMA).fileErrors[0], /no data rows/);
  const tooMany = [['Assumption', 'Value'], ...Array.from({ length: 201 }, () => ['Equity beta', 1])];
  assert.match(parseUploadWorkbook(userFile(tooMany), ASSUMPTIONS_UPLOAD_SCHEMA).fileErrors[0], /limit is 200/);
});

test('row validation: Excel row numbers, names, ranges, defaults, percent cells, dates and duplicates', () => {
  const parsed = parseUploadWorkbook(userFile([
    ['My notes'],
    [],
    ['assumption', 'VALUE', 'Note'],
    ['Risk-free rate', 0.045, 'typed as 4.5% in Excel'],
    ['Return on a safe investment', 4, 'duplicate of row 4 by plain name'],
    ['Equity beta', 'high', ''],
    ['Terminal growth (g)', 25, 'above limit'],
    ['Unknown thing', 1, ''],
    ['Exit EV / EBITDA', 'default', ''],
    ['Valuation date', 46387, 'Excel date serial'],
    ['Required return method', 'Enter one rate', ''],
    ['Lease liabilities', '1,250.5', ''],
  ], ['B4']), ASSUMPTIONS_UPLOAD_SCHEMA);
  const byRow = new Map(parsed.rows.map((r) => [r.rowNumber, r]));
  assert.equal(byRow.get(4)?.value?.value, 4.5, 'percent-formatted cell is read as the percentage shown');
  assert.match(byRow.get(5)!.errors[0].message, /already appears on row 4/);
  assert.match(byRow.get(6)!.errors[0].message, /must be a number/);
  assert.match(byRow.get(7)!.errors[0].message, /between -10 and 20/);
  assert.match(byRow.get(8)!.errors[0].message, /not a recognised assumption/);
  assert.equal(byRow.get(9)?.status, 'valid');
  assert.equal(byRow.get(9)?.value?.value, undefined, '"default" clears the override');
  assert.equal(byRow.get(10)?.value?.value, '2026-12-31');
  assert.equal(byRow.get(11)?.value?.value, 'direct');
  assert.equal(byRow.get(12)?.value?.value, 1250.5);
  assert.deepEqual(uploadStats(parsed.rows), { total: 9, valid: 5, errors: 4, uploaded: 0 });

  const problems = XLSX.read(bytesOf(buildProblemRowsWorkbook(ASSUMPTIONS_UPLOAD_SCHEMA, parsed.rows, brand, 'USD', 'f.xlsx')), { type: 'array' });
  const text = JSON.stringify(XLSX.utils.sheet_to_json(problems.Sheets[problems.SheetNames[0]], { header: 1 }));
  for (const n of [5, 6, 7, 8]) assert.ok(text.includes(`[${n},`), `problem workbook lists Excel row ${n}`);
  assert.ok(!text.includes('[4,'), 'valid rows are not in the problem workbook');
});

test('names resolve by technical key, term or plain label', () => {
  assert.equal(resolveAssumptionName('riskFreeRate'), 'riskFreeRate');
  assert.equal(resolveAssumptionName('  RISK-FREE RATE '), 'riskFreeRate');
  assert.equal(resolveAssumptionName('Growth per year after the forecast, forever'), 'terminalGrowthRate');
  assert.equal(resolveAssumptionName('nope'), undefined);
});

test('diff shows changes, clears and unchanged values before anything is applied', () => {
  const diff = diffImportedAssumptions({ riskFreeRate: 4, exitMultiple: 9 }, [
    { key: 'riskFreeRate', value: 4, note: '' },
    { key: 'equityBeta', value: 1.2, note: '' },
    { key: 'exitMultiple', value: undefined, note: '' },
  ]);
  assert.deepEqual(diff.map((d) => d.kind), ['same', 'change', 'clear']);
  assert.deepEqual(applyAssumptionPatch({ riskFreeRate: 4, exitMultiple: 9 }, importedToPatch([{ key: 'exitMultiple', value: undefined, note: '' }])), { riskFreeRate: 4 });
});

// Export → re-import must reproduce the same valuation for several assumption sets, including negative growth.
const company = { ...INITIAL_COMPANIES[0], shareCount: 60, currentSharePrice: 3 };
const run = (o: ValuationOverrides) => calculateFinancialModel({ company, scenarioId: 'base', driverOverrides: {}, historicalBase: getHistoricalBase(company), valuationOverrides: o });

for (const [name, overrides] of Object.entries<ValuationOverrides>({
  defaults: {},
  customised: { riskFreeRate: 3.9, equityBeta: 1.3, terminalGrowthRate: -0.5, leaseLiabilities: 12, valuationDate: '2026-07-01', cashFlowTiming: 'end_of_year' },
  directExit: { waccMode: 'direct', directWacc: 11, terminalValueMethod: 'exit_multiple', exitMultiple: 7.5, minorityInterest: 0 },
})) {
  test(`report round trip (${name}): exported Assumptions sheet re-imports to the same valuation`, () => {
    const model = run(overrides);
    const docs = buildValuationReportDocs({
      company, scenarioName: 'Base', valuation: model.valuation, assumptions: overrides, incomeStatements: model.incomeStatements,
      storageLabel: 'test', hasUnsavedChanges: false, historicalSourceLabel: 'sample', generatedAt: new Date('2026-11-01T00:00:00Z'),
    });
    assert.deepEqual(docs.map((d) => d.sheetName), ['Summary', 'Assumptions', 'Cash flows', 'Value bridge', 'Sensitivity', 'Checks']);
    const parsed = parseUploadWorkbook(bytesOf(buildWorkbook(docs)), ASSUMPTIONS_UPLOAD_SCHEMA);
    assert.equal(parsed.sheetName, 'Assumptions');
    assert.equal(uploadStats(parsed.rows).errors, 0, JSON.stringify(parsed.rows.filter((r) => r.errors.length).map((r) => r.errors)));
    const reimported = applyAssumptionPatch({}, importedToPatch(parsed.rows.map((r) => r.value!)));
    const again = run(reimported).valuation;
    assert.equal(again.dcfStatus, model.valuation.dcfStatus);
    assert.ok(Math.abs(again.enterpriseValue - model.valuation.enterpriseValue) < 1e-6);
    assert.ok(Math.abs((again.impliedSharePrice ?? NaN) - (model.valuation.impliedSharePrice ?? NaN)) < 1e-9);
  });
}

test('invalid valuation exports its reason and no numbers', () => {
  const model = run({ terminalGrowthRate: 15 });
  const docs = buildValuationReportDocs({
    company, scenarioName: 'Base', valuation: model.valuation, assumptions: { terminalGrowthRate: 15 }, incomeStatements: model.incomeStatements,
    storageLabel: 'test', hasUnsavedChanges: true, historicalSourceLabel: 'sample', generatedAt: new Date('2026-11-01T00:00:00Z'),
  });
  const wb = XLSX.read(bytesOf(buildWorkbook(docs)), { type: 'array' });
  const summary = JSON.stringify(XLSX.utils.sheet_to_json(wb.Sheets.Summary, { header: 1 }));
  assert.match(summary, /Not valued/);
  assert.match(summary, /unsaved changes/);
  assert.ok(!summary.includes('NaN'));
  assert.deepEqual(XLSX.utils.sheet_to_json(wb.Sheets['Value bridge'], { header: 1 }).filter((r) => (r as unknown[]).length > 0).length > 0, true);
});
