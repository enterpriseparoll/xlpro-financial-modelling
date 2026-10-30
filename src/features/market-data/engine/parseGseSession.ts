import * as XLSX from 'xlsx-js-style';
import type { MarketRecord,MarketWorkbookResult } from './gseWorkbookParser';
const norm=(v:unknown)=>String(v??'').trim().replace(/\*/g,'').toUpperCase();
const n=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:undefined;
const date=(v:unknown)=>v instanceof Date&&!isNaN(v.valueOf())?v.toISOString().slice(0,10):undefined;
export function parseGseSession(buffer:ArrayBuffer):MarketWorkbookResult{
 const wb=XLSX.read(new Uint8Array(buffer),{type:'array',cellDates:true});const map=new Map<string,MarketRecord>(),warnings:string[]=[];
 let sessionDate:string|undefined,sessionId:string|undefined;
 for(const name of wb.SheetNames){const rows=XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name],{header:1,defval:'',raw:true}) as unknown[][];
 for(const row of rows.slice(0,10)){for(const cell of row){if(!sessionDate)sessionDate=date(cell);if(!sessionId){const m=String(cell??'').match(/(\d{3,6})\s+Trading Session/i);if(m)sessionId=m[1];}}}
 if(/trading results/i.test(name))for(const row of rows){const code=norm(row[3]);if(typeof row[0]!=='number'||! /^[A-Z][A-Z0-9.-]{1,15}$/.test(code))continue;map.set(code,{...map.get(code),ticker:code,company:String(row[1]??''),isin:String(row[2]??''),price:n(row[9]),previousClose:n(row[6]),volume:n(row[13]),sourceSheet:name,priceUnit:'GHS'});}
 if(/profile of listed companies/i.test(name))for(const row of rows){const code=norm(row[1]);if(typeof row[0]!=='number'||! /^[A-Z][A-Z0-9.-]{1,15}$/.test(code)||n(row[2])===undefined)continue;const old=map.get(code);map.set(code,{...old,ticker:code,sharesMillions:n(row[2]),marketCapMillions:n(row[3]),dividendPerShare:n(row[5]),dividendYieldPct:n(row[6])===undefined?undefined:n(row[6])!*100,eps:n(row[7]),pe:n(row[8]),sourceSheet:old?old.sourceSheet+'; '+name:name});}
 }
 if(!sessionDate)warnings.push('Trading date not detected; confirm the date before importing.');
 if(!map.size)warnings.push('No recognized trading/profile records.');
 return {records:[...map.values()].map(r=>({...r,asOf:sessionDate})),warnings,sheets:wb.SheetNames,sessionDate,sessionId} as MarketWorkbookResult;
}
