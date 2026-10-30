import { readBankActivation } from '@/engine/bankHistoricalActivation';
import { readListedEquity } from '@/features/company-setup/services/listedEquityProfile';
import { readBankEquityAssumptions } from '@/features/company-setup/services/bankEquityAssumptions';
import { readBankScenarioStore, selectedBankScenario } from '@/features/bank-scenarios/services/scenarioStore';
import { getBankForecastSource } from '@/features/bank-scenarios/services/forecastSource';
import { calculateBankMetrics } from '@/features/bank-metrics/engine/bankMetrics';
import { latestMarketRecord, listMarketSessions } from '@/features/market-data/services/marketDataLibrary';
export async function buildBankExport(companyId:string,companyName:string,ticker:string){
 const activation=readBankActivation(companyId);
 if(!activation?.periods.length)throw new Error('Activate bank statements before exporting.');
 const store=readBankScenarioStore(companyId),scenario=selectedBankScenario(store);
 const forecast=getBankForecastSource(companyId);
 const listed=readListedEquity(companyId),assumptions=readBankEquityAssumptions(companyId);
 const market=latestMarketRecord(await listMarketSessions(),ticker || activation.ticker);
 const metrics=calculateBankMetrics({periods:activation.periods,market,marketDate:market?.asOf,sharesMillions:listed.sharesMillions??market?.sharesMillions,price:listed.marketPrice??market?.price,dividendPerShare:market?.dividendPerShare});
 const latest=[...activation.periods].sort((a,b)=>b.year-a.year)[0];
 const warnings:string[]=[];
 if(!forecast.data)warnings.push('Forecast unavailable: '+forecast.error);
 if(market?.asOf&&Number(market.asOf.slice(0,4))!==latest.year)warnings.push('Market observation '+market.asOf+' differs from FY'+latest.year+' financial statements. Market multiples are illustrative.');
 if(!market)warnings.push('No matching market session found; market ratios may be unavailable.');
 if(latest.accounts.total_equity===undefined)warnings.push('Reported equity unavailable; valuation cannot be independently supported.');
 warnings.push('Bank equity valuation is an indicative steady-state estimate, not a forecast-linked residual income valuation.');
 return {reportType:'Bank financial model - source-backed export',generatedAt:new Date().toISOString(),company:{id:companyId,name:companyName,ticker,currency:'GHS'},source:{fileName:activation.fileName,version:activation.version,activatedAt:activation.activatedAt,marketSession:market?.asOf??null},scenario:{id:scenario.id,name:scenario.name,settings:scenario.settings},historical:activation.periods,forecast:forecast.data?.rows??[],forecastUnit:'GHS millions',metrics,listedEquity:listed,valuationAssumptions:assumptions,warnings};
}
export function downloadBankJson(data:Awaited<ReturnType<typeof buildBankExport>>){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='bank-model-'+data.company.ticker+'-'+data.scenario.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function downloadBankCsv(data:Awaited<ReturnType<typeof buildBankExport>>){
 const quote=(v:unknown)=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const lines:string[][]=[['Section','Period','Metric','Value','Unit','Source / Note']];
 for(const p of data.historical)for(const [k,v] of Object.entries(p.accounts))lines.push(['Historical',String(p.year),k,String(v),'GHS',data.source.fileName]);
 for(const row of data.forecast)for(const [k,v] of Object.entries(row))if(k!=='year'&&typeof v==='number')lines.push(['Forecast',String(row.year),k,String(v),'GHS millions',data.scenario.name]);
 for(const m of data.metrics)lines.push(['Ratios',String(Math.max(...data.historical.map(p=>p.year))),m.label,m.value===undefined?'':String(m.value),m.unit,m.source+(m.warning?' | '+m.warning:'')]);
 for(const w of data.warnings)lines.push(['Warning','','', '', '',w]);
 const blob=new Blob([lines.map(row=>row.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='bank-model-'+data.company.ticker+'-'+data.scenario.id+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
