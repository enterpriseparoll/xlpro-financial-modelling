import type { MarketRecord } from '../engine/gseWorkbookParser';
export type MarketSession={id:string;exchange:'GSE';date:string;sessionId?:string;fileName:string;uploadedAt:string;sheets:string[];records:MarketRecord[];file:Blob;warnings:string[]};
const DB='xlpro-market-data-v1',STORE='sessions';
function db():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function run<T>(mode:IDBTransactionMode,fn:(store:IDBObjectStore,resolve:(v:T)=>void,reject:(e:unknown)=>void)=>void):Promise<T>{const d=await db();return new Promise<T>((resolve,reject)=>{const tx=d.transaction(STORE,mode);fn(tx.objectStore(STORE),resolve,reject);tx.oncomplete=()=>d.close();tx.onerror=()=>{d.close();reject(tx.error);};});}
export const listMarketSessions=()=>run<MarketSession[]>('readonly',(s,ok,fail)=>{const r=s.getAll();r.onsuccess=()=>ok((r.result as MarketSession[]).sort((a,b)=>b.date.localeCompare(a.date)));r.onerror=()=>fail(r.error);});
export const getMarketSession=(id:string)=>run<MarketSession|undefined>('readonly',(s,ok,fail)=>{const r=s.get(id);r.onsuccess=()=>ok(r.result as MarketSession|undefined);r.onerror=()=>fail(r.error);});
export const saveMarketSession=(v:MarketSession)=>run<void>('readwrite',(s,ok,fail)=>{const r=s.put(v);r.onsuccess=()=>ok();r.onerror=()=>fail(r.error);});
export const deleteMarketSession=(id:string)=>run<void>('readwrite',(s,ok,fail)=>{const r=s.delete(id);r.onsuccess=()=>ok();r.onerror=()=>fail(r.error);});
export function marketHistory(sessions:MarketSession[],ticker:string){const code=ticker.trim().toUpperCase();return sessions.flatMap(s=>s.records.filter(r=>r.ticker===code).map(r=>({...r,asOf:s.date,sessionId:s.sessionId,sessionKey:s.id}))).sort((a,b)=>(a.asOf||'').localeCompare(b.asOf||''));}
export function latestMarketRecord(sessions:MarketSession[],ticker:string){return marketHistory(sessions,ticker).at(-1);}
export function downloadOriginal(session:MarketSession){const url=URL.createObjectURL(session.file),a=document.createElement('a');a.href=url;a.download=session.fileName;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
