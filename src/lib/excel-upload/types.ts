/**
 * Shared Excel upload engine — contracts. Adapted from docs-guides/excelUpload.zip and
 * docs/EXCEL_UPLOAD_SYSTEM_GUIDE.md: template → upload → preview → validate → fix → retry →
 * export problem rows. Feature schemas plug in a column list and an optional row validator.
 */

export type UploadCellType = 'text' | 'number' | 'date' | 'choice';

export interface UploadColumn {
  key: string;
  /** Header text in the template; matching is case/space-insensitive and also accepts `key`. */
  label: string;
  type: UploadCellType;
  required?: boolean;
  /** For `choice` columns: accepted values (matched case-insensitively). */
  options?: string[];
  help?: string;
  width?: number;
}

export interface UploadSchema<Row = Record<string, unknown>> {
  id: string;
  title: string;
  description: string;
  columns: UploadColumn[];
  /** Plain-language instructions written to the template's Instructions sheet. */
  instructions: string[];
  /** Sample rows written to the template (raw cell values by column key). */
  sampleRows: Record<string, string | number>[];
  /** Optional extra sheet listing reference values (e.g. allowed assumption names). */
  reference?: { title: string; columns: { key: string; label: string }[]; rows: Record<string, string | number>[] };
  /** Feature-specific validation after type checks; returns the typed row or field errors. */
  validateRow?: (cells: Record<string, CellInput>, ctx: { rowNumber: number }) => { value?: Row; errors: RowError[] };
  /** Cross-row checks (e.g. duplicates); returns errors keyed by Excel row number. */
  validateAll?: (rows: { rowNumber: number; value: Row }[]) => Map<number, RowError[]>;
  maxRows?: number;
}

/** Normalised cell input after type parsing. */
export type CellInput = string | number | null;

export interface RowError {
  field: string;
  message: string;
}

export type RowStatus = 'valid' | 'error' | 'uploaded';

export interface ParsedUploadRow<Row = Record<string, unknown>> {
  /** The row number the user sees in Excel. */
  rowNumber: number;
  raw: Record<string, string>;
  value?: Row;
  status: RowStatus;
  errors: RowError[];
}

export interface UploadStats {
  total: number;
  valid: number;
  errors: number;
  uploaded: number;
}

export interface ParseResult<Row = Record<string, unknown>> {
  rows: ParsedUploadRow<Row>[];
  /** Problems with the file itself (no header, too many rows, unreadable). */
  fileErrors: string[];
  sheetName?: string;
  headerRowNumber?: number;
}
