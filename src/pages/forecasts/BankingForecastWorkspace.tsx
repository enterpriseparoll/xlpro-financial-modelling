import { useMemo, useState } from 'react';
import { useModelContext } from '@/contexts/ModelContext';
import { readBankActivation } from '@/engine/bankHistoricalActivation';
import { ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { BankForecastAssumptions } from './BankForecastAssumptions';
import { calculateBankForecast, defaultSettings, normalizeSettings, type ForecastSettings } from '@/engine/bankForecast';

const format = (n: number | undefined) => n === undefined || !Number.isFinite(n) ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);
export function BankingForecastWorkspace({ onNavigateTab }: { onNavigateTab?: (tabId: string, subTabId?: string) => void }) {
  const { activeCompany } = useModelContext();
  const data = readBankActivation(activeCompany.id);
  const periods = useMemo(() => [...(data?.periods ?? [])].sort((a, b) => a.year - b.year), [data?.version, activeCompany.id]);
  const latest = periods.at(-1);
  const storageKey = 'xlpro:bank-forecast-inputs:v1:' + activeCompany.id;
  const settingsKey = 'xlpro:bank-forecast-settings:v2:' + activeCompany.id;
  const loadSettings = () => { try { return normalizeSettings(JSON.parse(localStorage.getItem(settingsKey) || 'null')); } catch { return defaultSettings(); } };
  const [settings, setSettings] = useState<ForecastSettings>(loadSettings);
  const [savedCompany, setSavedCompany] = useState(activeCompany.id);
  if (savedCompany !== activeCompany.id) { setSavedCompany(activeCompany.id); setSettings(loadSettings()); }
  const updateSettings = (next: ForecastSettings) => { setSettings(next); localStorage.setItem(settingsKey, JSON.stringify(next)); };
  const unitFactor = 1 / 1_000_000; // Imported SCB source rows are unscaled GHS amounts, despite the display-unit selector.
  const source = (key: keyof NonNullable<typeof latest>['accounts']) => latest?.accounts[key] === undefined ? undefined : latest.accounts[key]! * unitFactor;
  const netInterest = source('net_interest_income');
  const netFees = source('net_fee_income');
  const operatingIncome = source('operating_income');
  const expenses = source('total_operating_expenses');
  const impairment = source('total_impairment');
  const profit = source('net_profit');
  const pbt = source('profit_before_tax');
  const tax = source('income_tax');
  const otherIncome = operatingIncome !== undefined && netInterest !== undefined && netFees !== undefined ? operatingIncome - netInterest - netFees : undefined;
  const taxDerived = pbt !== undefined && pbt > 0 && tax !== undefined ? Math.max(0, Math.min(100, -tax / pbt * 100)) : undefined;
  const missing = [
    netInterest === undefined && 'net interest income',
    netFees === undefined && 'net fee income',
    otherIncome === undefined && 'operating income',
    expenses === undefined && 'operating expenses',
    impairment === undefined && 'impairment charges',
  ].filter(Boolean);
  const canProject = !!latest && missing.length === 0;
  const loans = source('loans_and_advances');
  const deposits = source('customer_deposits');
  const driverMissing = loans === undefined || deposits === undefined;
  const forecast = useMemo(() => {
    if (!canProject || !latest) return { rows: [], error: '' };
    try { return { rows: calculateBankForecast({ year: latest.year, interest: netInterest!, fees: netFees!, other: otherIncome!, costs: expenses!, provisions: impairment!, loans, deposits }, settings), error: '' }; }
    catch (error) { return { rows: [], error: error instanceof Error ? error.message : 'Forecast unavailable' }; }
  }, [canProject, latest?.year, netInterest, netFees, otherIncome, expenses, impairment, loans, deposits, settings]);
  const projection = forecast.rows;
  const row = (label: string, actual: number | undefined, projected: (p: typeof projection[number]) => number) => (
    <tr key={label} className="border-t border-border"><th className="px-4 py-3 text-left font-medium">{label}</th><td className="px-4 py-3 text-right tabular-nums">{format(actual)}</td>{projection.map(p => <td key={p.year} className="px-4 py-3 text-right tabular-nums">{format(projected(p))}</td>)}</tr>
  );
  return <div className="mx-auto max-w-7xl space-y-6 px-5 py-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Bank forecast</h1><p className="mt-1 text-sm text-muted-foreground">{activeCompany.name} · GHS millions · {latest ? 'Based on FY' + latest.year + ' actuals' : 'No activated historical data'}</p></div><button type="button" onClick={() => onNavigateTab?.('data', 'historical')} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium">Review Excel data</button></div>
    {!latest ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm">No activated banking data. Complete Step 2 before forecasting.</div> : <>
      <section className="rounded-xl border border-border bg-card p-5"><div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-600"/><h2 className="font-semibold">1. Historical baseline</h2></div><p className="mt-2 text-sm text-muted-foreground">Imported actuals · FY{latest.year} · {data?.fileName}</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{[['Net interest income',netInterest],['Operating income',operatingIncome],['Net profit',profit]].map(([label,value]) => <div key={String(label)} className="rounded-lg bg-muted/40 p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-2 text-xl font-semibold tabular-nums">{format(value as number | undefined)}</div></div>)}</div></section>
      <BankForecastAssumptions settings={settings} years={Array.from({length:5},(_,i)=>latest.year+i+1)} onChange={updateSettings} onReset={()=>updateSettings(defaultSettings())} disabledDrivers={driverMissing} />
      <section className="rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">3. Projected income statement</h2><p className="mt-1 text-sm text-muted-foreground">GHS millions · illustrative assumption-driven forecast; not yet a fully integrated bank balance-sheet model.</p>{(!canProject || !!forecast.error) ? <div className="mt-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertCircle className="shrink-0" size={18}/><div>Cannot calculate a defensible forecast. {forecast.error || ('Missing: ' + missing.join(', ') + '. Upload the missing statement lines in Step 2.')}</div></div> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3 text-left">Metric</th><th className="px-4 py-3 text-right">FY{latest.year}A</th>{projection.map(p => <th key={p.year} className="px-4 py-3 text-right">FY{p.year}E</th>)}</tr></thead><tbody>{row('Net interest income',netInterest,p=>p.interest)}{row('Net fee income',netFees,p=>p.fees)}{row('Operating income',operatingIncome,p=>p.revenue)}{row('Operating expenses',expenses,p=>p.costs)}{row('Impairment',impairment,p=>p.provisions)}{row('Profit before tax',pbt,p=>p.beforeTax)}{row('Net profit',profit,p=>p.afterTax)}</tbody></table></div>}</section>
    </>}
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5"><div><h2 className="font-semibold">Next: Compare scenarios</h2><p className="mt-1 text-sm text-muted-foreground">Explore how alternative assumptions affect the forecast.</p></div><button type="button" disabled={!canProject || !!forecast.error} onClick={() => onNavigateTab?.('scenarios')} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">Continue to Scenarios <ArrowRight size={16}/></button></div>
  </div>;
}
