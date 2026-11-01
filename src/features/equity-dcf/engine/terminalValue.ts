import type { CashFlowTiming, DcfPeriodInput, DcfRow, TerminalValueInput, TerminalValueResult } from '../types';
import { DcfInputError, requireFinite } from './errors';
import { horizonYears } from './fcff';

/**
 * Terminal value at the end of the explicit forecast (horizon H years from the valuation date).
 *
 * - Gordon growth: TV = FCFF_N × (1 + g) / (WACC − g). The formula values a stream whose first flow
 *   is one year after the valuation point; under mid-year timing those flows land at H + 0.5, H + 1.5 …
 *   so TV is discounted from H − 0.5. Under end-of-year timing it is discounted from H.
 * - Exit multiple: TV = EBITDA_N × multiple, a price observed at the end of year N, discounted from H.
 *
 * Growth ≥ WACC is rejected — never clamped — because the perpetuity has no finite value.
 */
export function calculateTerminalValue(
  input: TerminalValueInput,
  rows: DcfRow[],
  periods: DcfPeriodInput[],
  wacc: number,
  timing: CashFlowTiming,
): TerminalValueResult {
  const horizon = horizonYears(rows);
  const last = rows[rows.length - 1];

  if (input.method === 'gordon_growth') {
    const g = requireFinite(input.growthRate, 'Terminal growth rate');
    if (g >= wacc) {
      throw new DcfInputError(
        `Long-term growth (${(g * 100).toFixed(2)}%) must be below WACC (${(wacc * 100).toFixed(2)}%).`,
      );
    }
    const terminalFcff = last.fcff * (1 + g);
    const value = terminalFcff / (wacc - g);
    const discountPeriod = timing === 'mid_year' ? Math.max(0, horizon - 0.5) : horizon;
    const discountFactor = 1 / Math.pow(1 + wacc, discountPeriod);
    return { method: 'gordon_growth', growthRate: g, terminalFcff, value, discountPeriod, discountFactor, presentValue: value * discountFactor };
  }

  const multiple = requireFinite(input.evToEbitda, 'Exit multiple');
  if (multiple <= 0) throw new DcfInputError('Exit multiple must be greater than zero.');
  const ebitda = periods[periods.length - 1].ebitda;
  if (ebitda === undefined || !Number.isFinite(ebitda)) {
    throw new DcfInputError('Final-year EBITDA is required for the exit-multiple method.');
  }
  const value = ebitda * multiple;
  const discountFactor = 1 / Math.pow(1 + wacc, horizon);
  return { method: 'exit_multiple', evToEbitda: multiple, value, discountPeriod: horizon, discountFactor, presentValue: value * discountFactor };
}
