import { test } from 'node:test';
import assert from 'node:assert/strict';
import XLSX from '../../../lib/xlsx';
import { workbookToBytes, NOT_AVAILABLE_TEXT } from '../../../lib/export';
import { buildTemplateWorkbook } from '../../../lib/excel-upload';
import { parseHistoricalCsv, validateHistoricalRows, type ImportedRow } from '../../../engine/historicalImport';
import { HISTORICAL_UPLOAD_SCHEMA, accountDateYear } from '../engine/uploadSchemas';
import { readBankStatementUpload, readHistoricalUpload } from '../services/readHistoricalUpload';
import { buildIssuesWorkbook, buildReviewedRowsWorkbook } from '../services/historicalExports';
import { buildBankExcelPack } from '../../bank-export/services/buildBankExport';

function book(sheets: Record<string, unknown[][]>): Uint8Array {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), name);
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}
const sheetJson = (bytes: Uint8Array, sheet?: string) => {
  const wb = XLSX.read(bytes, { type: 'array' });
  return XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet ?? wb.SheetNames[0]], { header: 1 });
};
const essentials = (rows: ImportedRow[]) => rows.map(({ sourceAccount, period, amount, canonical }) => ({ sourceAccount, period, amount, canonical }));

test('standard layout gives the same rows as the CSV path, including suggestions and unknown-ID warnings', () => {
  const data = [
    ['account', 'year', 'amount', 'canonical'],
    ['Revenue', 2024, 120, ''],
    ['Cash', 2024, 40, 'cash'],
    ['Mystery line', 2024, 5, 'not_a_real_id'],
    ['Debt', 2024, '(30)', ''],
  ];
  const xlsx = readHistoricalUpload(book({ Data: data }));
  const csv = parseHistoricalCsv('account,year,amount,canonical\nRevenue,2024,120,\nCash,2024,40,cash\nMystery line,2024,5,not_a_real_id\nDebt,2024,-30,\n');
  assert.equal(xlsx.layout, 'standard');
  assert.deepEqual(essentials(xlsx.rows), essentials(csv.rows));
  assert.deepEqual(xlsx.rows.map((r) => r.line), [2, 3, 4, 5]);
  assert.equal(xlsx.rows[3].amount, -30, 'accounting-style negative');
  assert.deepEqual(xlsx.issues.map((i) => [i.line, i.severity]), [[4, 'warning']]);
  assert.match(xlsx.issues[0].message, /manual mapping required/);
});

test('row errors keep their Excel row; bad rows are excluded, good rows kept', () => {
  const res = readHistoricalUpload(book({ Data: [['Notes above the table'], [], ['Account', 'Year', 'Amount'], ['Revenue', 24, 10], ['Cash', 2024, 'abc'], ['Equity', 2024, 5]] }));
  assert.deepEqual(res.rows.map((r) => r.line), [6]);
  assert.deepEqual(res.issues.map((i) => i.line), [4, 5]);
  assert.match(res.issues[0].message, /four-digit year/);
  assert.match(res.issues[1].message, /must be a number/);
});

test('template round trip: illustrative sample parses cleanly and its balance sheet reconciles', () => {
  const res = readHistoricalUpload(workbookToBytes(buildTemplateWorkbook(HISTORICAL_UPLOAD_SCHEMA, { companyName: 'T' }, 'USD')));
  assert.equal(res.layout, 'standard');
  assert.equal(res.rows.length, HISTORICAL_UPLOAD_SCHEMA.sampleRows.length);
  assert.deepEqual(res.issues, []);
  assert.deepEqual(validateHistoricalRows(res.rows).filter((i) => i.severity === 'error'), []);
});

const header = ['TICKER', 'ACCOUNT TYPE', 'PARTICULAR', 'AMOUNT', 'ACCOUNT DATE'];

test('bank statements: every sheet with the header is read; dates, negatives and sheet-qualified errors', () => {
  const res = readHistoricalUpload(book({
    Cover: [['Annual report extract']],
    'Income Statement': [header, ['scb', 'Income Statement', 'Interest income', 1000, '2024-12-31'], ['SCB', 'Income Statement', 'Impairment', '(120)', 45657]],
    'Balance Sheet': [['Prepared by finance'], header, ['SCB', 'Balance Sheet', 'Total equity', 5000, 2024], ['SCB', 'Balance Sheet', 'Deposits', 9000, 'not a date']],
  }));
  assert.equal(res.layout, 'bank');
  assert.deepEqual(res.rows.map((r) => [r.id, r.ticker, r.period, r.amount, r.sourceFormat]), [
    ['Income Statement-2', 'SCB', 2024, 1000, 'long_form'],
    ['Income Statement-3', 'SCB', 2024, -120, 'long_form'],
    ['Balance Sheet-3', 'SCB', 2024, 5000, 'long_form'],
  ]);
  assert.equal(res.rows[1].accountDate, '2024-12-31', 'Excel date serial becomes an ISO date');
  assert.deepEqual(res.issues.map((i) => i.line), [4]);
  assert.match(res.issues[0].message, /^Balance Sheet: ACCOUNT DATE must be a date/);
});

