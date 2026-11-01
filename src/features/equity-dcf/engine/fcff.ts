import type { CashFlowTiming, DcfPeriodInput, DcfRow } from '../types';
import { DcfInputError, requireFinite } from './errors';

/**
 * FCFF = EBIT − tax on positive EBIT + D&A − CapEx − ΔNWC, discounted at WACC.
 *
 * Discount timing, with T = time elapsed (years) before the period and f = its year fraction:
 * - mid_year:    T + f / 2
 * - end_of_year: T + f
 */
export function buildFcffSchedule(
  periods: DcfPeriodInput[],
  taxRate: number,
  wacc: number,
  timing: CashFlowTiming,
): DcfRow[] {
  if (!periods.length) throw new DcfInputError('At least one forecast period is required.');
  let elapsed = 0;

  return periods.map((p, i) => {
    const where = `${p.label || `Period ${i + 1}`}`;
    for (const key of ['ebit', 'depreciationAmortization', 'capex', 'deltaNwc'] as const) {
      requireFinite(p[key], `${where} ${key}`);
    }
    const yearFraction = p.yearFraction ?? 1;
    if (!(yearFraction > 0 && yearFraction <= 1)) {
      throw new DcfInputError(`${where} year fraction must be greater than 0 and at most 1.`);
    }
    if (i > 0 && yearFraction !== 1) {
      throw new DcfInputError('Only the first forecast period may be a partial (stub) year.');
    }

    const taxOnEbit = Math.max(0, p.ebit) * taxRate;
    const nopat = p.ebit - taxOnEbit;
    const fcff = nopat + p.depreciationAmortization - p.capex - p.deltaNwc;
    const fcffInPeriod = fcff * yearFraction;
    const discountPeriod = timing === 'mid_year' ? elapsed + yearFraction / 2 : elapsed + yearFraction;
    const discountFactor = 1 / Math.pow(1 + wacc, discountPeriod);
    elapsed += yearFraction;

    return {
      label: p.label,
      year: p.year,
      ebit: p.ebit,
      taxOnEbit,
      nopat,
      depreciationAmortization: p.depreciationAmortization,
      capex: p.capex,
      deltaNwc: p.deltaNwc,
      fcff,
      yearFraction,
      fcffInPeriod,
      discountPeriod,
      discountFactor,
      presentValue: fcffInPeriod * discountFactor,
    };
  });
}

/** Total years from the valuation date to the end of the final period. */
export function horizonYears(rows: DcfRow[]): number {
  return rows.reduce((sum, r) => sum + r.yearFraction, 0);
}
