import React, { useRef, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, RotateCcw, UploadCloud, XCircle } from 'lucide-react';
import { SlideInForm } from '@/components/ui/slide-in-form';
import { AnimatedTable, type ColumnDef } from '@/components/animated';
import { downloadWorkbook, type ExportBranding } from '@/lib/export';
import {
  MAX_UPLOAD_BYTES,
  buildProblemRowsWorkbook,
  buildTemplateWorkbook,
  parseUploadWorkbook,
  uploadStats,
  type ParseResult,
  type ParsedUploadRow,
  type UploadSchema,
} from '@/lib/excel-upload';

interface Props<Row> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: UploadSchema<Row>;
  /** Where the data will go, e.g. "CloudScale · Base Case". Always shown so imports stay scoped. */
  targetLabel: string;
  branding: ExportBranding;
  currency: string;
  /** Feature-specific review of valid rows before anything is applied (e.g. a before/after table). */
  renderReview?: (rows: Row[]) => React.ReactNode;
  applyLabel: string;
  /** Applies reviewed rows. Return the honest outcome; it is shown as-is. */
  onApply: (rows: Row[], meta: { fileName: string; rowNumbers: number[] }) => Promise<{ ok: boolean; message: string }> | { ok: boolean; message: string };
}

// AnimatedTable rows are plain records; upload rows are rendered through column `render` functions.
type TableRow = Record<string, any>;

const ACCEPT = '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv';

/**
 * Shared Excel upload flow (docs/EXCEL_UPLOAD_SYSTEM_GUIDE.md): template → upload → preview with
 * per-row status → fix and retry → export problem rows → review → explicit apply. Nothing is applied
 * until the user presses the apply button.
 */