test('bank-only reader: null for other layouts, reported errors for unreadable files', () => {
  assert.equal(readBankStatementUpload(book({ Data: [['account', 'year', 'amount'], ['Revenue', 2024, 1]] })), null);
  assert.match(readBankStatementUpload(new Uint8Array())!.issues[0].message, /empty/);
  // Arbitrary bytes are read as a tiny text sheet without the bank header: "not a bank file", not a crash.
  assert.equal(readBankStatementUpload(new Uint8Array([1, 2, 3, 4])), null);
  assert.match(readBankStatementUpload(new Uint8Array(6 * 1024 * 1024))!.issues[0].message, /larger than/);
});

test('account dates: plain years stay years; serials, ISO and text dates resolve; junk is rejected', () => {
  assert.deepEqual(accountDateYear('2024'), { year: 2024 });
  assert.deepEqual(accountDateYear('45657'), { year: 2024, iso: '2024-12-31' });
  assert.equal(accountDateYear('2023/06/30').year, 2023);
  assert.equal(accountDateYear('31 Dec 2022').year, 2022);
  assert.deepEqual(accountDateYear('soon'), {});
});

test('reviewed rows export re-imports to the same rows (standard and bank layouts)', () => {
  const ctx = { branding: { companyName: 'T' }, currency: 'USD', units: 'Millions', fileName: 'src.xlsx' };
  const standard = readHistoricalUpload(book({ Data: [['account', 'year', 'amount', 'canonical'], ['Revenue', 2023, 100, 'revenue'], ['Revenue', 2024, 110.5, 'revenue'], ['Odd', 2024, -3, '']] }));
  const again = readHistoricalUpload(workbookToBytes(buildReviewedRowsWorkbook(standard.rows, ctx)));
  assert.deepEqual(essentials(again.rows), essentials(standard.rows));

  const bank = readHistoricalUpload(book({ IS: [header, ['SCB', 'Income Statement', 'Interest income', 1000, '2024-12-31']] }));
  const bankAgain = readHistoricalUpload(workbookToBytes(buildReviewedRowsWorkbook(bank.rows, ctx)));
  assert.equal(bankAgain.layout, 'bank');
  assert.deepEqual(bankAgain.rows.map((r) => [r.ticker, r.statementType, r.sourceAccount, r.amount, r.period]), [['SCB', 'Income Statement', 'Interest income', 1000, 2024]]);
});

test('issues workbook puts each problem next to its source row data', () => {
  const rows: ImportedRow[] = [{ id: 'a', sourceAccount: 'Cash', period: 2024, amount: 40, canonical: 'cash', line: 7 }];
  const wb = buildIssuesWorkbook([{ line: 7, severity: 'error', message: 'Duplicate source account Cash for FY2024.' }, { severity: 'warning', message: 'FY2024: missing equity.' }], rows,
    { branding: { companyName: 'T' }, currency: 'USD', units: 'Millions', fileName: 'f.xlsx' });
  const text = JSON.stringify(sheetJson(workbookToBytes(wb)));
  assert.ok(text.includes('[7,"error","Duplicate source account Cash for FY2024.","Cash",2024,40]'));
  assert.ok(text.includes('"warning","FY2024: missing equity."'));
});

test('bank Excel pack: all sections present, missing values never shown as zero', () => {
  const pack = {
    generatedAt: '2026-11-01T00:00:00.000Z', company: { id: 'c', name: 'Bank Co', ticker: 'SCB', currency: 'GHS' },
    source: { fileName: 'scb.xlsx', version: 2, activatedAt: '2026-10-01T00:00:00.000Z', marketSession: null },
    scenario: { id: 'base', name: 'Base', settings: {} },
    historical: [{ year: 2023, accounts: { total_equity: 5000 } }, { year: 2024, accounts: { total_equity: 5500, net_interest_income: 900 } }],
    forecast: [{ year: 2025, afterTax: 120, revenue: 800 }], forecastUnit: 'GHS millions',
    metrics: [{ label: 'ROE', value: undefined, unit: '%', source: 'Calculated', warning: 'Equity missing' }],
    valuation: null, warnings: ['No matching market session found.'],
  } as unknown as Parameters<typeof buildBankExcelPack>[0];
  const bytes = workbookToBytes(buildBankExcelPack(pack));
  assert.deepEqual(XLSX.read(bytes, { type: 'array' }).SheetNames, ['Summary', 'Historical', 'Forecast', 'Ratios', 'Warnings']);
  const historical = JSON.stringify(sheetJson(bytes, 'Historical'));
  assert.ok(historical.includes(`["net_interest_income","${NOT_AVAILABLE_TEXT}",900]`), 'year without the account shows Not available');
  assert.ok(JSON.stringify(sheetJson(bytes, 'Ratios')).includes(`["ROE","${NOT_AVAILABLE_TEXT}","%"`));
});
