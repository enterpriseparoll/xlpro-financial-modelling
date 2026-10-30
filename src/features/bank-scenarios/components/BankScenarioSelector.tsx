import { useState } from 'react';
import { useBankScenarioLibrary } from '../hooks/useBankScenarioLibrary';
export function BankScenarioSelector({companyId}:{companyId:string}) {
  const {store,selected,select,duplicate}=useBankScenarioLibrary(companyId);
  const [draft,setDraft]=useState('');
  const [showCreate,setShowCreate]=useState(false);
  return <section className="rounded-xl border border-border bg-card p-4"><div className="flex flex-wrap items-center gap-3">
    <label htmlFor="bank-scenario-select" className="text-sm font-semibold">Forecast scenario</label>
    <select id="bank-scenario-select" className="min-w-48 rounded-lg border border-border bg-background px-3 py-2 text-sm" value={selected.id} onChange={e=>select(e.target.value)}>{store.scenarios.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select>
    <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm" onClick={()=>{setDraft(selected.name+' Copy');setShowCreate(true);}}>Duplicate scenario</button>
    <button type="button" className="rounded-lg border border-border px-3 py-2 text-sm" onClick={()=>{setDraft('');setShowCreate(true);}}>+ New scenario</button>
    <span className="text-xs text-muted-foreground">Assumptions save automatically for each scenario.</span>
  </div>{showCreate&&<form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={e=>{e.preventDefault();if(draft.trim()){duplicate(draft);setShowCreate(false);}}}><input autoFocus aria-label="New scenario name" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" placeholder="Scenario name" value={draft} onChange={e=>setDraft(e.target.value)}/><button className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground" type="submit">Create</button><button className="rounded-lg border border-border px-3 py-2 text-sm" type="button" onClick={()=>setShowCreate(false)}>Cancel</button></form>}</section>;
}
