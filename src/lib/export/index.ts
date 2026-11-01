/**
 * Shared branded Excel export. Describe a report as ReportExportDocument(s), then:
 *   downloadWorkbook(buildWorkbook([doc1, doc2]), 'file-name')
 */
export type {
  CellValue,
  ColumnAlign,
  ColumnFormat,
  ExportBranding,
  ExportColumn,
  ExportMetaBlock,
  ExportMetaRow,
  ExportSection,
  ReportExportDocument,
} from './types';
export { DEFAULT_ACCENT, DEFAULT_PRIMARY, buildStyles, numFmtFor, toArgb } from './branding';
export {
  NOT_AVAILABLE_TEXT,
  buildStyledSheet,
  buildWorkbook,
  colLetter,
  downloadWorkbook,
  formatSheetName,
  isNumericFormat,
  resolveCell,
  safeText,
  workbookToBytes,
} from './sheetBuilder';
