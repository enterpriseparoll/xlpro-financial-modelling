import { activateHistoricalDataset, validateForActivation, calibrateHistoricalDrivers } from '@/engine/historicalActivation';
import { downloadBrandedWorkbook, readHistoricalWorkbook, reviewedRowsToExcel } from '@/lib/excelWorkbook';
import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleAlert, Download, FileSpreadsheet, ShieldAlert, UploadCloud } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { useModelContext } from '@/contexts/ModelContext';
import { CANONICAL_ACCOUNTS, parseHistoricalCsv, validateHistoricalRows, type ImportedRow, type ImportIssue, type CanonicalAccount } from '@/engine/historicalImport';

const STORAGE_PREFIX = 'xlpro:historical-import:v1:';
type SavedImport = { companyId: string; fileName: string; importedAt: string; rows: ImportedRow[]; units: string };
function readSaved(companyId: string): SavedImport | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + companyId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedImport;
    return parsed.companyId === companyId && Array.isArray(parsed.rows) ? parsed : null;
  } catch { return null; }
}

export function HistoricalImportWorkspace() {
  const { activeCompany, triggerToast, refreshHistoricalDataset, activeHistoricalDataset } = useModelContext();
  const [saved, setSaved] = useState<SavedImport | null>(() => readSaved(activeCompany.id));
  const [draft, setDraft] = useState<ImportedRow[]>(() => readSaved(activeCompany.id)?.rows ?? []);
  const [fileName, setFileName] = useState(() => readSaved(activeCompany.id)?.fileName ?? '');
  const [units, setUnits] = useState(() => readSaved(activeCompany.id)?.units ?? 'Millions');
  const [parseIssues, setParseIssues] = useState<ImportIssue[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState(activeCompany.id);
  if (activeCompanyId !== activeCompany.id) {
    setActiveCompanyId(activeCompany.id);
    setSaved(readSaved(activeCompany.id));
    setDraft(readSaved(activeCompany.id)?.rows ?? []);
    setFileName(readSaved(activeCompany.id)?.fileName ?? '');
    setUnits(readSaved(activeCompany.id)?.units ?? 'Millions');
    setParseIssues([]);
  }
  const issues = useMemo(() => [...parseIssues, ...(draft.length ? validateHistoricalRows(draft) : [])], [draft, parseIssues]);
  const activationIssues = useMemo(() => draft.length ? validateForActivation(draft) : [], [draft]);
  const activationErrors = activationIssues.filter(issue => issue.severity === 'error');
  const isBanking = activeCompany.sectorId === 'banking';
  const canActivate = !isBanking && activationErrors.length === 0;
  const calibrated = useMemo(() => calibrateHistoricalDrivers(draft), [draft]);
  const errors = issues.filter(issue => issue.severity === 'error');
  const warnings = issues.filter(issue => issue.severity === 'warning');
  const periods = [...new Set(draft.map(row => row.period))].sort();
  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { triggerToast('Select an Excel workbook (.xlsx/.xls) or CSV.', 'error'); return; }
    if (file.size > 5_000_000) { triggerToast('Maximum CSV file size is 5 MB.', 'error'); return; }
    try {
      const result = /\.csv$/i.test(file.name) ? parseHistoricalCsv(await file.text()) : readHistoricalWorkbook(await file.arrayBuffer());
      setDraft(result.rows); setParseIssues(result.issues); setFileName(file.name);
      triggerToast(`Parsed ${result.rows.length} rows. Review mapping and validation before saving.`, 'info');
    } catch (error) { setDraft([]); setParseIssues([{ severity: 'error', message: error instanceof Error ? error.message : 'Unable to parse CSV.' }]); }
  };
  const updateMapping = (id: string, canonical: CanonicalAccount | '') => setDraft(rows => rows.map(row => row.id === id ? { ...row, canonical } : row));
  const save = () => {
    if (!draft.length || errors.length) return;
    const record: SavedImport = { companyId: activeCompany.id, fileName, importedAt: new Date().toISOString(), rows: draft, units };
    try {
      localStorage.setItem(STORAGE_PREFIX + activeCompany.id, JSON.stringify(record));
      setSaved(record);
      if (!isBanking && activationErrors.length === 0) {
        try {
          activateHistoricalDataset({ id: `history-${Date.now()}`, companyId: activeCompany.id, fileName, importedAt: record.importedAt, rows: draft, units: units as 'Units' | 'Thousands' | 'Millions' });
          refreshHistoricalDataset();
          triggerToast('Saved and activated successfully. Forecasts have been recalculated.', 'success');
        } catch (error) {
          triggerToast(`Saved, but activation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
        }
      } else {
        triggerToast(isBanking ? 'SCB data saved successfully. Banking forecast activation requires a separate banking engine.' : `Saved successfully. Activation has ${activationErrors.length} blocking issue(s).`, 'success');
      }
    } catch { triggerToast('Browser storage unavailable. Export your reviewed data instead.', 'error'); }
  };
  const activate = () => {
    if (isBanking) { triggerToast('Bank history needs a banking-specific activation engine. Industrial statement rules cannot safely value a bank.', 'error'); return; }
    if (activationErrors.length) { triggerToast(`Activation blocked: ${activationErrors[0].message}`, 'error'); return; }
    if (!saved || saved.companyId !== activeCompany.id || saved.fileName !== fileName || JSON.stringify(saved.rows) !== JSON.stringify(draft)) {
      triggerToast('Save the current reviewed dataset before activating.', 'error'); return;
    }
    try {
      activateHistoricalDataset({ id: `history-${Date.now()}`, companyId: activeCompany.id, fileName, importedAt: saved.importedAt, rows: draft, units: units as 'Units' | 'Thousands' | 'Millions' });
      refreshHistoricalDataset();
      triggerToast('Historical financials activated. Forecast and valuation recalculated.', 'success');
    } catch (error) { triggerToast(error instanceof Error ? error.message : 'Activation failed.', 'error'); }
  };
  const brand = { companyName: activeCompany.name, currency: activeCompany.currency };
  const exportReviewed = () => reviewedRowsToExcel(draft, brand);
  const exportErrors = () => downloadBrandedWorkbook('xlpro-import-errors', 'Import Validation Issues', ['Row', 'Severity', 'Issue'], issues.map(issue => [issue.line ?? '', issue.severity, issue.message]), brand);
  const downloadTemplate = () => downloadBrandedWorkbook('xlpro-historical-template', 'Historical Data Upload Template — Illustrative Sample', ['account', 'year', 'amount', 'canonical'],
    [['Revenue', 2024, 120, 'revenue'], ['Cost of goods sold', 2024, 50, 'cogs'], ['Operating expenses', 2024, 30, 'operating_expenses'],
      ['Interest expense', 2024, 3, 'interest_expense'], ['Income tax', 2024, 7, 'income_tax'],
      ['Cash', 2024, 40, 'cash'], ['Accounts receivable', 2024, 20, 'receivables'], ['Inventory', 2024, 10, 'inventory'],
      ['Property plant and equipment', 2024, 50, 'ppe'], ['Other assets', 2024, 5, 'other_assets'],
      ['Accounts payable', 2024, 15, 'payables'], ['Debt', 2024, 30, 'debt'], ['Other liabilities', 2024, 10, 'other_liabilities'],
      ['Total equity', 2024, 70, 'equity'], ['Depreciation', 2024, 5, 'depreciation'],
      ['Operating cash flow', 2024, 30, 'operating_cash_flow'], ['Investing cash flow', 2024, -15, 'investing_cash_flow'],
      ['Financing cash flow', 2024, -5, 'financing_cash_flow'], ['Beginning cash', 2024, 30, 'beginning_cash'],
      ['Ending cash', 2024, 40, 'ending_cash'], ['Capex', 2024, 15, 'capex']], brand);
  return <PageShell moduleName="DATA / FINANCIAL HISTORY" title={activeCompany.name} titleHighlight="Import workspace"
    description="Bring your historical accounts into a controlled review process. Nothing is accepted silently or presented as audited.">
    <div className="grid gap-4 lg:grid-cols-3">
      {[
        { number: '01', title: 'Import', detail: 'Upload historical CSV data' },
        { number: '02', title: 'Map & review', detail: 'Confirm the destination for every account' },
        { number: '03', title: 'Validate & save', detail: 'Review issues before accepting the dataset' },
      ].map(item => <div key={item.number} className="rounded-2xl border border-border bg-card p-5"><span className="text-xs font-bold text-primary">{item.number}</span><h3 className="mt-2 text-base font-semibold">{item.title}</h3><p className="mt-1 text-xs text-muted-foreground">{item.detail}</p></div>)}
    </div>
    <section className="rounded-2xl border border-border bg-card p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Historical financial data</h2><p className="text-xs text-muted-foreground">Excel columns: account, year, amount, optional canonical. One account per year per row; amounts in your selected units.</p></div><button onClick={downloadTemplate} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-semibold hover:bg-muted"><Download size={15}/> Download template</button></div>
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6">
        <UploadCloud className="h-9 w-9 text-primary"/>
        <div className="flex-1"><p className="text-sm font-semibold">Select a financial statement Excel workbook</p><p className="mt-1 text-xs text-muted-foreground">Excel .xlsx/.xls preferred · CSV optional · 5 MB maximum · processed locally</p></div>
        <label className="cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground">Choose Excel<input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={event => { void handleFile(event.target.files?.[0]); event.target.value = ''; }}/></label>
        <label className="text-xs text-muted-foreground">Units <select value={units} onChange={event => setUnits(event.target.value)} className="ml-2 rounded-lg border border-border bg-card px-2 py-2 text-foreground"><option>Units</option><option>Thousands</option><option>Millions</option></select></label>
      </div>
      {activeHistoricalDataset && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">Active historical dataset: version {activeHistoricalDataset.version} · {activeHistoricalDataset.fileName} · activated {new Date(activeHistoricalDataset.activatedAt).toLocaleString()}. Forecast and valuation now use this historical base.</div>}
      {isBanking && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><strong>Banking import is saved, not activated.</strong> Your SCB accounts can be reviewed and saved, but the current activation engine requires industrial accounts such as inventory, COGS and CAPEX. These are not appropriate requirements for a bank. We have disabled activation for banks until the banking-specific historical statement builder and residual-income / P-B valuation integration are implemented. No forecast or valuation should be described as using your SCB figures yet.</div>}
      {saved && <div role="status" className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900"><FileSpreadsheet className="mr-2 inline-block" size={15}/>Saved locally: <strong>{saved.fileName}</strong> · {saved.rows.length} rows · {new Date(saved.importedAt).toLocaleString()} · {saved.units}. Activate a complete, reconciled dataset to feed the forecasting engine.</div>}
      {draft.length > 0 && <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs"><strong>Activation readiness:</strong> {activationErrors.length === 0 ? 'Ready for activation' : `${activationErrors.length} blocking issue(s)`}. {activationErrors.slice(0, 5).map((issue, index) => <p key={index} className="mt-1 text-rose-700">{issue.message}</p>)}<p className="mt-2 text-muted-foreground">Suggested historical drivers: {Object.entries(calibrated).map(([key, value]) => `${key}: ${value?.toFixed(1)}`).join(' · ') || 'Insufficient data'}</p></div>}
      {draft.length > 0 && <div className="flex flex-wrap gap-3 text-xs"><span className="rounded-full bg-muted px-3 py-1.5">{draft.length} parsed rows</span><span className="rounded-full bg-muted px-3 py-1.5">{periods.length} periods</span><span className="rounded-full bg-rose-50 px-3 py-1.5 text-rose-700">{errors.length} errors</span><span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-800">{warnings.length} warnings</span></div>}
      {issues.length > 0 && <button onClick={exportErrors} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">Export issues to Excel</button>}{issues.length > 0 && <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border p-3" role="status">{issues.map((issue, index) => <div key={index} className={`flex items-start gap-2 text-xs ${issue.severity === 'error' ? 'text-rose-700' : 'text-amber-800'}`}><CircleAlert size={14} className="shrink-0"/>{issue.line ? `Line ${issue.line}: ` : ''}{issue.message}</div>)}</div>}
      {draft.length > 0 && <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-xs"><thead className="bg-muted text-left text-muted-foreground"><tr><th className="px-4 py-3">Source account</th><th className="px-4 py-3">Year</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Canonical mapping</th></tr></thead><tbody className="divide-y divide-border">{draft.map(row => <tr key={row.id}><td className="px-4 py-2.5 font-medium">{row.sourceAccount}</td><td className="px-4 py-2.5">{row.period}</td><td className="px-4 py-2.5 text-right font-mono">{row.amount.toLocaleString()}</td><td className="px-4 py-2.5"><select aria-label={`Map ${row.sourceAccount}`} value={row.canonical} onChange={event => updateMapping(row.id, event.target.value as CanonicalAccount | '')} className={`w-full min-w-48 rounded-lg border px-2 py-2 ${row.canonical ? 'border-border bg-card' : 'border-rose-300 bg-rose-50'}`}><option value="">Select account...</option>{CANONICAL_ACCOUNTS.map(account => <option key={account.id} value={account.id}>{account.label} · {account.statement}</option>)}</select></td></tr>)}</tbody></table></div>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5"><p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldAlert size={15}/> A balanced trial balance does not establish an external audit opinion.</p><div className="flex gap-2"><button disabled={!draft.length} onClick={exportReviewed} className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold disabled:opacity-40">Export review</button><button disabled={!draft.length || errors.length > 0} onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"><CheckCircle2 size={15}/> {isBanking ? 'Save SCB historical data' : 'Save & recalculate'} <ArrowRight size={14}/></button><button disabled={!saved || !draft.length || errors.length > 0 || !canActivate} onClick={activate} className="rounded-xl bg-emerald-700 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{isBanking ? 'Bank activation pending' : 'Activate & recalculate'}</button></div></div>
    </section>
    <p className="text-xs text-muted-foreground">Current scope: Excel/CSV import, review, versioned browser-local activation, forecast recalculation and indicative driver calibration. Server persistence, approvals, independent audits and detailed cash-flow line-item imports remain future work.</p>
  </PageShell>;
}
