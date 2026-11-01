import type { ImportIssue, ImportResult, ImportedRow } from '@/engine/historicalImport';
import { parseUploadWorkbook, type ParseResult } from '@/lib/excel-upload';
import { BANK_STATEMENT_UPLOAD_SCHEMA, HISTORICAL_UPLOAD_SCHEMA, type HistoricalRow } from '../engine/uploadSchemas';

function toImportResult(parsed: ParseResult<HistoricalRow>): ImportResult {
  const issues: ImportIssue[] = parsed.fileErrors.map((message) => ({ severity: 'error', message }));
  const rows: ImportedRow[] = [];
  for (const r of parsed.rows) {
    const prefix = r.sheetName ? `${r.sheetName}: ` : '';
    for (const e of r.errors) issues.push({ line: r.rowNumber, severity: 'error', message: `${prefix}${e.message}` });
    for (const w of r.warnings) issues.push({ line: r.rowNumber, severity: 'warning', message: `${prefix}${w.message}` });
    if (r.value) {
      rows.push({ ...r.value, id: r.sheetName ? `${r.sheetName}-${r.rowNumber}` : `xlsx-${r.rowNumber}`, line: r.rowNumber });
    }
  }
  return { rows, issues };
}

/**
 * Reads an uploaded workbook into reviewable rows. The bank statement layout is tried first (it is
 * the more specific header); otherwise the standard account/year/amount layout. Nothing is saved.
 */
export function readHistoricalUpload(bytes: ArrayBuffer | Uint8Array): ImportResult & { layout: 'bank' | 'standard' | 'unknown' } {
  const bank = parseUploadWorkbook(bytes, BANK_STATEMENT_UPLOAD_SCHEMA);
  if (bank.sheetNames?.length) return { ...toImportResult(bank), layout: 'bank' };
  const standard = parseUploadWorkbook(bytes, HISTORICAL_UPLOAD_SCHEMA);
  if (standard.sheetNames?.length) return { ...toImportResult(standard), layout: 'standard' };
  // Neither header found (or the file is unreadable): report the standard layout's message.
  return { ...toImportResult(standard), layout: 'unknown' };
}

/** Bank statement layout only, for pages that accept nothing else. Returns null when the header is absent. */
export function readBankStatementUpload(bytes: ArrayBuffer | Uint8Array): ImportResult | null {
  const parsed = parseUploadWorkbook(bytes, BANK_STATEMENT_UPLOAD_SCHEMA);
  if (parsed.sheetNames?.length) return toImportResult(parsed);
  // Unreadable, empty or oversized files are reported; a workbook without the bank header is not ours.
  return parsed.fileErrors.some((m) => m.startsWith('Could not find a header row')) ? null : toImportResult(parsed);
}
