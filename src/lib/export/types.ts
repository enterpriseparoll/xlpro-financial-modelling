/**
 * Branded Excel export — document model.
 * Adapted from the supplied reference package (docs-guides/export.zip): a report is described
 * declaratively (branding + title + meta blocks + sections) and rendered by sheetBuilder.ts.
 */

export interface ExportBranding {
  companyName: string;
  tagline?: string;
  contactLines?: string[];
  /** Hex, e.g. "#17324D". */
  primaryColor?: string;
  accentColor?: string;
}

export interface ExportMetaRow {
  label: string;
  /** null renders as "Not available" — never as zero. */
  value: string | number | null;
  emphasis?: boolean;
  format?: ColumnFormat;
}

export interface ExportMetaBlock {
  title: string;
  rows: ExportMetaRow[];
}

export type ColumnAlign = 'left' | 'right' | 'center';
/** `percent` expects values already in percent (12.5 → "12.50%"); `multiple` renders "8.5x". */
export type ColumnFormat = 'text' | 'number' | 'integer' | 'currency' | 'percent' | 'multiple' | 'decimal4' | 'date';

export type CellValue = string | number | null | undefined;

export interface ExportColumn<T = Record<string, unknown>> {
  header: string;
  accessor: keyof T | ((row: T) => CellValue);
  align?: ColumnAlign;
  format?: ColumnFormat;
  width?: number;
  total?: boolean;
}

export interface ExportSection<T = any> {
  title?: string;
  tag?: string;
  columns: ExportColumn<T>[];
  rows: T[];
  showSubtotal?: boolean;
  subtotalLabel?: string;
  /** Optional per-row emphasis (bold band), e.g. totals inside a bridge. */
  emphasizeRow?: (row: T) => boolean;
}

export interface ReportExportDocument {
  sheetName?: string;
  reportTitle: string;
  reportSubtitle?: string;
  caption?: string;
  branding: ExportBranding;
  metaBlocks?: ExportMetaBlock[];
  sections: ExportSection[];
  footnote?: string;
  /** ISO currency code for `currency` cells. */
  currency: string;
}
