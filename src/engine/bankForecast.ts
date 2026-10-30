export type BankForecastMode = 'constant' | 'yearly' | 'drivers';
export type GrowthKey = 'interestGrowth' | 'feeGrowth' | 'otherGrowth' | 'expenseGrowth' | 'impairmentGrowth' | 'taxRate';
export type GrowthInputs = Record<GrowthKey, number>;
export type BankDrivers = { loanGrowth: number; loanYield: number; depositGrowth: number; depositCost: number; feeGrowth: number; otherGrowth: number; expenseGrowth: number; impairmentRate: number; taxRate: number };
export type BankBaseline = { year: number; interest: number; fees: number; other: number; costs: number; provisions: number; loans?: number; deposits?: number };
export type ForecastRow = { year: number; interest: number; fees: number; revenue: number; costs: number; provisions: number; beforeTax: number; afterTax: number; loans?: number; deposits?: number };
export const growthDefaults: GrowthInputs = { interestGrowth: 5, feeGrowth: 5, otherGrowth: 3, expenseGrowth: 5, impairmentGrowth: 0, taxRate: 30 };
export const driverDefaults: BankDrivers = { loanGrowth: 8, loanYield: 15, depositGrowth: 7, depositCost: 5, feeGrowth: 5, otherGrowth: 3, expenseGrowth: 5, impairmentRate: 2, taxRate: 30 };
export const growthFields: { key: GrowthKey; label: string }[] = [
  { key: 'interestGrowth', label: 'Net interest income growth' }, { key: 'feeGrowth', label: 'Net fee income growth' },
  { key: 'otherGrowth', label: 'Other operating income growth' }, { key: 'expenseGrowth', label: 'Operating expense growth' },
  { key: 'impairmentGrowth', label: 'Impairment charge growth' }, { key: 'taxRate', label: 'Effective tax rate' },
];
export const driverFields: { key: keyof BankDrivers; label: string }[] = [
  { key: 'loanGrowth', label: 'Loan portfolio growth' }, { key: 'loanYield', label: 'Loan portfolio yield' },
  { key: 'depositGrowth', label: 'Deposit growth' }, { key: 'depositCost', label: 'Deposit funding cost' },
  { key: 'feeGrowth', label: 'Net fee income growth' }, { key: 'otherGrowth', label: 'Other operating income growth' },
  { key: 'expenseGrowth', label: 'Operating expense growth' }, { key: 'impairmentRate', label: 'Impairment charge / loans' },
  { key: 'taxRate', label: 'Effective tax rate' },
];
export type ForecastSettings = { mode: BankForecastMode; constant: GrowthInputs; yearly: GrowthInputs[]; drivers: BankDrivers[] };
export const defaultSettings = (): ForecastSettings => ({ mode: 'yearly', constant: { ...growthDefaults }, yearly: Array.from({ length: 5 }, () => ({ ...growthDefaults })), drivers: Array.from({ length: 5 }, () => ({ ...driverDefaults })) });
export function normalizeSettings(value: unknown): ForecastSettings {
  const defaults = defaultSettings();
  if (!value || typeof value !== 'object') return defaults;
  const v = value as Partial<ForecastSettings>;
  const mode: BankForecastMode = v.mode === 'constant' || v.mode === 'drivers' ? v.mode : 'yearly';
  return { mode, constant: { ...defaults.constant, ...v.constant }, yearly: defaults.yearly.map((row, i) => ({ ...row, ...v.yearly?.[i] })), drivers: defaults.drivers.map((row, i) => ({ ...row, ...v.drivers?.[i] })) };
}
export function calculateBankForecast(base: BankBaseline, settings: ForecastSettings): ForecastRow[] {
  let { interest, fees, other, costs, provisions, loans, deposits } = base;
  const output: ForecastRow[] = [];
  for (let i = 0; i < 5; i++) {
    const growth = settings.mode === 'constant' ? settings.constant : settings.yearly[i];
    if (settings.mode === 'drivers') {
      const d = settings.drivers[i];
      if (loans === undefined || deposits === undefined) throw new Error('Driver-based forecasting requires verified loans and customer deposits in the activated balance sheet.');
      const priorLoans = loans, priorDeposits = deposits;
      loans *= 1 + d.loanGrowth / 100;
      deposits *= 1 + d.depositGrowth / 100;
      interest = ((priorLoans + loans) / 2) * d.loanYield / 100 - ((priorDeposits + deposits) / 2) * d.depositCost / 100;
      fees *= 1 + d.feeGrowth / 100;
      other *= 1 + d.otherGrowth / 100;
      costs *= 1 + d.expenseGrowth / 100;
      provisions = -Math.abs(loans * d.impairmentRate / 100);
    } else {
      interest *= 1 + growth.interestGrowth / 100;
      fees *= 1 + growth.feeGrowth / 100;
      other *= 1 + growth.otherGrowth / 100;
      costs *= 1 + growth.expenseGrowth / 100;
      provisions *= 1 + growth.impairmentGrowth / 100;
    }
    const revenue = interest + fees + other;
    const beforeTax = revenue + costs + provisions;
    const taxRate = settings.mode === 'drivers' ? settings.drivers[i].taxRate : growth.taxRate;
    const afterTax = beforeTax - Math.max(0, beforeTax) * taxRate / 100;
    output.push({ year: base.year + i + 1, interest, fees, revenue, costs, provisions, beforeTax, afterTax, loans, deposits });
  }
  return output;
}
