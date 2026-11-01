import type { WaccInput, WaccResult } from '../types';
import { DcfInputError, requireFinite, requireRange } from './errors';

/** The single WACC implementation. CAPM cost of equity; after-tax cost of debt. */
export function calculateWacc(input: WaccInput): WaccResult {
  if (input.mode === 'direct') {
    requireRange(input.wacc, 'WACC', 0.0001, 1);
    return { mode: 'direct', wacc: input.wacc };
  }

  requireRange(input.riskFreeRate, 'Risk-free rate', -0.05, 0.5);
  requireFinite(input.equityBeta, 'Equity beta');
  requireRange(input.equityRiskPremium, 'Equity risk premium', 0, 0.5);
  requireRange(input.preTaxCostOfDebt, 'Pre-tax cost of debt', 0, 1);
  requireRange(input.taxRate, 'Tax rate', 0, 1);

  let debtWeight: number;
  if (input.mode === 'target_weights') {
    debtWeight = requireRange(input.targetDebtWeight, 'Target debt weight', 0, 1);
  } else {
    requireRange(input.marketValueEquity, 'Market value of equity', 0, Number.MAX_VALUE);
    requireRange(input.marketValueDebt, 'Market value of debt', 0, Number.MAX_VALUE);
    const capital = input.marketValueEquity + input.marketValueDebt;
    if (capital <= 0) throw new DcfInputError('Market values of equity and debt cannot both be zero.');
    debtWeight = input.marketValueDebt / capital;
  }

  const equityWeight = 1 - debtWeight;
  const costOfEquity = input.riskFreeRate + input.equityBeta * input.equityRiskPremium;
  const afterTaxCostOfDebt = input.preTaxCostOfDebt * (1 - input.taxRate);
  const wacc = equityWeight * costOfEquity + debtWeight * afterTaxCostOfDebt;
  if (!(wacc > 0)) throw new DcfInputError('WACC must be greater than zero; check beta and rate inputs.');

  return { mode: input.mode, wacc, costOfEquity, afterTaxCostOfDebt, debtWeight, equityWeight };
}
