import XLSX, { type CellObject, type Range, type WorkBook, type WorkSheet } from '../xlsx';
import type { CellInput, ParseResult, ParsedUploadRow, RowError, UploadColumn, UploadSchema, UploadStats } from './types';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const DEFAULT_MAX_ROWS = 2000;
const HEADER_SCAN_ROWS = 40;

/** Case-, space- and punctuation-insensitive header key (handles NBSP / zero-width characters). */
export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKC')
    .replace(/[\s  -​﻿  　]+/g, '')
    .replace(/[^a-z0-9%]/gi, '')
    .toLowerCase();
}

const matches = (col: UploadColumn, header: string) => header === normalizeHeader(col.label) || header === normalizeHeader(col.key);

function rawText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : v.toISOString().slice(0, 10);
  return String(v).trim();
}

/** Parses a cell by column type; returns the typed value or an error message. */
export function parseCell(col: UploadColumn, value: unknown): { value: CellInput; error?: string } {
  const text = rawText(value);
  if (text === '') return col.required ? { value: null, error: `${col.label} is required.` } : { value: null };
  switch (col.type) {
    case 'number': {
      if (typeof value === 'number') return Number.isFinite(value) ? { value } : { value: null, error: `${col.label} must be a number.` };
      const cleaned = text.replace(/,/g, '').replace(/%$/, '');
      const n = Number(cleaned);
      return cleaned !== '' && Number.isFinite(n) ? { value: n } : { value: null, error: `${col.label} must be a number, not "${text}".` };
    }
    case 'date': {
      if (typeof value === 'number') {
        const d = XLSX.SSF.parse_date_code(value);
        if (d && d.y >= 1900) return { value: `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}` };
        return { value: null, error: `${col.label} is not a valid date.` };
      }
      return /^\d{4}-\d{2}-\d{2}$/.test(text) ? { value: text } : { value: null, error: `${col.label} must be a date written as YYYY-MM-DD, not "${text}".` };
    }
    case 'choice': {
      const hit = col.options?.find((o) => o.toLowerCase() === text.toLowerCase());
      return hit ? { value: hit } : { value: null, error: `${col.label} must be one of: ${col.options?.join(', ')}.` };
    }
    default:
      return { value: text.slice(0, 2000) };
  }
}

/**
 * Reads cell values row by row. A number shown with a percent format (typed as "4.5%") is stored by
 * Excel as 0.045; it is returned as the text "4.5%" so it is read as the percentage the user sees.
 */
function sheetCells(ws: WorkSheet): unknown[][] {
  if (!ws?.['!ref']) return [];
  const range = XLSX.utils.decode_range(ws['!ref']);
  const lastRow = Math.min(range.e.r, range.s.r + 100_000);
  const rows: unknown[][] = [];
  for (let r = range.s.r; r <= lastRow; r++) {
    const row: unknown[] = [];
    for (let c = range.s.c; c <= Math.min(range.e.c, range.s.c + 200); c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })] as CellObject | undefined;
      if (!cell || cell.v === undefined || cell.v === null) { row.push(''); continue; }
      if (cell.t === 'n' && typeof cell.v === 'number' && typeof cell.z === 'string' && cell.z.includes('%')) {
        row.push(`${Number((cell.v * 100).toPrecision(12))}%`);
      } else {
        row.push(cell.v);
      }
    }
    rows.push(row);
  }
  return rows;
}

/** Finds the header row (templates have title rows above it) and returns column positions. */
function findHeader(data: unknown[][], columns: UploadColumn[]): { index: number; positions: Map<string, number> } | null {
  const required = columns.filter((c) => c.required);
  for (let i = 0; i < Math.min(data.length, HEADER_SCAN_ROWS); i++) {
    const headers = (data[i] ?? []).map(normalizeHeader);
    const positions = new Map<string, number>();
    for (const col of columns) {
      const at = headers.findIndex((h) => matches(col, h));
      if (at >= 0) positions.set(col.key, at);
    }
    if (required.every((c) => positions.has(c.key)) && positions.size > 0) return { index: i, positions };
  }
  return null;
}

