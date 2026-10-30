import { useMemo, useState } from 'react';
import { useModelContext } from '@/contexts/ModelContext';
import { readBankActivation } from '@/engine/bankHistoricalActivation';
import { bankValuation } from '@/engine/bankValuation';
import { useBankScenarioLibrary } from '@/features/bank-scenarios/hooks/useBankScenarioLibrary';
import { getBankForecastSource } from '@/features/bank-scenarios/services/forecastSource';
import { BankValuationForecastBridge } from './BankValuationForecastBridge';
type Inputs={equity:number;shares:number;costOfEquity:number;growth:number;roe:number;dividend:number;peerPB:number};
const blank:Inputs={equity:0,shares:0,costOfEquity:0,growth:0,roe:0,dividend:0,peerPB:0};
const fmt=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2,minimumFractionDigits:2}).format(n);
export function BankValuationWorkspace({onNavigateTab}:{onNavigateTab?:(tabId:string,subTabId?:string)=>void}){
 const {activeCompany}=useModelContext();
 const {store,selected,select}=useBankScenarioLibrary(activeCompany.id);
 const forecast=getBankForecastSource(activeCompany.id);
 const activated=readBankActivation(activeCompany.id);
 const latest=activated?.periods?.slice().sort((a,b)=>b.year-a.year)[0];
 const reportedEquity=latest?.accounts.total_equity;
 const [state,setState]=useState<{companyId:string;inputs:Inputs}>(()=>{
  try{return {companyId:activeCompany.id,inputs:{...blank,...JSON.parse(localStorage.getItem('xlpro:bank-valuation-simple:v1:'+activeCompany.id)||'{}')}};}catch{return {companyId:activeCompany.id,inputs:blank};}
 });
 const inputs=state.companyId===activeCompany.id?state.inputs:blank;
 const change=(key:keyof Inputs,value:number)=>{if(!Number.isFinite(value))return;const next={...inputs,[key]:value};setState({companyId:activeCompany.id,inputs:next});localStorage.setItem('xlpro:bank-valuation-simple:v1:'+activeCompany.id,JSON.stringify(next));};
 const equity=inputs.equity>0?inputs.equity:reportedEquity;
 const bookValue=equity!==undefined&&equity>0&&inputs.shares>0?equity/(inputs.shares*1_000_000):undefined;
 const valuation=useMemo(()=>{if(bookValue===undefined)return {data:null,error:'Verified total equity and shares outstanding are required.'};try{return {data:bankValuation({bookValuePerShare:bookValue,costOfEquityPct:inputs.costOfEquity,perpetualGrowthPct:inputs.growth,sustainableRoePct:inputs.roe,nextDividendPerShare:inputs.dividend,peerPriceToBook:inputs.peerPB||undefined,sharesOutstanding:inputs.shares*1_000_000}),error:''};}catch(e){return {data:null,error:e instanceof Error?e.message:'Invalid valuation inputs'};}},[bookValue,inputs]);
 const fields:{key:keyof Inputs;label:string;help:string}[]=[
  {key:'equity',label:'Verified total equity (GHS)',help:'Optional override when not imported'},
  {key:'shares',label:'Shares outstanding (millions)',help:'Verified share count, not estimated'},
  {key:'costOfEquity',label:'Cost of equity (%)',help:'Required return on equity'},
  {key:'growth',label:'Terminal growth (%)',help:'Must be below cost of equity'},
  {key:'roe',label:'Sustainable ROE (%)',help:'Forward steady-state assumption'},
  {key:'dividend',label:'Next dividend per share (GHS)',help:'Verified dividend expectation'},
  {key:'peerPB',label:'Peer P/B multiple',help:'Optional market benchmark'},
 ];
 return <div className="mx-auto max-w-7xl space-y-6 px-5 py-7">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Bank equity valuation</h1><p className="mt-1 text-sm text-muted-foreground">{activeCompany.name} · GHS · Scenario-aware valuation review</p></div><button type="button" className="rounded-lg border border-border px-4 py-2 text-sm" onClick={()=>onNavigateTab?.('forecasts')}>Back to Forecast</button></div>
  <section className="rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-center gap-3"><label htmlFor="bank-value-scenario" className="text-sm font-semibold">Scenario</label><select id="bank-value-scenario" value={selected.id} onChange={e=>select(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">{store.scenarios.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><span className="text-xs text-muted-foreground">Each scenario's forecast is preserved from Step 4.</span></div></section>
  {forecast.data?<BankValuationForecastBridge name={selected.name} rows={forecast.data.rows} source={forecast.data.sourceFile}/>:<div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">{forecast.error}</div>}
  <section className="rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">Valuation inputs</h2><p className="mt-1 text-sm text-muted-foreground">Equity and shares must be verified. Source equity: {reportedEquity===undefined?'Not available':fmt(reportedEquity)+' GHS'}. Inputs save automatically for this company.</p><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{fields.map(f=><label key={f.key} className="block"><span className="text-sm font-medium">{f.label}</span><span className="mt-1 block text-xs text-muted-foreground">{f.help}</span><input aria-label={f.label} type="number" step="any" placeholder={f.key==='equity'&&reportedEquity!==undefined?String(reportedEquity):undefined} value={inputs[f.key]||''} onChange={e=>change(f.key,e.target.value===''?0:Number(e.target.value))} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"/></label>)}</div></section>
  <section className="rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">Indicative equity valuation</h2><p className="mt-1 text-sm text-muted-foreground">Steady-state dividend discount, residual income and peer P/B methods. These are not yet five-year forecast-linked residual-income values.</p>{valuation.data?<div className="mt-4 grid gap-3 sm:grid-cols-3">{[['Dividend discount / share',valuation.data.ddmPerShare],['Residual income / share',valuation.data.residualIncomePerShare],['Peer P/B / share',valuation.data.priceToBookPerShare]].map(([label,value])=><div key={String(label)} className="rounded-lg bg-muted/40 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold">{typeof value==='number'?fmt(value)+' GHS':'—'}</p></div>)}</div>:<p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{valuation.error}</p>}</section>
  <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5"><div><h2 className="font-semibold">Next: Export</h2><p className="text-sm text-muted-foreground">Prepare the selected scenario's model report.</p></div><button type="button" onClick={()=>onNavigateTab?.('reports')} className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Continue to Export →</button></div>
 </div>;
}
