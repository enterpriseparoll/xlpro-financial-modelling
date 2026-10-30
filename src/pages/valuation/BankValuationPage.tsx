import { useMemo, useState } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { useModelContext } from '@/contexts/ModelContext';
import { readBankWorkbook } from '@/engine/bankWorkbook';
import { summarizeBankIncome } from '@/engine/bankingModel';
import { bankValuation, type BankValuationInputs } from '@/engine/bankValuation';
import { readBankActivation } from '@/engine/bankHistoricalActivation';
import { downloadBrandedWorkbook } from '@/lib/excelWorkbook';
import type { ImportedRow, ImportIssue } from '@/engine/historicalImport';

const DEFAULTS: BankValuationInputs = { bookValuePerShare: 0, costOfEquityPct: 0, perpetualGrowthPct: 0, sustainableRoePct: 0, nextDividendPerShare: 0 };
export function BankValuationPage() {
  const { activeCompany } = useModelContext();
  const [rows, setRows] = useState<ImportedRow[]>(() => readBankActivation(activeCompany.id)?.rows ?? []);
  const [issues, setIssues] = useState<ImportIssue[]>([]);
  const [inputs, setInputs] = useState<BankValuationInputs>(() => {
    try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem('xlpro:bank-valuation-inputs:' + activeCompany.id) || '{}') }; }
    catch { return DEFAULTS; }
  });
  const [equityOverride, setEquityOverride] = useState<number | undefined>(() => {
    const value = localStorage.getItem('xlpro:bank-equity:' + activeCompany.id);
    return value === null ? undefined : Number(value);
  });
  const [assumptionStatus, setAssumptionStatus] = useState('');
  const activated = readBankActivation(activeCompany.id);
  const latestPeriod = activated?.periods?.slice().sort((a, b) => b.year - a.year)[0];
  const factor = activated?.units === 'Millions' ? 1_000_000 : activated?.units === 'Thousands' ? 1_000 : 1;
  const reportedEquity = latestPeriod?.accounts?.total_equity;
  const equityActual = equityOverride ?? (reportedEquity === undefined ? undefined : reportedEquity * factor);
  const profitActual = latestPeriod?.accounts?.net_profit === undefined ? undefined : latestPeriod.accounts.net_profit * factor;
  const derivedBVPS = equityActual !== undefined && inputs.sharesOutstanding && inputs.sharesOutstanding > 0 ? equityActual / (inputs.sharesOutstanding * 1_000_000) : undefined;
  const historicalROE = equityActual && equityActual > 0 && profitActual !== undefined ? profitActual / equityActual * 100 : undefined;
  const effectiveROE = inputs.sustainableRoePct > 0 ? inputs.sustainableRoePct : (historicalROE ?? 0);
  const [fileName, setFileName] = useState(() => readBankActivation(activeCompany.id)?.fileName ?? '');
  const [ticker, setTicker] = useState(() => activeCompany.ticker?.toUpperCase() || readBankActivation(activeCompany.id)?.ticker || '');
  const [units, setUnits] = useState<'Units' | 'Thousands' | 'Millions'>(() => readBankActivation(activeCompany.id)?.units ?? 'Units');
  const [fromActivation, setFromActivation] = useState(() => !!readBankActivation(activeCompany.id));
  const [loadedCompanyId, setLoadedCompanyId] = useState(activeCompany.id);
  if (loadedCompanyId !== activeCompany.id) {
    setLoadedCompanyId(activeCompany.id);
    const activated = readBankActivation(activeCompany.id);
    setRows(activated?.rows ?? []); setIssues([]); setFileName(activated?.fileName ?? '');
    setTicker(activeCompany.ticker?.toUpperCase() || activated?.ticker || '');
    setUnits(activated?.units ?? 'Units'); setFromActivation(!!activated);
    try { setInputs({ ...DEFAULTS, ...JSON.parse(localStorage.getItem('xlpro:bank-valuation-inputs:' + activeCompany.id) || '{}') }); } catch { setInputs(DEFAULTS); }
    const savedEquity = localStorage.getItem('xlpro:bank-equity:' + activeCompany.id);
    setEquityOverride(savedEquity === null ? undefined : Number(savedEquity));
  }
  const summary = useMemo(() => summarizeBankIncome(rows.filter(r => r.ticker?.toUpperCase() === ticker)), [rows, ticker]);
  const result = useMemo(() => {
    try { return { data: bankValuation({ ...inputs, bookValuePerShare: derivedBVPS ?? inputs.bookValuePerShare, sustainableRoePct: effectiveROE }), error: '' }; }
    catch (error) { return { data: null, error: error instanceof Error ? error.message : 'Invalid assumptions' }; }
  }, [inputs, derivedBVPS, effectiveROE]);
  const load = async (file?: File) => {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name) || file.size > 5_000_000) { setIssues([{ severity: 'error', message: 'Upload an .xlsx workbook up to 5 MB.' }]); return; }
    try {
      const parsed = readBankWorkbook(await file.arrayBuffer());
      if (!parsed) { setIssues([{ severity: 'error', message: 'No worksheet contains TICKER, ACCOUNT TYPE, PARTICULAR, AMOUNT, ACCOUNT DATE.' }]); return; }
      setRows(parsed.rows); setIssues(parsed.issues); setFileName(file.name); setFromActivation(false);
      const tickers = [...new Set(parsed.rows.map(row => row.ticker ?? ''))];
      if (tickers.length === 1) setTicker(tickers[0]);
    } catch (error) { setIssues([{ severity: 'error', message: error instanceof Error ? error.message : 'Cannot read workbook' }]); }
  };
  const exportExcel = () => {
    if (!result.data) return;
    const values = result.data;
    downloadBrandedWorkbook('xlpro-bank-valuation', 'Bank Equity Valuation — Illustrative', ['Metric', 'Value', 'Unit'], [
      ['Ticker', ticker, ''], ['Source workbook', fileName, ''], ['Book value per share', derivedBVPS ?? inputs.bookValuePerShare, activeCompany.currency],
      ['Cost of equity', inputs.costOfEquityPct, '%'], ['Sustainable ROE', effectiveROE, '%'],
      ['Perpetual growth', inputs.perpetualGrowthPct, '%'], ['Next dividend per share', inputs.nextDividendPerShare, activeCompany.currency], ['Verified equity', equityActual ?? 'Missing', activeCompany.currency], ['Historical profit', profitActual ?? 'Missing', activeCompany.currency],
      ['DDM value per share', values.ddmPerShare, activeCompany.currency],
      ['Residual income value per share', values.residualIncomePerShare, activeCompany.currency],
      ['P/B value per share', values.priceToBookPerShare ?? 'Not supplied', activeCompany.currency],
    ], { companyName: activeCompany.name, currency: activeCompany.currency });
  };
  const saveAssumptions = () => {
    localStorage.setItem('xlpro:bank-valuation-inputs:' + activeCompany.id, JSON.stringify(inputs));
    if (equityOverride === undefined) localStorage.removeItem('xlpro:bank-equity:' + activeCompany.id);
    else localStorage.setItem('xlpro:bank-equity:' + activeCompany.id, String(equityOverride));
    setAssumptionStatus('Saved locally for ' + activeCompany.name);
  };
  const numberInput = (label: string, key: keyof BankValuationInputs) => <label key={key} className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">{label}<input type="number" step="any" value={inputs[key] ?? ''} onChange={e => setInputs(old => ({ ...old, [key]: e.target.value === '' ? undefined : Number(e.target.value) }))} className="rounded-xl border border-border bg-background p-3 text-sm text-foreground" /></label>;
  return <PageShell moduleName="VALUATION / BANKING" title={activeCompany.name} titleHighlight="Bank equity valuation" description="Dividend discount, residual income and price-to-book. Banking equity methods replace industrial FCFF/WACC.">
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <h2 className="font-semibold">1. Import bank financial statements</h2>
      <p className="text-xs text-muted-foreground">Upload the same five-column Excel format: TICKER, ACCOUNT TYPE, PARTICULAR, AMOUNT, ACCOUNT DATE. All figures remain browser-local.</p>
      <div className="flex flex-wrap items-center gap-3"><input type="file" accept=".xlsx" onChange={e => { void load(e.target.files?.[0]); }} className="text-xs"/><label className="text-xs">Ticker <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} className="ml-2 rounded-lg border border-border bg-background p-2" /></label><label className="text-xs">Reported amounts <select value={units} onChange={e => setUnits(e.target.value as typeof units)} className="ml-2 rounded-lg border border-border bg-background p-2"><option>Units</option><option>Thousands</option><option>Millions</option></select></label></div>
      <p className="text-xs text-muted-foreground">{rows.length} source rows · {summary.statements.length} income statement periods · {fileName || 'No workbook selected'}. Import does not independently verify the reported data.</p>
      {fromActivation && rows.length > 0 && <p className="text-xs text-emerald-800">Loaded the activated banking dataset for {activeCompany.name}. Re-upload a workbook to replace it.</p>}
      {[...issues, ...summary.issues].map((issue, i) => <p key={i} className={`text-xs ${issue.severity === 'error' ? 'text-rose-700' : 'text-amber-700'}`}>{issue.line ? `Row ${issue.line}: ` : ''}{issue.message}</p>)}
      {summary.statements.length > 0 && <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr><th className="p-2 text-left">Year</th><th className="p-2 text-right">Net interest income</th><th className="p-2 text-right">Operating income</th><th className="p-2 text-right">Profit after tax</th></tr></thead><tbody>{summary.statements.map(s => <tr key={s.year} className="border-t border-border"><td className="p-2">{s.year}</td><td className="p-2 text-right">{s.netInterestIncome?.toLocaleString() ?? '—'}</td><td className="p-2 text-right">{s.operatingIncome?.toLocaleString() ?? '—'}</td><td className="p-2 text-right">{s.profitAfterTax?.toLocaleString() ?? '—'}</td></tr>)}</tbody></table></div>}
    </div>
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <h2 className="font-semibold">2. Complete banking valuation inputs</h2>
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
        <p className="text-xs font-semibold">Activated bank history · FY{latestPeriod?.year ?? '—'}</p>
        <div className="grid gap-3 sm:grid-cols-3 text-xs">
          <div>Net profit: <strong>{profitActual?.toLocaleString() ?? 'Missing'}</strong></div>
          <div>Total equity: <strong>{equityActual?.toLocaleString() ?? 'Required'}</strong></div>
          <div>Historical ROE: <strong>{historicalROE === undefined ? 'Requires equity' : historicalROE.toFixed(2) + '%'}</strong></div>
        </div>
        <label className="flex flex-col gap-1 text-xs">Verified total equity (full currency units; optional override if already imported)
          <input type="number" step="any" placeholder={reportedEquity === undefined ? 'Required: enter reported total equity' : 'Using imported total equity'} value={equityOverride ?? ''} onChange={e => setEquityOverride(e.target.value === '' ? undefined : Number(e.target.value))} className="rounded-xl border border-border bg-background p-3 text-sm" />
        </label>
        <p className="text-xs text-muted-foreground">Book value per share: {derivedBVPS === undefined ? 'Enter verified equity and shares outstanding to calculate' : derivedBVPS.toFixed(4) + ' ' + activeCompany.currency + ' (derived from equity / shares)'}. Historical ROE is only a fallback assumption; review its sustainability.</p>
      </div>
      <p className="text-xs text-amber-700">These inputs must come from verified equity, dividends, capital and market sources. The income statement alone cannot supply them. All outputs are illustrative.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {derivedBVPS === undefined && numberInput('Book value per share (verified)', 'bookValuePerShare')}{numberInput('Cost of equity (%)', 'costOfEquityPct')}
        {numberInput('Perpetual growth (%)', 'perpetualGrowthPct')}{numberInput('Sustainable forward ROE (%) — historical fallback', 'sustainableRoePct')}
        {numberInput('Next dividend per share', 'nextDividendPerShare')}{numberInput('Peer P/B multiple (optional)', 'peerPriceToBook')}
        {numberInput('Shares outstanding (optional, in millions)', 'sharesOutstanding')}
      </div>
      {result.error && <p className="text-xs text-amber-700">{result.error}</p>}
      {result.data && <div className="grid gap-3 sm:grid-cols-3">{[['Dividend discount', result.data.ddmPerShare], ['Residual income', result.data.residualIncomePerShare], ['Price to book', result.data.priceToBookPerShare]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-border bg-muted/30 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold">{typeof value === 'number' ? `${activeCompany.currencySymbol}${value.toFixed(2)}` : '—'}</p><p className="text-xs text-muted-foreground">Value per share</p></div>)}</div>}
      <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={saveAssumptions} className="rounded-xl border border-border px-4 py-2.5 text-xs font-semibold">Save valuation inputs</button>{assumptionStatus && <span className="text-xs text-emerald-700">{assumptionStatus}</span>}</div>
      <button disabled={!result.data} onClick={exportExcel} className="rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40">Export branded Excel valuation</button>
    </div>
    <p className="text-xs text-muted-foreground">Prototype limitation: banking forecasts, capital adequacy checks, peer sourcing and persistence are not yet implemented. No investment recommendation is implied.</p>
  </PageShell>;
}