/**
 * Reads the first worksheet that contains the schema's header row. Original Excel row numbers are
 * preserved so error messages point at the right line. Nothing here commits data anywhere.
 */
export function parseUploadWorkbook<Row>(bytes: ArrayBuffer | Uint8Array, schema: UploadSchema<Row>): ParseResult<Row> {
  const size = bytes.byteLength;
  if (size === 0) return { rows: [], fileErrors: ['The file is empty.'] };
  if (size > MAX_UPLOAD_BYTES) return { rows: [], fileErrors: [`The file is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`] };

  let wb: WorkBook;
  try {
    wb = XLSX.read(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), { type: 'array', cellDates: false, cellFormula: false, cellHTML: false, cellNF: true });
  } catch {
    return { rows: [], fileErrors: ['This file could not be read as an Excel workbook. Save it as .xlsx and try again.'] };
  }
  if (!wb.SheetNames.length) return { rows: [], fileErrors: ['The workbook has no worksheets.'] };

  for (const sheetName of wb.SheetNames) {
    const data = sheetCells(wb.Sheets[sheetName]);
    const header = findHeader(data, schema.columns);
    if (!header) continue;

    const maxRows = schema.maxRows ?? DEFAULT_MAX_ROWS;
    const body = data.slice(header.index + 1);
    const nonBlank = body.filter((cells) => cells.some((v) => rawText(v) !== '')).length;
    if (nonBlank > maxRows) {
      return { rows: [], sheetName, headerRowNumber: header.index + 1, fileErrors: [`The sheet has ${nonBlank} rows; the limit is ${maxRows}. Split the file and upload in parts.`] };
    }

    const rows: ParsedUploadRow<Row>[] = [];
    body.forEach((cells, offset) => {
      if (!cells.some((v) => rawText(v) !== '')) return;
      const rowNumber = header.index + offset + 2;
      const raw: Record<string, string> = {};
      const typed: Record<string, CellInput> = {};
      const errors: RowError[] = [];
      for (const col of schema.columns) {
        const pos = header.positions.get(col.key);
        const cell = pos === undefined ? '' : cells[pos];
        raw[col.key] = rawText(cell);
        const parsed = parseCell(col, cell);
        typed[col.key] = parsed.value;
        if (parsed.error) errors.push({ field: col.key, message: parsed.error });
      }
      let value: Row | undefined;
      if (!errors.length && schema.validateRow) {
        const res = schema.validateRow(typed, { rowNumber });
        errors.push(...res.errors);
        value = res.value;
      } else if (!errors.length) {
        value = typed as unknown as Row;
      }
      rows.push({ rowNumber, raw, value: errors.length ? undefined : value, status: errors.length ? 'error' : 'valid', errors });
    });

    if (schema.validateAll) {
      const extra = schema.validateAll(rows.filter((r) => r.value !== undefined).map((r) => ({ rowNumber: r.rowNumber, value: r.value as Row })));
      for (const row of rows) {
        const more = extra.get(row.rowNumber);
        if (more?.length) { row.errors.push(...more); row.status = 'error'; row.value = undefined; }
      }
    }

    const fileErrors = rows.length ? [] : ['The header row was found but there are no data rows below it.'];
    return { rows, fileErrors, sheetName, headerRowNumber: header.index + 1 };
  }

  const expected = schema.columns.filter((c) => c.required).map((c) => c.label).join(', ');
  return { rows: [], fileErrors: [`Could not find a header row with the columns: ${expected}. Download the template and keep its column headings.`] };
}

export function uploadStats(rows: ParsedUploadRow<unknown>[]): UploadStats {
  return {
    total: rows.length,
    valid: rows.filter((r) => r.status === 'valid').length,
    errors: rows.filter((r) => r.status === 'error').length,
    uploaded: rows.filter((r) => r.status === 'uploaded').length,
  };
}
