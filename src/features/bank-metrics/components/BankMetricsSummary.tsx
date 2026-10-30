import { useEffect, useState } from 'react';
import { readBankActivation } from '@/engine/bankHistoricalActivation';
import { latestMarketRecord, listMarketSessions, type MarketSession } from '@/features/market-data/services/marketDataLibrary';
import { readListedEquity } from '@/features/company-setup/services/listedEquityProfile';
import { calculateBankMetrics } from '../engine/bankMetrics';
export function BankMetricsSummary({companyId,ticker}:{companyId:string;ticker:string}){
 const [sessions,setSessions]=useState<MarketSession[]>([]);
 useEffect(()=>{let live=true;listMarketSessions().then(s=>{if(live)setSessions(s)}).catch(()=>{});return()=>{live=false}},[ticker]);
 const activation=readBankActivation(companyId);
 if(!activation?.periods.length)return null;
 const record=latestMarketRecord(sessions,ticker),listed=readListedEquity(companyId);
 const metrics=calculateBankMetrics({periods:activation.periods,market:record,marketDate:record?.asOf,sharesMillions:listed.sharesMillions,price:listed.marketPrice});
 return <section className="rounded-xl border border-border p-5"><h2 className="font-semibold">Banking ratios</h2><p className="mt-1 text-xs text-muted-foreground">Computed from activated statements and market data. No missing inputs are estimated.</p>{metrics.some(m=>m.warning)&&<p className="my-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">Market prices and financial statements have different reporting dates. Market multiples are illustrative; you may continue for demonstration.</p>}<div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">{metrics.map(m=><div key={m.key} className="rounded-lg bg-muted p-3"><p className="text-xs text-muted-foreground">{m.label}</p><strong>{m.value===undefined?'N/A':m.value.toLocaleString(undefined,{maximumFractionDigits:2})+(m.unit==='%'?'%':m.unit==='x'?'x':' GHS')}</strong><p className="mt-1 text-xs text-muted-foreground">{m.source}</p>{m.warning&&<span className="text-xs text-amber-700">Date mismatch</span>}</div>)}</div></section>
}
