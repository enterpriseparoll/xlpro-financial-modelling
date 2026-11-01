import { useState } from 'react';
import { type MarketRecord } from '../engine/gseWorkbookParser';
import { parseGseSession } from '../engine/parseGseSession';
import { readListedEquity,saveListedEquity } from '@/features/company-setup/services/listedEquityProfile';
export function MarketWorkbookImport({companyId,ticker,onApplied}:{companyId:string;ticker:string;onApplied:()=>void}){
 const [record,setRecord]=useState<MarketRecord|null>(null);
 const [fileName,setFileName]=useState('');
 const [error,setError]=useState('');
 const [found,setFound]=useState(0);
 const load=async(e:React.ChangeEvent<HTMLInputElement>)=>{const file=e.target.files?.[0];if(!file)return;setError('');setRecord(null);try{const result=parseGseSession(await file.arrayBuffer());setFileName(file.name);setFound(result.records.length);const match=result.records.find(r=>r.ticker===ticker.trim().toUpperCase());if(!match){setError('No exact ticker match for '+ticker+'. Available tickers: '+result.records.map(r=>r.ticker).slice(0,20).join(', '));return;}setRecord(match);}catch(err){setError(err instanceof Error?err.message:'Unable to parse workbook');}};
 const apply=()=>{if(!record)return;const old=readListedEquity(companyId);saveListedEquity(companyId,{...old,marketPrice:record.price??old.marketPrice,sharesMillions:record.sharesMillions??old.sharesMillions,priceAsOf:record.asOf??old.priceAsOf,exchange:old.exchange||'GSE'});onApplied();};
 return <section className="rounded-xl border border-border p-4 space-y-3"><h3 className="font-semibold">Import exchange market data</h3><p className="text-xs text-muted-foreground">Upload the original Ghana Stock Exchange trading-session Excel file. All worksheets are inspected locally. Data are matched by exact ticker and reviewed before saving.</p><input type="file" accept=".xlsx,.xls" onChange={load} className="block w-full text-sm"/>{fileName&&<p className="text-xs text-muted-foreground">{fileName} · {found} listed securities recognized</p>}{error&&<p role="alert" className="text-sm text-amber-700">{error}</p>}{record&&<div className="rounded-lg bg-muted p-3 text-sm space-y-1"><p><strong>{record.ticker}</strong> · {record.company||'Listed security'}</p><p>Closing price: {record.price??'Not available'} GHS · Shares: {record.sharesMillions??'Not available'} million</p><p>As of: {record.asOf||'Not found'} · Source: {record.sourceSheet}</p><button type="button" onClick={apply} className="mt-2 rounded-lg bg-primary px-3 py-2 text-primary-foreground">Use available values for this company</button></div>}</section>;
}
