import type { CellValue, ColumnAlign, ColumnFormat, ExportBranding, ReportExportDocument } from './types';

export interface TableColumn {
  header: string;
  format?: ColumnFormat;
  align?: ColumnAlign;
  width?: number;
}

/** A single-table branded sheet from positional rows — the common case for review and data exports. */
export function tableDocument(opts: {
  title: string;
  subtitle?: string;
  caption?: string;
  sheetName?: string;
  columns: TableColumn[];
  rows: CellValue[][];
  branding: ExportBranding;
  currency: string;
  footnote?: string;
}): ReportExportDocument {
  return {
    sheetName: opts.sheetName,
    reportTitle: opts.title,
    reportSubtitle: opts.subtitle,
    caption: opts.caption,
    branding: opts.branding,
    currency: opts.currency,
    footnote: opts.footnote,
    sections: [{
      columns: opts.columns.map((c, i) => ({
        header: c.header,
        accessor: (row: CellValue[]) => row[i],
        format: c.format,
        align: c.align ?? (c.format && c.format !== 'text' && c.format !== 'date' ? 'right' : 'left'),
        width: c.width,
      })),
      rows: opts.rows,
    }],
  };
}
