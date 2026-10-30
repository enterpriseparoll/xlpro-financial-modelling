import { useMemo, useState } from 'react';
import { useModelContext } from '@/contexts/ModelContext';
import { readBankActivation } from '@/engine/bankHistoricalActivation';
import { ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

type Inputs = { interestGrowth: number; feeGrowth: number; otherGrowth: number; expenseGrowth: number; impairmentGrowth: number; taxRate: number };
const defaults: Inputs = { interestGrowth: 5, feeGrowth: 5, otherGrowth: 3, expenseGrowth: 5, impairmentGrowth: 0, taxRate: 30 };
const keys: { key: keyof Inputs; label: string; help: string }[] = [
  { key: 'interestGrowth', label: 'Net interest income growth', help: 'Annual growth in interest income after funding costs' },
  { key: 'feeGrowth', label: 'Net fee income growth', help: 'Annual growth in net fees and commissions' },
  { key: 'otherGrowth', label: 'Other operating income growth', help: 'Annual growth in other operating income' },
  { key: 'expenseGrowth', label: 'Operating expense growth', help: 'Annual change in personnel and other operating expenses' },
  { key: 'impairmentGrowth', label: 'Impairment charge growth', help: 'Annual change in net impairment charges / reversals' },
  { key: 'taxRate', label: 'Effective tax rate', help: 'Tax as a percentage of positive profit before tax' },
];
const format = (n: number | undefined) => n === undefined || !Number.isFinite(n) ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);
export function BankingForecastWorkspace({ onNavigateTab }: { onNavigateTab?: (tabId: string, subTabId?: string) => void }) {
  const { activeCompany } = useModelContext();
  const data = readBankActivation(activeCompany.id);
  const periods = useMemo(() => [...(data?.periods ?? [])].sort((a, b) => a.year - b.year), [data?.version, activeCompany.id]);
  const latest = periods.at(-1);
  const storageKey = 'xlpro:bank-forecast-inputs:v1:' + activeCompany.id;
  const [inputs, setInputs] = useState<Inputs>(() => { try { return { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) || '{}') }; } catch { return defaults; } });
  const [savedCompany, setSavedCompany] = useState(activeCompany.id);
  if (savedCompany !== activeCompany.id) {
    setSavedCompany(activeCompany.id);
    try { setInputs({ ...defaults, ...JSON.parse(localStorage.getItem(storageKey) || '{}') }); } catch { setInputs(defaults); }
  }
  const unitFactor = data?.units === 'Millions' ? 1 : data?.units === 'Thousands' ? 1 / 1000 : 1 / 1_000_000;
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
  const projection = useMemo(() => {
    if (!canProject || !latest) return [];
    let interest = netInterest!, fees = netFees!, other = otherIncome!, costs = expenses!, provisions = impairment!;
    const rows = [];
    for (let year = latest.year + 1; year <= latest.year + 5; year++) {
      interest *= 1 + inputs.interestGrowth / 100;
      fees *= 1 + inputs.feeGrowth / 100;
      other *= 1 + inputs.otherGrowth / 100;
      costs *= 1 + inputs.expenseGrowth / 100;
      provisions *= 1 + inputs.impairmentGrowth / 100;
      const revenue = interest + fees + other;
      const beforeTax = revenue + costs + provisions;
      const afterTax = beforeTax - Math.max(0, beforeTax) * inputs.taxRate / 100;
      rows.push({ year, interest, fees, revenue, costs, provisions, beforeTax, afterTax });
    }
    return rows;
  }, [canProject, latest?.year, netInterest, netFees, otherIncome, expenses, impairment, inputs]);
  const change = (key: keyof Inputs, value: number) => {
    if (!Number.isFinite(value)) return;
    const next = { ...inputs, [key]: Math.max(-100, Math.min(100, value)) };
    setInputs(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };
  const row = (label: string, actual: number | undefined, projected: (p: typeof projection[number]) => number) => (
    <tr key={label} className="border-t border-border"><th className="px-4 py-3 text-left font-medium">{label}</th><td className="px-4 py-3 text-right tabular-nums">{format(actual)}</td>{projection.map(p => <td key={p.year} className="px-4 py-3 text-right tabular-nums">{format(projected(p))}</td>)}</tr>
  );
  return <div className="mx-auto max-w-7xl space-y-6 px-5 py-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Bank forecast</h1><p className="mt-1 text-sm text-muted-foreground">{activeCompany.name} · GHS millions · {latest ? 'Based on FY' + latest.year + ' actuals' : 'No activated historical data'}</p></div><button type="button" onClick={() => onNavigateTab?.('data', 'historical')} className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium">Review Excel data</button></div>
    {!latest ? <div className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm">No activated banking data. Complete Step 2 before forecasting.</div> : <>
      <section className="rounded-xl border border-border bg-card p-5"><div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-600"/><h2 className="font-semibold">1. Historical baseline</h2></div><p className="mt-2 text-sm text-muted-foreground">Imported actuals · FY{latest.year} · {data?.fileName}</p><div className="mt-4 grid gap-3 sm:grid-cols-3">{[['Net interest income',netInterest],['Operating income',operatingIncome],['Net profit',profit]].map(([label,value]) => <div key={String(label)} className="rounded-lg bg-muted/40 p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-2 text-xl font-semibold tabular-nums">{format(value as number | undefined)}</div></div>)}</div></section>
      <section className="rounded-xl border border-border bg-card p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">2. Forecast assumptions</h2><button type="button" className="text-sm text-primary hover:underline" onClick={() => {setInputs(defaults);localStorage.setItem(storageKey,JSON.stringify(defaults));}}>Reset assumptions</button></div><p className="mt-1 text-sm text-muted-foreground">Edit the percentages below. Projections recalculate immediately and are saved in this browser.</p><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{keys.map(k => <label key={k.key} className="block rounded-lg border border-border p-4"><span className="block text-sm font-medium">{k.label}</span><span className="mt-1 block min-h-8 text-xs text-muted-foreground">{k.help}</span><div className="mt-3 flex items-center gap-2"><input aria-label={k.label} type="number" step="0.1" min="-100" max="100" value={inputs[k.key]} onChange={e => change(k.key,Number(e.target.value))} className="w-full rounded-md border border-border bg-background px-3 py-2 text-right text-sm"/><span className="text-sm text-muted-foreground">%</span></div></label>)}</div>{taxDerived !== undefined && <p className="mt-3 text-xs text-muted-foreground">Historical effective tax rate: {format(taxDerived)}% (reference only).</p>}</section>
      <section className="rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">3. Projected income statement</h2><p className="mt-1 text-sm text-muted-foreground">GHS millions · illustrative assumption-driven forecast; not yet a fully integrated bank balance-sheet model.</p>{!canProject ? <div className="mt-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertCircle className="shrink-0" size={18}/><div>Cannot calculate a defensible forecast. Missing: {missing.join(', ')}. Upload the missing statement lines in Step 2.</div></div> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr><th className="px-4 py-3 text-left">Metric</th><th className="px-4 py-3 text-right">FY{latest.year}A</th>{projection.map(p => <th key={p.year} className="px-4 py-3 text-right">FY{p.year}E</th>)}</tr></thead><tbody>{row('Net interest income',netInterest,p=>p.interest)}{row('Net fee income',netFees,p=>p.fees)}{row('Operating income',operatingIncome,p=>p.revenue)}{row('Operating expenses',expenses,p=>p.costs)}{row('Impairment',impairment,p=>p.provisions)}{row('Profit before tax',pbt,p=>p.beforeTax)}{row('Net profit',profit,p=>p.afterTax)}</tbody></table></div>}</section>
    </>}
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5"><div><h2 className="font-semibold">Next: Compare scenarios</h2><p className="mt-1 text-sm text-muted-foreground">Explore how alternative assumptions affect the forecast.</p></div><button type="button" disabled={!canProject} onClick={() => onNavigateTab?.('scenarios')} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">Continue to Scenarios <ArrowRight size={16}/></button></div>
  </div>;
}
