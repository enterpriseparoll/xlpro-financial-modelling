import { useMemo, useState } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { useModelContext } from '@/contexts/ModelContext';
import { readBankWorkbook } from '@/engine/bankWorkbook';
import { summarizeBankIncome } from '@/engine/bankingModel';
import { bankValuation, type BankValuationInputs } from '@/engine/bankValuation';
import { downloadBrandedWorkbook } from '@/lib/excelWorkbook';
import type { ImportedRow, ImportIssue } from '@/engine/historicalImport';

const DEFAULTS: BankValuationInputs = { bookValuePerShare: 0, costOfEquityPct: 0, perpetualGrowthPct: 0, sustainableRoePct: 0, nextDividendPerShare: 0 };
export function BankValuationPage() {
  const { activeCompany } = useModelContext();
  const [rows, setRows] = useState<ImportedRow[]>([]);
  const [issues, setIssues] = useState<ImportIssue[]>([]);
  const [inputs, setInputs] = useState(DEFAULTS);
  const [fileName, setFileName] = useState('');
  const [ticker, setTicker] = useState(activeCompany.ticker?.toUpperCase() ?? '');
  const [units, setUnits] = useState<'Units' | 'Thousands' | 'Millions'>('Units');
  const summary = useMemo(() => summarizeBankIncome(rows.filter(r => r.ticker?.toUpperCase() === ticker)), [rows, ticker]);
  const result = useMemo(() => {
    try { return { data: bankValuation(inputs), error: '' }; }
    catch (error) { return { data: null, error: error instanceof Error ? error.message : 'Invalid assumptions' }; }
  }, [inputs]);
  const load = async (file?: File) => {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name) || file.size > 5_000_000) { setIssues([{ severity: 'error', message: 'Upload an .xlsx workbook up to 5 MB.' }]); return; }
    try {
      const parsed = readBankWorkbook(await file.arrayBuffer());
      if (!parsed) { setIssues([{ severity: 'error', message: 'No worksheet contains TICKER, ACCOUNT TYPE, PARTICULAR, AMOUNT, ACCOUNT DATE.' }]); return; }
      setRows(parsed.rows); setIssues(parsed.issues); setFileName(file.name);
      const tickers = [...new Set(parsed.rows.map(row => row.ticker ?? ''))];
      if (tickers.length === 1) setTicker(tickers[0]);
    } catch (error) { setIssues([{ severity: 'error', message: error instanceof Error ? error.message : 'Cannot read workbook' }]); }
  };
  const exportExcel = () => {
    if (!result.data) return;
    const values = result.data;
    downloadBrandedWorkbook('xlpro-bank-valuation', 'Bank Equity Valuation — Illustrative', ['Metric', 'Value', 'Unit'], [
      ['Ticker', ticker, ''], ['Source workbook', fileName, ''], ['Book value per share', inputs.bookValuePerShare, activeCompany.currency],
      ['Cost of equity', inputs.costOfEquityPct, '%'], ['Sustainable ROE', inputs.sustainableRoePct, '%'],
      ['Perpetual growth', inputs.perpetualGrowthPct, '%'], ['Next dividend per share', inputs.nextDividendPerShare, activeCompany.currency],
      ['DDM value per share', values.ddmPerShare, activeCompany.currency],
      ['Residual income value per share', values.residualIncomePerShare, activeCompany.currency],
      ['P/B value per share', values.priceToBookPerShare ?? 'Not supplied', activeCompany.currency],
    ], { companyName: activeCompany.name, currency: activeCompany.currency });
  };
  const numberInput = (label: string, key: keyof BankValuationInputs) => <label key={key} className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">{label}<input type="number" step="any" value={inputs[key] ?? ''} onChange={e => setInputs(old => ({ ...old, [key]: e.target.value === '' ? undefined : Number(e.target.value) }))} className="rounded-xl border border-border bg-background p-3 text-sm text-foreground" /></label>;
  return <PageShell moduleName="VALUATION / BANKING" title={activeCompany.name} titleHighlight="Bank equity valuation" description="Dividend discount, residual income and price-to-book. Banking equity methods replace industrial FCFF/WACC.">
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <h2 className="font-semibold">1. Import bank financial statements</h2>
      <p className="text-xs text-muted-foreground">Upload the same five-column Excel format: TICKER, ACCOUNT TYPE, PARTICULAR, AMOUNT, ACCOUNT DATE. All figures remain browser-local.</p>
      <div className="flex flex-wrap items-center gap-3"><input type="file" accept=".xlsx" onChange={e => { void load(e.target.files?.[0]); }} className="text-xs"/><label className="text-xs">Ticker <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} className="ml-2 rounded-lg border border-border bg-background p-2" /></label><label className="text-xs">Reported amounts <select value={units} onChange={e => setUnits(e.target.value as typeof units)} className="ml-2 rounded-lg border border-border bg-background p-2"><option>Units</option><option>Thousands</option><option>Millions</option></select></label></div>
      <p className="text-xs text-muted-foreground">{rows.length} source rows · {summary.statements.length} income statement periods · {fileName || 'No workbook selected'}. Import does not independently verify the reported data.</p>
      {[...issues, ...summary.issues].map((issue, i) => <p key={i} className={`text-xs ${issue.severity === 'error' ? 'text-rose-700' : 'text-amber-700'}`}>{issue.line ? `Row ${issue.line}: ` : ''}{issue.message}</p>)}
      {summary.statements.length > 0 && <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr><th className="p-2 text-left">Year</th><th className="p-2 text-right">Net interest income</th><th className="p-2 text-right">Operating income</th><th className="p-2 text-right">Profit after tax</th></tr></thead><tbody>{summary.statements.map(s => <tr key={s.year} className="border-t border-border"><td className="p-2">{s.year}</td><td className="p-2 text-right">{s.netInterestIncome?.toLocaleString() ?? '—'}</td><td className="p-2 text-right">{s.operatingIncome?.toLocaleString() ?? '—'}</td><td className="p-2 text-right">{s.profitAfterTax?.toLocaleString() ?? '—'}</td></tr>)}</tbody></table></div>}
    </div>
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <h2 className="font-semibold">2. Enter equity valuation assumptions</h2>
      <p className="text-xs text-amber-700">These inputs must come from verified equity, dividends, capital and market sources. The income statement alone cannot supply them. All outputs are illustrative.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {numberInput('Book value per share', 'bookValuePerShare')}{numberInput('Cost of equity (%)', 'costOfEquityPct')}
        {numberInput('Perpetual growth (%)', 'perpetualGrowthPct')}{numberInput('Sustainable return on equity (%)', 'sustainableRoePct')}
        {numberInput('Next dividend per share', 'nextDividendPerShare')}{numberInput('Peer P/B multiple (optional)', 'peerPriceToBook')}
        {numberInput('Shares outstanding (optional, in millions)', 'sharesOutstanding')}
      </div>
      {result.error && <p className="text-xs text-amber-700">{result.error}</p>}
      {result.data && <div className="grid gap-3 sm:grid-cols-3">{[['Dividend discount', result.data.ddmPerShare], ['Residual income', result.data.residualIncomePerShare], ['Price to book', result.data.priceToBookPerShare]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{typeof value === 'number' ? `${activeCompany.currencySymbol}${value.toFixed(2)}` : '—'}</p><p className="text-xs text-muted-foreground">Value per share</p></div>)}</div>}
      <button disabled={!result.data} onClick={exportExcel} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">Export branded Excel valuation</button>
    </div>
    <p className="text-xs text-muted-foreground">Prototype limitation: banking forecasts, capital adequacy checks, peer sourcing and persistence are not yet implemented. No investment recommendation is implied.</p>
  </PageShell>;
}