export function ExcelUploadDrawer<Row>({ open, onOpenChange, schema, targetLabel, branding, currency, renderReview, applyLabel, onApply }: Props<Row>) {
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ParseResult<Row> | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<{ ok: boolean; message: string } | null>(null);
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setFileName(null);
    setResult(null);
    setOutcome(null);
    if (input.current) input.current.value = '';
  };

  const readFile = async (file: File) => {
    setOutcome(null);
    setFileName(file.name);
    if (file.size > MAX_UPLOAD_BYTES) {
      setResult({ rows: [], fileErrors: [`The file is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`] });
      return;
    }
    setBusy(true);
    try {
      setResult(parseUploadWorkbook(await file.arrayBuffer(), schema));
    } finally {
      setBusy(false);
    }
  };

  const rows = result?.rows ?? [];
  const stats = uploadStats(rows);
  const valid = rows.filter((r) => r.status === 'valid' && r.value !== undefined);
  const applied = stats.uploaded > 0;

  const apply = async () => {
    if (!fileName || !valid.length) return;
    setBusy(true);
    try {
      const res = await onApply(valid.map((r) => r.value as Row), { fileName, rowNumbers: valid.map((r) => r.rowNumber) });
      setOutcome(res);
      if (res.ok && result) {
        setResult({ ...result, rows: result.rows.map((r) => (r.status === 'valid' ? { ...r, status: 'uploaded' } : r)) });
      }
    } catch (e) {
      setOutcome({ ok: false, message: e instanceof Error ? e.message : 'Could not apply the rows.' });
    } finally {
      setBusy(false);
    }
  };

  const columns: ColumnDef<ParsedUploadRow<Row>>[] = [
    { key: 'rowNumber', header: 'Row', align: 'right', width: '3.5rem' },
    {
      key: 'status', header: 'Status',
      render: (r) => (
        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
          r.status === 'error' ? 'bg-rose-100 text-rose-800' : r.status === 'uploaded' ? 'bg-sky-100 text-sky-800' : 'bg-emerald-100 text-emerald-800'}`}>
          {r.status === 'error' ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
          {r.status === 'error' ? 'Error' : r.status === 'uploaded' ? 'Applied' : 'Valid'}
        </span>
      ),
    },
    ...schema.columns.filter((c) => c.required || c.key !== 'unit').slice(0, 3).map<ColumnDef<ParsedUploadRow<Row>>>((c) => ({
      key: c.key, header: c.label, render: (r) => <span className="text-xs">{r.raw[c.key] || '—'}</span>,
    })),
    { key: 'errors', header: 'What to fix', render: (r) => <span className="block min-w-[14rem] whitespace-normal text-xs text-rose-800">{r.errors.map((e) => e.message).join(' ')}</span> },
  ];

  return (
    <SlideInForm open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }} title={`Import ${schema.title.toLowerCase()} from Excel`}
      description={`Importing into: ${targetLabel}`} widthClass="max-w-2xl">
      <div className="space-y-5">
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
          <div className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Step 1.</span> Download the template, fill it in and save it.</div>
          <button type="button" onClick={() => downloadWorkbook(buildTemplateWorkbook(schema, branding, currency), `${schema.id}-template`)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">
            <Download className="h-3.5 w-3.5" /> Download template (.xlsx)
          </button>
        </section>

        {!result && (
          <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) void readFile(f); }}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${dragging ? 'border-primary bg-primary-soft/30' : 'border-border hover:bg-muted/30'}`}>
            <UploadCloud className="h-8 w-8 text-primary" aria-hidden />
            <span className="text-sm font-semibold text-foreground"><span className="font-normal text-muted-foreground">Step 2.</span> Drop your Excel file here, or choose a file</span>
            <span className="text-[11px] text-muted-foreground">.xlsx preferred · .xls and .csv also accepted · up to {MAX_UPLOAD_BYTES / 1024 / 1024} MB</span>
            <input ref={input} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f); }} />
          </label>
        )}

        {busy && <p role="status" className="text-sm text-muted-foreground">Working…</p>}

        {result && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="truncate text-foreground">{fileName}</span>
              {result.sheetName && <span className="text-muted-foreground">sheet “{result.sheetName}”, headings on row {result.headerRowNumber}</span>}
            </div>
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold" aria-label="Upload counts">
              <span className="rounded bg-muted px-2 py-1">Total: {stats.total}</span>
              <span className="rounded bg-emerald-100 px-2 py-1 text-emerald-800">Valid: {stats.valid}</span>
              <span className="rounded bg-rose-100 px-2 py-1 text-rose-800">Errors: {stats.errors}</span>
              <span className="rounded bg-sky-100 px-2 py-1 text-sky-800">Applied: {stats.uploaded}</span>
            </div>

            {result.fileErrors.map((e) => <p key={e} role="alert" className="rounded bg-rose-50 px-3 py-2 text-xs text-rose-800">{e}</p>)}

            {rows.length > 0 && <AnimatedTable<TableRow> data={rows as TableRow[]} columns={columns as unknown as ColumnDef<TableRow>[]} />}

            <div className="flex flex-wrap gap-2">
              {stats.errors > 0 && (
                <button type="button" onClick={() => downloadWorkbook(buildProblemRowsWorkbook(schema, rows, branding, currency, fileName ?? 'upload'), `${schema.id}-rows-to-fix`)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                  <Download className="h-3.5 w-3.5" /> Download rows to fix (.xlsx)
                </button>
              )}
              <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                <RotateCcw className="h-3.5 w-3.5" /> Upload a corrected file
              </button>
            </div>

            {valid.length > 0 && !applied && renderReview && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Step 3. Review before applying</h3>
                {renderReview(valid.map((r) => r.value as Row))}
              </div>
            )}

            {!applied && (
              <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
                <button type="button" onClick={() => void apply()} disabled={busy || valid.length === 0}
                  className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-40">
                  {applyLabel} ({valid.length} row{valid.length === 1 ? '' : 's'})
                </button>
                {stats.errors > 0 && valid.length > 0 && <span className="text-[11px] text-muted-foreground">Rows with errors are left out. Fix them and upload again to include them.</span>}
              </div>
            )}
            {outcome && (
              <p role={outcome.ok ? 'status' : 'alert'} className={`rounded px-3 py-2 text-xs ${outcome.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{outcome.message}</p>
            )}
          </section>
        )}
      </div>
    </SlideInForm>
  );
}
