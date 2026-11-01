import { useEffect, useState } from 'react';
import { calculateBankMetrics } from '@/features/bank-metrics/engine/bankMetrics';
import { readBankActivation } from '@/engine/bankHistoricalActivation';
import { latestMarketRecord, listMarketSessions } from '@/features/market-data/services/marketDataLibrary';
import { readListedEquity } from '../services/listedEquityProfile';
import type { BankEquityAssumptions } from '../services/bankEquityAssumptions';

type Props={companyId:string;ticker:string;value:BankEquityAssumptions;onChange:(v:BankEquityAssumptions)=>void};
const fmt=(n?:number,decimals=2)=>n===undefined?'Not available':n.toLocaleString(undefined,{maximumFractionDigits:decimals});
export function BankingModelFields({companyId,ticker,value,onChange}:Props){
 const [dividend,setDividend]=useState<{amount:number;date:string}|null>(null);
 useEffect(()=>{let live=true;setDividend(null);listMarketSessions().then(s=>{const record=latestMarketRecord(s,ticker);if(live&&record?.dividendPerShare!==undefined)setDividend({amount:record.dividendPerShare,date:record.asOf});}).catch(()=>{});return()=>{live=false};},[ticker]);
 const activated=readBankActivation(companyId);
 const periods=activated?.periods||[];
 const current=[...periods].sort((a,b)=>b.year-a.year)[0];
 const previous=periods.find(p=>p.year===((current?.year??0)-1));
 const equity=current?.accounts.total_equity;
 const netProfit=current?.accounts.net_profit;
 const priorEquity=previous?.accounts.total_equity;
 const listed=readListedEquity(companyId);
 const shares=listed.sharesMillions;
 // Activated banking account amounts are stored in raw GHS; the import units setting
 // controls presentation, not the numeric values in the canonical ledger.
 const equityGhs=equity;
 const price=listed.marketPrice;
 const bookValuePerShare=equityGhs!==undefined&&shares&&shares>0?equityGhs/(shares*1_000_000):undefined;
 const pb=bookValuePerShare!==undefined&&bookValuePerShare>0&&price!==undefined?price/bookValuePerShare:undefined;
 const historicalRoe=netProfit!==undefined&&equity!==undefined&&priorEquity!==undefined&&(equity+priorEquity)>0?100*netProfit/((equity+priorEquity)/2):undefined;
 const metrics=calculateBankMetrics({periods,sharesMillions:shares,price,dividendPerShare:dividend?.amount,marketDate:dividend?.date});
 const field=(key:'costOfEquity'|'sustainableRoe'|'peerPB'|'verifiedEquity',label:string,hint:string)=><label className="text-xs font-medium">{label}<span className="mt-1 block text-xs font-normal text-muted-foreground">{hint}</span><input type="number" step="any" value={value[key]??''} onChange={e=>onChange({...value,[key]:e.target.value===''?undefined:Number(e.target.value)})} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"/></label>;
 return <section className="rounded-xl border border-border p-4"><h3 className="font-semibold">Bank valuation setup</h3><p className="mt-1 text-xs text-muted-foreground">Reported financials and market data are calculated or retrieved automatically. Only genuinely forward-looking assumptions and verified overrides require input.</p>
 <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
 <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Reported equity · FY{current?.year??'—'}</p><strong>{fmt(equityGhs)} GHS</strong><p className="text-xs text-muted-foreground">Imported balance sheet</p></div>
 <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Historical ROE</p><strong>{historicalRoe===undefined?'Not available':fmt(historicalRoe)+'%'}</strong><p className="text-xs text-muted-foreground">Net profit / average reported equity</p></div>
 <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Observed price / book</p><strong>{pb===undefined?'Not available':fmt(pb)+'×'}</strong><p className="text-xs text-muted-foreground">Market price / book value per share; verify date alignment</p></div>
 <div className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">Latest reported dividend / share</p><strong>{dividend?fmt(dividend.amount,4)+' GHS':'Not available'}</strong><p className="text-xs text-muted-foreground">{dividend?'GSE workbook · '+dividend.date:'Upload a GSE trading session'}</p></div>
 </div>
 <div className="mt-4 grid grid-cols-2 gap-3">{metrics.filter(m=>m.key!=='roe'&&m.key!=='pb').map(m=><div key={m.key} className="rounded-lg bg-muted p-3 text-sm"><p className="text-xs text-muted-foreground">{m.label}</p><strong>{m.value===undefined?'Not available':fmt(m.value)+(m.unit==='%'?'%':m.unit==='x'?'x':' GHS')}</strong><p className="text-xs text-muted-foreground">{m.source}</p>{m.warning&&<p className="text-xs text-amber-700">Market date differs from financial year; illustrative only.</p>}</div>)}</div>
 <div className="mt-4 grid grid-cols-2 gap-3">
 {field('costOfEquity','Cost of equity (%)','Required investor return · analyst assumption')}
 {field('sustainableRoe','Sustainable ROE (%)','Forward-looking normalized ROE · not the historical ratio')}
 {field('peerPB','Peer P/B benchmark','Optional external comparable-company multiple; not the bank’s own observed P/B')}
 {field('verifiedEquity','Verified equity override (GHS)','Optional only if imported balance sheet needs a documented correction')}
 </div>
 <p className="mt-3 text-xs text-muted-foreground">The market workbook dividend is a historical observation, not necessarily the next expected dividend. P/B and ROE are computed only when source values exist. Different reporting dates may make observed P/B non-comparable; forward-looking inputs remain analyst assumptions.</p>
 </section>;
}
