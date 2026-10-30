import { useState } from 'react';
import { useModelContext } from '@/contexts/ModelContext';
import { getBankForecastSource } from '../services/forecastSource';
import { runBankScenario, scenarioDefaults, type BankScenario, type ScenarioAdjustment } from '../engine/scenarioEngine';
import { ArrowRight } from 'lucide-react';
const money = (n: number) => new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const scenarios: BankScenario[] = ['base','bull','bear'];
const titles: Record<BankScenario,string> = {base:'Base case',bull:'Bull case',bear:'Bear case'};
export function BankScenariosWorkspace({onNavigateTab}:{onNavigateTab?:(tabId:string,subTabId?:string)=>void}) {
  const {activeCompany}=useModelContext();
  const key='xlpro:bank-scenarios:v1:'+activeCompany.id;
  const [adjustments,setAdjustments]=useState<Record<BankScenario,ScenarioAdjustment>>(()=>{
    try {return {...scenarioDefaults,...JSON.parse(localStorage.getItem(key)||'{}')};} catch{return scenarioDefaults;}
  });
  const source=getBankForecastSource(activeCompany.id);
  const results=source.data?scenarios.map(id=>({id,rows:runBankScenario(source.data!.baseline,source.data!.settings,adjustments[id])})):[];
  const update=(id:BankScenario,field:keyof ScenarioAdjustment,n:number)=>{
    if(!Number.isFinite(n))return;
    const next={...adjustments,[id]:{...adjustments[id],[field]:Math.max(-100,Math.min(100,n))}};
    setAdjustments(next);localStorage.setItem(key,JSON.stringify(next));
  };
  return <div className="mx-auto max-w-7xl space-y-6 px-5 py-7">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Banking scenarios</h1><p className="mt-1 text-sm text-muted-foreground">{activeCompany.name} · Base, Bull and Bear · GHS millions</p></div><button type="button" className="rounded-lg border border-border px-4 py-2 text-sm" onClick={()=>onNavigateTab?.('forecasts')}>Review forecast</button></div>
    {!source.data?<div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm">{source.error}</div>:<>
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Using {source.data.sourceFile} · Activated version {source.data.sourceVersion} · {source.data.settings.mode} forecasting. Scenario changes recalculate the underlying five-year bank forecast.</div>
      <section className="grid gap-4 lg:grid-cols-3">{scenarios.map(id=><div key={id} className="rounded-xl border border-border bg-card p-5"><h2 className="text-base font-semibold">{titles[id]}</h2><p className="mt-1 text-xs text-muted-foreground">Changes relative to the Step 4 assumptions (percentage points).</p><div className="mt-4 space-y-3">{([['incomeDelta','Income growth adjustment'],['expenseDelta','Expense growth adjustment'],['impairmentDelta','Impairment adjustment']] as const).map(([field,label])=><label key={field} className="flex items-center justify-between gap-3 text-sm"><span>{label}</span><div className="flex items-center gap-1"><input aria-label={titles[id]+' '+label} type="number" step="0.5" value={adjustments[id][field]} onChange={e=>update(id,field,Number(e.target.value))} className="w-20 rounded-md border border-border bg-background px-2 py-2 text-right"/><span className="text-xs text-muted-foreground">pp</span></div></label>)}</div></div>)}</section>
      <section className="rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">Five-year net profit comparison</h2><p className="mt-1 text-sm text-muted-foreground">All values are calculated estimates, not reported actuals.</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead className="bg-muted/50"><tr><th className="px-4 py-3 text-left">Scenario</th>{results[0]?.rows.map(row=><th key={row.year} className="px-4 py-3 text-right">FY{row.year}E</th>)}</tr></thead><tbody>{results.map(result=><tr key={result.id} className="border-t border-border"><th className="px-4 py-3 text-left font-medium">{titles[result.id]}</th>{result.rows.map(row=><td key={row.year} className="px-4 py-3 text-right tabular-nums">{money(row.afterTax)}</td>)}</tr>)}</tbody></table></div></section>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-5"><div><h2 className="font-semibold">Next: Valuation</h2><p className="mt-1 text-sm text-muted-foreground">Review bank-specific valuation assumptions and equity requirements.</p></div><button type="button" onClick={()=>onNavigateTab?.('valuation')} className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Continue to Valuation <ArrowRight size={16}/></button></div>
    </>}
  </div>;
}
