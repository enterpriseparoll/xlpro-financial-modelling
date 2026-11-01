import { calculateBankForecast, type ForecastSettings, type ForecastRow, type BankBaseline } from '@/engine/bankForecast';
export type BankScenario = 'base' | 'bull' | 'bear';
export type ScenarioAdjustment = { incomeDelta: number; expenseDelta: number; impairmentDelta: number };
export const scenarioDefaults: Record<BankScenario,ScenarioAdjustment> = {
  base: { incomeDelta: 0, expenseDelta: 0, impairmentDelta: 0 },
  bull: { incomeDelta: 3, expenseDelta: -2, impairmentDelta: -2 },
  bear: { incomeDelta: -3, expenseDelta: 3, impairmentDelta: 5 },
};
export function runBankScenario(base: BankBaseline, settings: ForecastSettings, adjustment: ScenarioAdjustment): ForecastRow[] {
  const adjusted: ForecastSettings = {
    ...settings,
    constant: { ...settings.constant, interestGrowth: settings.constant.interestGrowth + adjustment.incomeDelta, feeGrowth: settings.constant.feeGrowth + adjustment.incomeDelta, otherGrowth: settings.constant.otherGrowth + adjustment.incomeDelta, expenseGrowth: settings.constant.expenseGrowth + adjustment.expenseDelta, impairmentGrowth: settings.constant.impairmentGrowth + adjustment.impairmentDelta },
    yearly: settings.yearly.map(row => ({ ...row, interestGrowth: row.interestGrowth + adjustment.incomeDelta, feeGrowth: row.feeGrowth + adjustment.incomeDelta, otherGrowth: row.otherGrowth + adjustment.incomeDelta, expenseGrowth: row.expenseGrowth + adjustment.expenseDelta, impairmentGrowth: row.impairmentGrowth + adjustment.impairmentDelta })),
    drivers: settings.drivers.map(row => ({ ...row, loanGrowth: row.loanGrowth + adjustment.incomeDelta, feeGrowth: row.feeGrowth + adjustment.incomeDelta, otherGrowth: row.otherGrowth + adjustment.incomeDelta, expenseGrowth: row.expenseGrowth + adjustment.expenseDelta, impairmentRate: Math.max(0,row.impairmentRate + adjustment.impairmentDelta / 10) })),
  };
  return calculateBankForecast(base,adjusted);
}
