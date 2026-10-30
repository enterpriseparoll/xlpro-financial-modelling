import { readBankActivation } from '@/engine/bankHistoricalActivation';
import { calculateBankForecast, type BankBaseline, type ForecastSettings, type ForecastRow } from '@/engine/bankForecast';
import { readBankScenarioStore, selectedBankScenario } from './scenarioStore';
export type BankForecastSource = { baseline: BankBaseline; settings: ForecastSettings; rows: ForecastRow[]; sourceFile: string; sourceVersion: number; currency: string };
export function getBankForecastSource(companyId: string): { data: BankForecastSource | null; error: string } {
  const activated = readBankActivation(companyId);
  if (!activated?.periods?.length) return { data: null, error: 'Activate verified banking statements in Step 2.' };
  const latest = [...activated.periods].sort((a,b)=>b.year-a.year)[0];
  const get = (key: keyof typeof latest.accounts) => latest.accounts[key] === undefined ? undefined : latest.accounts[key]! / 1_000_000;
  const interest = get('net_interest_income'), fees = get('net_fee_income'), revenue = get('operating_income');
  const costs = get('total_operating_expenses'), provisions = get('total_impairment');
  if ([interest, fees, revenue, costs, provisions].some(v => v === undefined)) return { data: null, error: 'Bank history is missing required income statement lines. Review Step 2.' };
  const baseline: BankBaseline = { year: latest.year, interest: interest!, fees: fees!, other: revenue! - interest! - fees!, costs: costs!, provisions: provisions!, loans: get('loans_and_advances'), deposits: get('customer_deposits') };
  const settings = selectedBankScenario(readBankScenarioStore(companyId)).settings;
  try {
    return { data: { baseline, settings, rows: calculateBankForecast(baseline,settings), sourceFile: activated.fileName, sourceVersion: activated.version, currency: 'GHS' }, error: '' };
  } catch(error) { return { data: null, error: error instanceof Error ? error.message : 'Forecast could not be calculated' }; }
}
