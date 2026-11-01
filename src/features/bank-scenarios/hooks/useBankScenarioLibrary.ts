import { useEffect, useState } from 'react';
import { bankScenarioEvent, readBankScenarioStore, saveBankScenarioStore, selectedBankScenario, duplicateBankScenario, type BankScenarioStore } from '../services/scenarioStore';
import type { ForecastSettings } from '@/engine/bankForecast';
export function useBankScenarioLibrary(companyId: string) {
  const [state,setState] = useState<{companyId:string;store:BankScenarioStore}>(()=>({companyId,store:readBankScenarioStore(companyId)}));
  useEffect(()=>{
    const refresh=()=>setState({companyId,store:readBankScenarioStore(companyId)});
    refresh();
    window.addEventListener(bankScenarioEvent,refresh);
    window.addEventListener('storage',refresh);
    return ()=>{window.removeEventListener(bankScenarioEvent,refresh);window.removeEventListener('storage',refresh);};
  },[companyId]);
  const store=state.companyId===companyId?state.store:readBankScenarioStore(companyId);
  const commit=(next:BankScenarioStore)=>saveBankScenarioStore(companyId,next);
  const selected=selectedBankScenario(store);
  return {
    store,selected,
    select:(id:string)=>{if(store.scenarios.some(s=>s.id===id))commit({...store,selectedId:id});},
    updateSettings:(settings:ForecastSettings)=>commit({...store,scenarios:store.scenarios.map(s=>s.id===selected.id?{...s,settings}:s)}),
    duplicate:(name:string)=>{if(!name.trim())return;duplicateBankScenario(companyId,selected.id,name);},
    rename:(name:string)=>{if(!name.trim())return;commit({...store,scenarios:store.scenarios.map(s=>s.id===selected.id?{...s,name:name.trim()}:s)});},
  };
}
