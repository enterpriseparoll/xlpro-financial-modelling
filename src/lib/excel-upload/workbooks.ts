import type { WorkBook } from '../xlsx';
import { buildWorkbook, type ExportBranding, type ReportExportDocument } from '../export';
import type { ParsedUploadRow, UploadSchema } from './types';

/**
 * Template workbook: Instructions sheet, the Data sheet (header row + illustrative samples) and an
 * optional Reference sheet. The parser locates the header row, so the branded title rows are fine.
 */
export function buildTemplateWorkbook<Row>(schema: UploadSchema<Row>, branding: ExportBranding, currency: string): WorkBook {
  const data: ReportExportDocument = {
    sheetName: 'Data',
    reportTitle: `${schema.title} — upload template`,
    reportSubtitle: 'Replace the sample rows with your own. Keep the column headings.',
    branding,
    currency,
    sections: [{
      columns: schema.columns.map((c) => ({ header: c.label, accessor: c.key, width: c.width ?? Math.max(16, c.label.length + 4) })),
      rows: schema.sampleRows,
    }],
  };
  const instructions: ReportExportDocument = {
    sheetName: 'Instructions',
    reportTitle: `${schema.title} — how to fill this in`,
    reportSubtitle: schema.description,
    branding,
    currency,
    sections: [
      { title: 'Steps', columns: [{ header: '#', accessor: 'n', format: 'integer', width: 5 }, { header: 'What to do', accessor: 'text', width: 90 }], rows: schema.instructions.map((text, i) => ({ n: i + 1, text })) },
      {
        title: 'Columns',
        columns: [
          { header: 'Column', accessor: 'label', width: 22 },
          { header: 'Required', accessor: 'required', width: 10 },
          { header: 'Accepted values', accessor: 'accepted', width: 40 },
          { header: 'Notes', accessor: 'help', width: 60 },
        ],
        rows: schema.columns.map((c) => ({
          label: c.label,
          required: c.required ? 'Yes' : 'No',
          accepted: c.type === 'choice' ? c.options?.join(', ') : c.type === 'number' ? 'Number' : c.type === 'date' ? 'Date (YYYY-MM-DD)' : 'Text',
          help: c.help ?? '',
        })),
      },
    ],
    footnote: 'Sample rows are illustrative only and must be replaced with your own reviewed figures.',
  };
  const docs = [instructions, data];
  if (schema.reference) {
    docs.push({
      sheetName: 'Reference',
      reportTitle: schema.reference.title,
      branding,
      currency,
      sections: [{ columns: schema.reference.columns.map((c) => ({ header: c.label, accessor: c.key })), rows: schema.reference.rows }],
    });
  }
  return buildWorkbook(docs);
}

/** Problem rows with their original row numbers and plain-language reasons, ready to fix and re-upload. */
export function buildProblemRowsWorkbook<Row>(schema: UploadSchema<Row>, rows: ParsedUploadRow<Row>[], branding: ExportBranding, currency: string, fileName: string): WorkBook {
  const bad = rows.filter((r) => r.status === 'error');
  return buildWorkbook([{
    sheetName: 'Rows to fix',
    reportTitle: `${schema.title} — rows to fix`,
    reportSubtitle: `${bad.length} row(s) from ${fileName} could not be accepted`,
    caption: 'Correct the values, delete the "Excel row" and "What to fix" columns if you wish, and upload again.',
    branding,
    currency,
    sections: [{
      columns: [
        { header: 'Excel row', accessor: 'rowNumber', format: 'integer', width: 10 },
        ...schema.columns.map((c) => ({ header: c.label, accessor: (r: ParsedUploadRow<Row>) => r.raw[c.key] ?? '', width: Math.max(14, c.label.length + 4) })),
        { header: 'What to fix', accessor: (r: ParsedUploadRow<Row>) => r.errors.map((e) => e.message).join(' '), width: 70 },
      ],
      rows: bad,
    }],
  }]);
}
