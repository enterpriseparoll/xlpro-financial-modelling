import { readBankActivation } from '@/engine/bankHistoricalActivation';
import { readListedEquity } from '@/features/company-setup/services/listedEquityProfile';
import { readBankEquityAssumptions } from '@/features/company-setup/services/bankEquityAssumptions';
import { readBankScenarioStore, selectedBankScenario } from '@/features/bank-scenarios/services/scenarioStore';
import { getBankForecastSource } from '@/features/bank-scenarios/services/forecastSource';
import { calculateBankMetrics } from '@/features/bank-metrics/engine/bankMetrics';
import { latestMarketRecord, listMarketSessions } from '@/features/market-data/services/marketDataLibrary';
import { calculateResidualIncome, type ResidualIncomeResult } from '@/features/bank-valuation/engine/residualIncome';
import { buildWorkbook,downloadWorkbook,tableDocument,type ReportExportDocument } from '@/lib/export';
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
 const sharesMillions=listed.sharesMillions??assumptions.verifiedSharesMillions;
 const openingEquity=latest.accounts.total_equity??assumptions.verifiedEquity;
 const storedPayout=Number(localStorage.getItem('xlpro:bank-payout:v1:'+companyId));
 const payoutPct=Number.isFinite(storedPayout)?storedPayout:50;
 let valuation:ResidualIncomeResult|null=null,valuationError='';
 if(openingEquity&&openingEquity>0&&sharesMillions&&sharesMillions>0&&assumptions.costOfEquity&&forecast.data){
  try{valuation=calculateResidualIncome({openingEquityMillions:openingEquity/1_000_000,sharesMillions,costOfEquityPct:assumptions.costOfEquity,terminalGrowthPct:listed.terminalGrowthPct??assumptions.terminalGrowth??0,payoutPct,forecast:forecast.data.rows,marketPrice:listed.marketPrice??market?.price,marketDate:listed.priceAsOf??market?.asOf});}catch(e){valuationError=e instanceof Error?e.message:'Residual income valuation failed.'}
 }else valuationError='Requires a forecast, verified opening equity, shares outstanding and a positive cost of equity.';
 if(!valuation)warnings.push('Intrinsic valuation unavailable: '+valuationError);
 return {reportType:'Bank financial model - source-backed export',generatedAt:new Date().toISOString(),company:{id:companyId,name:companyName,ticker,currency:'GHS'},source:{fileName:activation.fileName,version:activation.version,activatedAt:activation.activatedAt,marketSession:market?.asOf??null},scenario:{id:scenario.id,name:scenario.name,settings:scenario.settings},historical:activation.periods,forecast:forecast.data?.rows??[],forecastUnit:'GHS millions',metrics,listedEquity:listed,valuationAssumptions:assumptions,valuation,warnings};
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
 if(data.valuation){const v=data.valuation;
  lines.push(['Valuation','','Intrinsic value per share',String(v.intrinsicPerShare),'GHS','Five-year residual income model']);
  lines.push(['Valuation','','Intrinsic equity value',String(v.equityValueMillions),'GHS millions','Opening equity + PV of residual income']);
  lines.push(['Valuation','','Observed market price',v.marketPrice===undefined?'':String(v.marketPrice),'GHS','Reference only']);
  lines.push(['Valuation','','Illustrative upside / downside',v.upsidePct===undefined?'':String(v.upsidePct),'%','Calculated, not a recommendation']);
  lines.push(['Valuation','','Cost of equity',String(v.costOfEquityPct),'%','Assumption'],['Valuation','','Terminal growth',String(v.terminalGrowthPct),'%','Assumption'],['Valuation','','Dividend payout',String(v.payoutPct),'%','Assumption']);
  for(const y of v.years){lines.push(['Valuation','FY'+y.year,'Residual income',String(y.residualIncome),'GHS millions','Equity roll-forward']);lines.push(['Valuation','FY'+y.year,'Closing equity',String(y.closingEquity),'GHS millions','Equity roll-forward']);}
 }
 for(const w of data.warnings)lines.push(['Warning','','', '', '',w]);
 const blob=new Blob([lines.map(row=>row.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='bank-model-'+data.company.ticker+'-'+data.scenario.id+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
type BankExportPack=Awaited<ReturnType<typeof buildBankExport>>;
const brandOf=(data:BankExportPack)=>({companyName:data.company.name});
function bankValuationDoc(data:BankExportPack):ReportExportDocument|null{
 if(!data.valuation)return null;
 const v=data.valuation,cur=data.company.currency;
 const rows:(string|number|null)[][]=[
  ['Intrinsic value per share',cur,v.intrinsicPerShare,'Five-year residual income model'],
  ['Intrinsic equity value',cur+' millions',v.equityValueMillions,'Opening equity + PV of residual income'],
  ['PV forecast residual income',cur+' millions',v.forecastResidualPV,'Five-year explicit period'],
  ['PV terminal residual income',cur+' millions',v.terminalResidualPV,'Discounted terminal residual'],
  ['Observed market price',cur,v.marketPrice??null,'Reference only'],
  ['Illustrative upside / downside','%',v.upsidePct??null,'Calculated, not a recommendation'],
  ['Cost of equity','%',v.costOfEquityPct,'Assumption'],
  ['Terminal growth','%',v.terminalGrowthPct,'Assumption'],
  ['Dividend payout','%',v.payoutPct,'Assumption'],
 ];
 for(const y of v.years)rows.push(['FY'+y.year+' residual income',cur+' millions',y.residualIncome,'Equity roll-forward'],['FY'+y.year+' closing equity',cur+' millions',y.closingEquity,'Equity roll-forward']);
 return tableDocument({sheetName:'Valuation',title:'Bank intrinsic equity valuation',subtitle:data.scenario.name+' scenario',caption:'Illustrative estimate; not an audit opinion or investment recommendation.',branding:brandOf(data),currency:cur,
  columns:[{header:'Metric',width:34},{header:'Unit',width:14},{header:'Value',format:'number'},{header:'Source / Note',width:40}],rows});
}
export function downloadBankValuationXlsx(data:BankExportPack){
 const doc=bankValuationDoc(data);
 if(doc)downloadWorkbook(buildWorkbook([doc]),'bank-intrinsic-valuation-'+data.company.ticker);
}
/** Full model pack as a branded workbook: source, historical, forecast, ratios, valuation, warnings. */
export function buildBankExcelPack(data:BankExportPack){
 const cur=data.company.currency,brand=brandOf(data);
 const accounts=[...new Set(data.historical.flatMap(p=>Object.keys(p.accounts)))];
 const years=[...data.historical].sort((a,b)=>a.year-b.year);
 const forecastKeys=[...new Set(data.forecast.flatMap(r=>Object.keys(r).filter(k=>k!=='year')))];
 const docs:ReportExportDocument[]=[
  {sheetName:'Summary',reportTitle:data.company.name+' — bank model export',reportSubtitle:data.scenario.name+' scenario · generated '+data.generatedAt.slice(0,10),branding:brand,currency:cur,sections:[],
   metaBlocks:[{title:'Source',rows:[{label:'Financial statements',value:data.source.fileName},{label:'Dataset version',value:data.source.version},{label:'Activated',value:data.source.activatedAt.slice(0,10)},{label:'Market session',value:data.source.marketSession??'Unavailable'},{label:'Historical units',value:cur+' (as reported)'},{label:'Forecast units',value:data.forecastUnit}]}],
   footnote:'This report is not an audit opinion. Forecasts, ratios and valuation are estimates from the stated sources and assumptions.'},
  tableDocument({sheetName:'Historical',title:'Historical statements (actual)',subtitle:'Amounts in '+cur+' as reported',branding:brand,currency:cur,
   columns:[{header:'Account',width:34},...years.map(p=>({header:'FY'+p.year,format:'number' as const}))],
   rows:accounts.map(k=>[k,...years.map(p=>p.accounts[k as keyof typeof p.accounts]??null)])}),
  tableDocument({sheetName:'Forecast',title:'Forecast (estimates)',subtitle:'Amounts in '+data.forecastUnit,branding:brand,currency:cur,
   columns:[{header:'Line',width:28},...data.forecast.map(r=>({header:'FY'+r.year+'E',format:'number' as const}))],
   rows:forecastKeys.map(k=>[k,...data.forecast.map(r=>{const v=(r as Record<string,unknown>)[k];return typeof v==='number'?v:null;})])}),
  tableDocument({sheetName:'Ratios',title:'Ratios and market metrics',branding:brand,currency:cur,
   columns:[{header:'Metric',width:32},{header:'Value',format:'number'},{header:'Unit'},{header:'Source',width:30},{header:'Warning',width:50}],
   rows:data.metrics.map(m=>[m.label,m.value??null,m.unit,m.source,m.warning??''])}),
 ];
 const valuation=bankValuationDoc(data);
 if(valuation)docs.push(valuation);
 docs.push(tableDocument({sheetName:'Warnings',title:'Warnings and limitations',branding:brand,currency:cur,columns:[{header:'Warning',width:110}],rows:data.warnings.length?data.warnings.map(w=>[w]):[['None recorded']]}));
 return buildWorkbook(docs);
}
export function downloadBankExcelPack(data:BankExportPack){
 downloadWorkbook(buildBankExcelPack(data),'bank-model-'+data.company.ticker+'-'+data.scenario.id);
}
