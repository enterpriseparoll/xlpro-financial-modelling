import type { ImportIssue, ImportedRow } from '@/engine/historicalImport';
import { buildWorkbook, downloadWorkbook, tableDocument, type ExportBranding } from '@/lib/export';
import { buildTemplateWorkbook } from '@/lib/excel-upload';
import { HISTORICAL_UPLOAD_SCHEMA } from '../engine/uploadSchemas';

export interface HistoricalExportContext {
  branding: ExportBranding;
  currency: string;
  /** Units the amounts are in, e.g. "Millions". */
  units: string;
  fileName: string;
}

export function downloadHistoricalTemplate(branding: ExportBranding, currency: string) {
  return downloadWorkbook(buildTemplateWorkbook(HISTORICAL_UPLOAD_SCHEMA, branding, currency), 'xlpro-historical-template');
}

/** Reviewed rows in the standard upload layout, so the file can be corrected and uploaded again. */
export function buildReviewedRowsWorkbook(rows: ImportedRow[], ctx: HistoricalExportContext) {
  const bank = rows.some((r) => r.sourceFormat === 'long_form');
  return buildWorkbook([tableDocument({
    sheetName: 'Reviewed data',
    title: 'Reviewed historical financial data',
    subtitle: `Source: ${ctx.fileName || 'not saved'} · Amounts in ${ctx.currency} ${ctx.units.toLowerCase()}`,
    caption: 'Imported figures as reviewed in xlPro. Not audited.',
    branding: ctx.branding,
    currency: ctx.currency,
    // Headings match the upload layout the data came from, so a corrected file can be uploaded again.
    columns: bank
      ? [
        { header: 'TICKER' }, { header: 'ACCOUNT TYPE', width: 22 }, { header: 'PARTICULAR', width: 40 },
        { header: 'AMOUNT', format: 'number' }, { header: 'ACCOUNT DATE' }, { header: 'canonical', width: 22 }, { header: 'Source row', format: 'integer' },
      ]
      : [
        { header: 'account', width: 36 }, { header: 'year', format: 'integer' }, { header: 'amount', format: 'number' },
        { header: 'canonical', width: 22 }, { header: 'Source row', format: 'integer' },
      ],
    rows: rows.map((r) => (bank
      ? [r.ticker ?? '', r.statementType ?? '', r.sourceAccount, r.amount, r.accountDate ?? String(r.period), r.canonical, r.line]
      : [r.sourceAccount, r.period, r.amount, r.canonical, r.line])),
  })]);
}

export function downloadReviewedRows(rows: ImportedRow[], ctx: HistoricalExportContext) {
  return downloadWorkbook(buildReviewedRowsWorkbook(rows, ctx), 'xlpro-reviewed-financial-data');
}

/**
 * Issues with the source row's data alongside, so each problem can be found and fixed in the file.
 * Statement-level issues (e.g. a balance sheet that does not reconcile) have no single row.
 */
export function buildIssuesWorkbook(issues: ImportIssue[], rows: ImportedRow[], ctx: HistoricalExportContext) {
  const byLine = new Map(rows.map((r) => [r.line, r]));
  return buildWorkbook([tableDocument({
    sheetName: 'Issues',
    title: 'Import validation issues',
    subtitle: `${issues.filter((i) => i.severity === 'error').length} error(s) · ${issues.filter((i) => i.severity === 'warning').length} warning(s) · ${ctx.fileName || 'unsaved file'}`,
    caption: 'Rows without a number apply to a whole statement or year.',
    branding: ctx.branding,
    currency: ctx.currency,
    columns: [
      { header: 'Excel row', format: 'integer' },
      { header: 'Severity' },
      { header: 'What to fix', width: 70 },
      { header: 'account', width: 30 },
      { header: 'year', format: 'integer' },
      { header: 'amount', format: 'number' },
    ],
    rows: issues.map((i) => {
      const r = i.line !== undefined ? byLine.get(i.line) : undefined;
      return [i.line ?? null, i.severity, i.message, r?.sourceAccount ?? '', r?.period ?? null, r?.amount ?? null];
    }),
  })]);
}

export function downloadIssues(issues: ImportIssue[], rows: ImportedRow[], ctx: HistoricalExportContext) {
  return downloadWorkbook(buildIssuesWorkbook(issues, rows, ctx), 'xlpro-import-issues');
}
