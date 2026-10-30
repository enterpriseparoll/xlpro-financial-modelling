import * as XLSX from 'xlsx-js-style';
export type MarketRecord={ticker:string;company?:string;price?:number;sharesMillions?:number;dividendPerShare?:number;asOf?:string;sourceSheet:string;priceUnit?:string};
export type MarketWorkbookResult={records:MarketRecord[];warnings:string[];sheets:string[]};
const clean=(v:unknown)=>String(v??'').trim().replace(/\s+/g,' ');
const ticker=(v:unknown)=>clean(v).replace(/\*/g,'').toUpperCase();
const num=(v:unknown)=>typeof v==='number'&&Number.isFinite(v)?v:undefined;
function dateString(v:unknown):string|undefined{if(v instanceof Date)return v.toISOString().slice(0,10);if(typeof v==='number'){const d=XLSX.SSF.parse_date_code(v);if(d)return [d.y,String(d.m).padStart(2,'0'),String(d.d).padStart(2,'0')].join('-');}const m=clean(v).match(/\b20\d{2}-\d{2}-\d{2}\b/);return m?.[0];}
export function parseMarketWorkbook(buffer:ArrayBuffer):MarketWorkbookResult{
 const book=XLSX.read(new Uint8Array(buffer),{type:'array',cellDates:true});
 const records=new Map<string,MarketRecord>();const warnings:string[]=[];
 let asOf:string|undefined;
 for(const name of book.SheetNames){const data=XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[name],{header:1,defval:'',raw:true}) as unknown[][];
 for(const row of data.slice(0,8)){for(const cell of row){const date=dateString(cell);if(date){asOf=date;break;}}if(asOf)break;}
 if(/trading results/i.test(name)){for(const row of data){const code=ticker(row[3]);if(!/^[A-Z0-9]{2,12}$/.test(code)||!num(row[9])||typeof row[0]!=='number')continue;const prev=records.get(code);records.set(code,{...prev,ticker:code,company:clean(row[1])||prev?.company,price:num(row[9]),asOf,sourceSheet:name,priceUnit:'GHS'});}}
 if(/profile of listed companies/i.test(name)){for(const row of data){const code=ticker(row[1]);if(!/^[A-Z0-9]{2,12}$/.test(code)||typeof row[0]!=='number'||num(row[2])===undefined)continue;const prev=records.get(code);records.set(code,{...prev,ticker:code,sharesMillions:num(row[2]),dividendPerShare:num(row[5]),sourceSheet:prev?.sourceSheet?prev.sourceSheet+'; '+name:name,asOf:prev?.asOf||asOf});}}
 }
 if(!records.size)warnings.push('No supported Ghana Stock Exchange Trading Results / Profile of Listed Companies tables found. Workbook preserved; no market values inferred.');
 return {records:[...records.values()],warnings,sheets:book.SheetNames};
}
