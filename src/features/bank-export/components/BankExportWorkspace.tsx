import { useEffect,useState } from 'react';
import { useModelContext } from '@/contexts/ModelContext';
import { readBankActivation } from '@/engine/bankHistoricalActivation';
import { readBankScenarioStore,selectedBankScenario,bankScenarioEvent } from '@/features/bank-scenarios/services/scenarioStore';
import { buildBankExport,downloadBankCsv,downloadBankJson } from '../services/buildBankExport';
type Pack=Awaited<ReturnType<typeof buildBankExport>>;
export function BankExportWorkspace(){
 const {activeCompany}=useModelContext();
 const [pack,setPack]=useState<Pack|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const activation=readBankActivation(activeCompany.id);
 const [revision,setRevision]=useState(0);
 useEffect(()=>{const refresh=()=>setRevision(v=>v+1);window.addEventListener(bankScenarioEvent,refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener(bankScenarioEvent,refresh);window.removeEventListener('storage',refresh)}},[]);
 useEffect(()=>{let live=true;setLoading(true);setError('');buildBankExport(activeCompany.id,activeCompany.name,activation?.ticker??'').then(p=>{if(live)setPack(p)}).catch(e=>{if(live){setPack(null);setError(e instanceof Error?e.message:'Export unavailable')}}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[activeCompany.id,activeCompany.name,activation?.version,revision]);
 const scenario=selectedBankScenario(readBankScenarioStore(activeCompany.id));
 return <div className="mx-auto max-w-7xl space-y-5 px-5 py-7"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Step 6 / Export</p><h1 className="mt-1 text-2xl font-semibold">Bank model export</h1><p className="mt-1 text-sm text-muted-foreground">{activeCompany.name} · {scenario.name} · Historical financials, five-year forecasts and source-backed ratios</p></div>
 {loading&&<p role="status">Preparing source-backed report...</p>}
 {error&&<p role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>}
 {pack&&<><section className="rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">Export coverage</h2><p className="mt-2 text-sm">Financial source: {pack.source.fileName} · Version {pack.source.version}</p><p className="text-sm">Market session: {pack.source.marketSession??'Unavailable'} · Forecast: {pack.forecast.length} years · Ratios: {pack.metrics.length}</p><p className="mt-2 text-xs text-muted-foreground">Historical amounts in GHS; projected amounts in GHS millions. This report is not an audit opinion.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={()=>downloadBankCsv(pack)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Export CSV pack</button><button type="button" onClick={()=>downloadBankJson(pack)} className="rounded-lg border border-border px-4 py-2 text-sm">Export complete JSON</button><button type="button" onClick={()=>window.print()} className="rounded-lg border border-border px-4 py-2 text-sm">Print summary</button></div></section>
 {pack.warnings.length>0&&<section className="rounded-xl border border-amber-300 bg-amber-50 p-5"><h2 className="font-semibold text-amber-900">Source and methodology flags (non-blocking)</h2>{pack.warnings.map((w,i)=><p key={i} className="mt-2 text-sm text-amber-900">{w}</p>)}</section>}
 <section className="rounded-xl border border-border bg-card p-5"><h2 className="font-semibold">Financial metrics</h2><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="border-b p-2">Metric</th><th className="border-b p-2">Value</th><th className="border-b p-2">Source / Method</th></tr></thead><tbody>{pack.metrics.map(m=><tr key={m.key}><td className="border-b p-2">{m.label}</td><td className="border-b p-2">{m.value===undefined?'Not available':m.value.toFixed(2)+' '+m.unit}</td><td className="border-b p-2">{m.source}{m.warning?' — Date mismatch':''}</td></tr>)}</tbody></table></div></section></>}
 </div>;
}
