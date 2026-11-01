import { useModelContext } from '@/contexts/ModelContext';
import { calculateBankForecast, type ForecastRow } from '@/engine/bankForecast';
import { getBankForecastSource } from '../services/forecastSource';
import { useBankScenarioLibrary } from '../hooks/useBankScenarioLibrary';
import { ArrowRight } from 'lucide-react';
const money = (n: number) => new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
export function BankScenariosWorkspace({onNavigateTab}:{onNavigateTab?:(tabId:string,subTabId?:string)=>void}) {
  const {activeCompany}=useModelContext();
  const {store,selected,select}=useBankScenarioLibrary(activeCompany.id);
  const source=getBankForecastSource(activeCompany.id);
  const results=source.data?store.scenarios.map(s=>{
    try {return {id:s.id,name:s.name,rows:calculateBankForecast(source.data!.baseline,s.settings),error:''};}
    catch(e){return {id:s.id,name:s.name,rows:[] as ForecastRow[],error:e instanceof Error?e.message:'Forecast unavailable'};}
  }):[];
  const selectedResult=results.find(r=>r.id===selected.id);
  const reference=results.find(r=>r.name.toLowerCase()==='base case')||results[0];
  const total=(rows:ForecastRow[])=>rows.reduce((sum,r)=>sum+r.afterTax,0);
  return <div className="mx-auto max-w-7xl space-y-6 px-5 py-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Compare banking scenarios</h1><p className="mt-1 text-sm text-muted-foreground">{activeCompany.name} · Independent saved forecasts · GHS millions</p></div><button type="button" className="rounded-lg border border-border px-4 py-2 text-sm" onClick={()=>onNavigateTab?.('forecasts')}>Edit forecast assumptions</button></div>
    {!source.data?<div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm">{source.error}</div>:<>
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Source: {source.data.sourceFile} · Activated version {source.data.sourceVersion}. Each scenario uses its own saved Step 4 assumptions; no additional percentage-point adjustments.</div>
      <section className="rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Scenario comparison</h2><p className="mt-1 text-sm text-muted-foreground">Select a scenario to carry forward to valuation.</p></div><label className="flex items-center gap-2 text-sm">Selected scenario<select aria-label="Selected valuation scenario" className="rounded-lg border border-border bg-background px-3 py-2" value={selected.id} onChange={e=>select(e.target.value)}>{store.scenarios.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead className="bg-muted/50"><tr><th className="px-4 py-3 text-left">Scenario</th>{Array.from({length:5},(_,i)=><th key={i} className="px-4 py-3 text-right">FY{source.data!.baseline.year+i+1}E</th>)}<th className="px-4 py-3 text-right">5Y cumulative</th><th className="px-4 py-3 text-right">vs Base</th></tr></thead><tbody>{results.map(result=><tr key={result.id} className={`border-t border-border ${result.id===selected.id?'bg-primary/5':''}`}><th className="px-4 py-3 text-left font-medium">{result.name}{result.id===selected.id?' · Selected':''}</th>{result.error?<td colSpan={7} className="px-4 py-3 text-amber-700">{result.error}</td>:<>{result.rows.map(row=><td key={row.year} className="px-4 py-3 text-right tabular-nums">{money(row.afterTax)}</td>)}<td className="px-4 py-3 text-right font-semibold tabular-nums">{money(total(result.rows))}</td><td className="px-4 py-3 text-right tabular-nums">{reference?.rows.length===5?money(total(result.rows)-total(reference.rows)):'—'}</td></>}</tr>)}</tbody></table></div></section>
      <section className="grid gap-4 md:grid-cols-3">{results.map(r=><div key={r.id} className="rounded-xl border border-border bg-card p-4"><div className="text-sm font-semibold">{r.name}</div><div className="mt-1 text-xs text-muted-foreground">FY{source.data!.baseline.year+5} estimated net profit</div><div className="mt-2 text-2xl font-semibold tabular-nums">{r.rows.length?money(r.rows[r.rows.length-1].afterTax):'—'}</div><button type="button" className="mt-3 text-sm text-primary hover:underline" onClick={()=>{select(r.id);onNavigateTab?.('forecasts');}}>View assumptions →</button></div>)}</section>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5"><div><h2 className="font-semibold">Next: Valuation</h2><p className="mt-1 text-sm text-muted-foreground">Continue with {selected.name}. Valuation requires verified equity and share information.</p></div><button type="button" disabled={!selectedResult?.rows.length} onClick={()=>onNavigateTab?.('valuation')} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">Continue to Valuation <ArrowRight size={16}/></button></div>
    </>}
  </div>;
}
