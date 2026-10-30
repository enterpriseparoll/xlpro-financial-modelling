import { useMemo, useState } from 'react';
import { useModelContext } from '@/contexts/ModelContext';
import { readBankActivation } from '@/engine/bankHistoricalActivation';
import { bankValuation } from '@/engine/bankValuation';
import { useBankScenarioLibrary } from '@/features/bank-scenarios/hooks/useBankScenarioLibrary';
import { getBankForecastSource } from '@/features/bank-scenarios/services/forecastSource';
import { BankValuationForecastBridge } from './BankValuationForecastBridge';
import { readListedEquity } from '@/features/company-setup/services/listedEquityProfile';
import { readBankEquityAssumptions } from '@/features/company-setup/services/bankEquityAssumptions';
const fmt=(n:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:2,minimumFractionDigits:2}).format(n);
export function BankValuationWorkspace({onNavigateTab}:{onNavigateTab?:(tabId:string,subTabId?:string)=>void}){
 const {activeCompany}=useModelContext();
 const {store,selected,select}=useBankScenarioLibrary(activeCompany.id);
 const forecast=getBankForecastSource(activeCompany.id);
 const activated=readBankActivation(activeCompany.id);
 const latest=activated?.periods?.slice().sort((a,b)=>b.year-a.year)[0];
 const reportedEquity=latest?.accounts.total_equity;
 const listed=activeCompany.isListed?readListedEquity(activeCompany.id):{};
 const bankSetup=readBankEquityAssumptions(activeCompany.id);
 const [showForecast,setShowForecast]=useState(false);
 const equity=reportedEquity!==undefined&&reportedEquity>0?reportedEquity:bankSetup.verifiedEquity;
 const shares=listed.sharesMillions&&listed.sharesMillions>0?listed.sharesMillions:(bankSetup.verifiedSharesMillions??0);
 const growth=listed.terminalGrowthPct??bankSetup.terminalGrowth??0;
 const bookValue=equity!==undefined&&equity>0&&shares>0?equity/(shares*1_000_000):undefined;
 const valuation=useMemo(()=>{if(bookValue===undefined)return {data:null,error:'Verified total equity and shares outstanding are required.'};try{return {data:bankValuation({bookValuePerShare:bookValue,costOfEquityPct:bankSetup.costOfEquity??0,perpetualGrowthPct:growth,sustainableRoePct:bankSetup.sustainableRoe??0,nextDividendPerShare:bankSetup.nextDividend??0,peerPriceToBook:bankSetup.peerPB||undefined,sharesOutstanding:shares*1_000_000}),error:''};}catch(e){return {data:null,error:e instanceof Error?e.message:'Invalid valuation inputs'};}},[bookValue,bankSetup.costOfEquity,bankSetup.sustainableRoe,bankSetup.nextDividend,bankSetup.peerPB,shares,growth]);
 return <div className="mx-auto max-w-7xl space-y-6 px-5 py-7">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Bank equity valuation</h1><p className="mt-1 text-sm text-muted-foreground">{activeCompany.name} · GHS · Scenario-aware valuation review</p></div><button type="button" className="rounded-lg border border-border px-4 py-2 text-sm" onClick={()=>onNavigateTab?.('forecasts')}>Back to Forecast</button></div>
  <section className="rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-center gap-3"><label htmlFor="bank-value-scenario" className="text-sm font-semibold">Scenario</label><select id="bank-value-scenario" value={selected.id} onChange={e=>select(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">{store.scenarios.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><span className="text-xs text-muted-foreground">Each scenario's forecast is preserved from Step 4.</span></div></section>
  <div className="flex justify-end"><button type="button" onClick={()=>setShowForecast(true)} className="rounded-lg border border-border px-4 py-2 text-sm">View selected forecast ↗</button></div>
  {showForecast&&<div className="fixed inset-0 z-50 flex justify-end"><button type="button" aria-label="Close forecast drawer" className="absolute inset-0 bg-black/40" onClick={()=>setShowForecast(false)}/><aside role="dialog" aria-modal="true" aria-label="Selected forecast" className="relative h-full w-full max-w-5xl overflow-y-auto bg-background p-6 shadow-xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold">Forecast details</h2><button type="button" onClick={()=>setShowForecast(false)} className="rounded-lg border border-border px-3 py-2 text-sm">Close ✕</button></div>{forecast.data?<BankValuationForecastBridge name={selected.name} rows={forecast.data.rows} source={forecast.data.sourceFile}/>:<p role="alert">{forecast.error}</p>}</aside></div>}
  <section className="rounded-xl border border-border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Company valuation setup</h2><p className="mt-1 text-sm text-muted-foreground">Imported equity: {reportedEquity===undefined?'Missing':fmt(reportedEquity)+' GHS'} · Shares: {shares>0?fmt(shares)+' million':'Missing'} · Cost of equity: {bankSetup.costOfEquity??'Not set'}% · Terminal growth: {growth}%</p></div><button type="button" onClick={()=>onNavigateTab?.('companies')} className="rounded-lg border border-border px-4 py-2 text-sm">Edit company setup →</button></div>{(!equity||!shares||!bankSetup.costOfEquity)&&<p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Required equity, share count or cost of equity is missing. Import the balance sheet in Step 2 and edit the company model in Step 1.</p>}</section>
  <section className="rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">Indicative equity valuation</h2><p className="mt-1 text-sm text-muted-foreground">Steady-state dividend discount, residual income and peer P/B methods. These are not yet five-year forecast-linked residual-income values.</p>{valuation.data?<div className="mt-4 grid gap-3 sm:grid-cols-3">{[['Dividend discount / share',valuation.data.ddmPerShare],['Residual income / share',valuation.data.residualIncomePerShare],['Peer P/B / share',valuation.data.priceToBookPerShare]].map(([label,value])=><div key={String(label)} className="rounded-lg bg-muted/40 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold">{typeof value==='number'?fmt(value)+' GHS':'—'}</p></div>)}</div>:<p role="status" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{valuation.error}</p>}</section>
  <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5"><div><h2 className="font-semibold">Next: Export</h2><p className="text-sm text-muted-foreground">Prepare the selected scenario's model report.</p></div><button type="button" onClick={()=>onNavigateTab?.('reports')} className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Continue to Export →</button></div>
 </div>;
}
