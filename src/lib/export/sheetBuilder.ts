/**
 * Branded Excel export — renders ReportExportDocuments into styled worksheets (xlsx-js-style).
 * Adapted from docs-guides/export.zip with these deliberate changes:
 * - Missing numbers render as "Not available", never as 0.
 * - Every cell is a typed value; no formulas are ever written, so untrusted text cannot execute.
 * - Building (pure, testable) is separate from downloading (browser only).
 */
import XLSX, { type CellObject, type Range, type WorkBook, type WorkSheet } from '../xlsx';
import { buildStyles } from './branding';
import type { CellValue, ColumnFormat, ExportColumn, ExportSection, ReportExportDocument } from './types';

export const NOT_AVAILABLE_TEXT = 'Not available';
const NUMERIC: ColumnFormat[] = ['number', 'integer', 'currency', 'percent', 'multiple', 'decimal4'];
export const isNumericFormat = (f?: ColumnFormat) => !!f && NUMERIC.includes(f);

export function colLetter(index: number): string {
  let s = '';
  let n = index;
  do {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/** Excel forbids : \ / ? * [ ] in sheet names and limits them to 31 characters. */
export function formatSheetName(name: string): string {
  return (name || 'Report').replace(/[:\\/?*[\]]/g, ' ').slice(0, 31).trim() || 'Report';
}

/** Strips control characters from text written to cells. */
export function safeText(value: unknown): string {
  return String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, 32767);
}

export function resolveCell<T>(row: T, col: ExportColumn<T>): string | number | null {
  const raw: CellValue = typeof col.accessor === 'function' ? col.accessor(row) : (row as Record<string, CellValue>)[col.accessor as string];
  if (raw === null || raw === undefined || raw === '') return null;
  if (isNumericFormat(col.format)) return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
  // Mixed columns (e.g. an assumption "Value") keep real numbers as numbers, not text.
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  return safeText(raw);
}

type Sheet = Record<string, unknown>;
const put = (ws: Sheet, r: number, c: number, cell: { v: string | number; t: 's' | 'n'; s?: unknown }) => {
  ws[`${colLetter(c)}${r + 1}`] = cell;
};

export function buildStyledSheet(doc: ReportExportDocument): WorkSheet {
  const styles = buildStyles(doc.branding);
  const currency = doc.currency;
  const maxCols = Math.max(2, ...doc.sections.map((s) => s.columns.length));
  const ws: Sheet = {};
  const merges: Range[] = [];
  const widths = new Array<number>(maxCols).fill(12);
  let r = 0;

  const widen = (c: number, chars: number) => { widths[c] = Math.min(Math.max(widths[c], chars), 60); };
  const merge = (row: number, from = 0, to = maxCols - 1) => { if (to > from) merges.push({ s: { r: row, c: from }, e: { r: row, c: to } }); };
  const bandRow = (text: string, style: unknown) => {
    put(ws, r, 0, { v: safeText(text), t: 's', s: style });
    for (let c = 1; c < maxCols; c++) put(ws, r, c, { v: '', t: 's', s: styles.titleBand });
    merge(r); r++;
  };
  const textRow = (text: string, style: unknown) => { put(ws, r, 0, { v: safeText(text), t: 's', s: style }); merge(r); r++; };

  bandRow(doc.branding.companyName, styles.companyName);
  if (doc.branding.tagline) bandRow(doc.branding.tagline.toUpperCase(), styles.tagline);
  for (const line of doc.branding.contactLines ?? []) bandRow(line, styles.contact);
  r++;
  textRow(doc.reportTitle, styles.reportTitle);
  if (doc.reportSubtitle) textRow(doc.reportSubtitle, styles.reportSubtitle);
  if (doc.caption) textRow(doc.caption, styles.caption);
  r++;

  for (const block of doc.metaBlocks ?? []) {
    put(ws, r, 0, { v: safeText(block.title.toUpperCase()), t: 's', s: styles.metaTitle });
    for (let c = 1; c < maxCols; c++) put(ws, r, c, { v: '', t: 's', s: styles.metaTitle });
    merge(r); r++;
    for (const row of block.rows) {
      put(ws, r, 0, { v: safeText(row.label), t: 's', s: styles.metaLabel });
      widen(0, row.label.length + 2);
      const style = row.emphasis ? styles.metaValueEmphasis(row.format, currency) : styles.metaValue(row.format, currency);
      if (typeof row.value === 'number' && Number.isFinite(row.value)) put(ws, r, 1, { v: row.value, t: 'n', s: style });
      else put(ws, r, 1, { v: row.value === null || typeof row.value === 'number' ? NOT_AVAILABLE_TEXT : safeText(row.value), t: 's', s: style });
      for (let c = 2; c < maxCols; c++) put(ws, r, c, { v: '', t: 's', s: style });
      merge(r, 1); r++;
    }
    r++;
  }

  for (const section of doc.sections) r = renderSection(ws, r, section, styles, currency, maxCols, widen, merge);

  if (doc.footnote) {
    put(ws, r, 0, { v: safeText(doc.footnote), t: 's', s: styles.footnote });
    merge(r); r++;
  }

  ws['!ref'] = `A1:${colLetter(maxCols - 1)}${Math.max(r, 1)}`;
  ws['!merges'] = merges;
  ws['!cols'] = widths.map((wch) => ({ wch }));
  return ws as WorkSheet;
}

function renderSection<T>(
  ws: Sheet, startRow: number, section: ExportSection<T>, styles: ReturnType<typeof buildStyles>, currency: string, maxCols: number,
  widen: (c: number, n: number) => void, merge: (row: number, from?: number, to?: number) => void,
): number {
  let r = startRow;
  const cols = section.columns;
  if (section.title) {
    put(ws, r, 0, { v: safeText(section.title), t: 's', s: styles.sectionHeader });
    for (let c = 1; c < maxCols; c++) {
      const isTag = c === maxCols - 1 && !!section.tag;
      put(ws, r, c, { v: isTag ? safeText(section.tag) : '', t: 's', s: isTag ? styles.sectionTag : styles.sectionHeader });
    }
    merge(r, 0, section.tag ? maxCols - 2 : maxCols - 1); r++;
  }
  cols.forEach((col, c) => {
    put(ws, r, c, { v: safeText(col.header), t: 's', s: styles.colHeader(col.align) });
    widen(c, Math.max(col.width ?? 0, col.header.length + 2));
  });
  r++;

  const totals: Record<number, number> = {};
  section.rows.forEach((row, idx) => {
    const alt = idx % 2 === 1;
    const strong = section.emphasizeRow?.(row) ?? false;
    cols.forEach((col, c) => {
      const val = resolveCell(row, col);
      if (val === null) {
        put(ws, r, c, { v: isNumericFormat(col.format) ? NOT_AVAILABLE_TEXT : '', t: 's', s: styles.missing(col.align, alt) });
        return;
      }
      const numeric = typeof val === 'number';
      put(ws, r, c, { v: val, t: numeric ? 'n' : 's', s: styles.cell(col.align, col.format, currency, alt, strong) });
      if (numeric && col.total) totals[c] = (totals[c] ?? 0) + val;
      widen(c, Math.max(col.width ?? 0, (numeric ? val.toFixed(2) : val).length + 3));
    });
    r++;
  });

  if (section.showSubtotal && section.rows.length) {
    put(ws, r, 0, { v: safeText(section.subtotalLabel ?? 'Total'), t: 's', s: styles.subtotalLabel });
    cols.forEach((col, c) => {
      if (c === 0) return;
      const has = col.total && totals[c] !== undefined;
      put(ws, r, c, has ? { v: totals[c], t: 'n', s: styles.subtotalCell(col.align, col.format, currency) } : { v: '', t: 's', s: styles.subtotalCell(col.align, col.format, currency) });
    });
    r++;
  }
  return r + 1;
}

/** Builds a workbook in memory (pure; usable in tests and on a server). */
export function buildWorkbook(docs: ReportExportDocument[]): WorkBook {
  const wb = XLSX.utils.book_new();
  const used = new Set<string>();
  for (const doc of docs) {
    let name = formatSheetName(doc.sheetName ?? doc.reportTitle);
    for (let i = 2; used.has(name.toLowerCase()); i++) name = formatSheetName(`${name.slice(0, 27)} (${i})`);
    used.add(name.toLowerCase());
    XLSX.utils.book_append_sheet(wb, buildStyledSheet(doc), name);
  }
  return wb;
}

export function workbookToBytes(wb: WorkBook): Uint8Array {
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array;
}

/** Browser download. Returns the file name used. */
export function downloadWorkbook(wb: WorkBook, fileName: string): string {
  const safe = fileName.replace(/\.xlsx$/i, '').replace(/[^\w.\- ]+/g, ' ').trim().replace(/[\s.]+/g, '-').replace(/-{2,}/g, '-').replace(/^-|-$/g, '') || 'export';
  const name = `${safe}.xlsx`;
  XLSX.writeFile(wb, name);
  return name;
}
