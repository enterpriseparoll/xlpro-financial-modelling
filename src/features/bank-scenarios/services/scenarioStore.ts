import { defaultSettings, normalizeSettings, type ForecastSettings } from '@/engine/bankForecast';
export type SavedBankScenario = { id: string; name: string; settings: ForecastSettings };
export type BankScenarioStore = { selectedId: string; scenarios: SavedBankScenario[] };
const key = (companyId: string) => 'xlpro:bank-scenario-library:v1:' + companyId;
const legacyKey = (companyId: string) => 'xlpro:bank-forecast-settings:v2:' + companyId;
export const bankScenarioEvent = 'xlpro:bank-scenario-changed';
export function readBankScenarioStore(companyId: string): BankScenarioStore {
  let legacy = defaultSettings();
  try { legacy = normalizeSettings(JSON.parse(localStorage.getItem(legacyKey(companyId)) || 'null')); } catch { /* defaults */ }
  const initial: BankScenarioStore = { selectedId: 'base', scenarios: [{ id: 'base', name: 'Base Case', settings: legacy }] };
  try {
    const saved = JSON.parse(localStorage.getItem(key(companyId)) || 'null') as BankScenarioStore | null;
    if (!saved?.scenarios?.length) return initial;
    const scenarios = saved.scenarios.filter(s => s && typeof s.id === 'string' && typeof s.name === 'string').map(s => ({ ...s, settings: normalizeSettings(s.settings) }));
    if (!scenarios.length) return initial;
    return { scenarios, selectedId: scenarios.some(s => s.id === saved.selectedId) ? saved.selectedId : scenarios[0].id };
  } catch { return initial; }
}
export function saveBankScenarioStore(companyId: string, store: BankScenarioStore): void {
  localStorage.setItem(key(companyId), JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(bankScenarioEvent, { detail: { companyId } }));
}
export function selectedBankScenario(store: BankScenarioStore): SavedBankScenario {
  return store.scenarios.find(s => s.id === store.selectedId) || store.scenarios[0];
}
export function selectBankScenario(companyId: string, scenarioId: string): void {
  const store = readBankScenarioStore(companyId);
  if (!store.scenarios.some(s => s.id === scenarioId)) return;
  saveBankScenarioStore(companyId, { ...store, selectedId: scenarioId });
}
export function duplicateBankScenario(companyId: string, sourceId: string, name: string): SavedBankScenario {
  const store = readBankScenarioStore(companyId);
  const source = store.scenarios.find(s => s.id === sourceId) || store.scenarios[0];
  const newScenario = { id: 'scenario-' + Date.now() + '-' + Math.random().toString(36).slice(2,7), name: name.trim(), settings: structuredClone(source.settings) };
  saveBankScenarioStore(companyId, { selectedId: newScenario.id, scenarios: [...store.scenarios,newScenario] });
  return newScenario;
}
