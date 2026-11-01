import type { ValuationOverrides } from '../../../types/finance';

/**
 * Pure helpers for user-editable valuation assumptions (percent units, as stored).
 * Guidance ranges are ILLUSTRATIVE rules of thumb for orientation — not market data and not advice.
 */

export type NumericAssumptionKey = Exclude<
  keyof ValuationOverrides,
  'waccMode' | 'terminalValueMethod' | 'valuationDate' | 'cashFlowTiming'
>;

export interface AssumptionGuide {
  label: string;
  term: string;
  help: string;
  unit: '%' | 'x' | 'M';
  /** Illustrative "typical" band; values outside get a soft review note, never a block. */
  typical?: { min: number; max: number };
  /** Hard limits: values outside are rejected on input. */
  limits: { min: number; max: number };
}

export const ASSUMPTION_GUIDE: Record<NumericAssumptionKey, AssumptionGuide> = {
  riskFreeRate: {
    label: 'Return on a safe investment',
    term: 'Risk-free rate',
    help: 'Yield on long-term government bonds in the currency you are valuing in.',
    unit: '%',
    typical: { min: 0, max: 8 },
    limits: { min: -5, max: 50 },
  },
  equityBeta: {
    label: 'How much the share price swings with the market',
    term: 'Equity beta',
    help: '1.0 moves with the market; above 1 is more volatile, below 1 is steadier.',
    unit: 'x',
    typical: { min: 0.5, max: 2 },
    limits: { min: -2, max: 5 },
  },
  equityRiskPremium: {
    label: 'Extra return investors want for owning shares',
    term: 'Equity risk premium',
    help: 'The return shares are expected to earn above the safe rate, on average.',
    unit: '%',
    typical: { min: 3, max: 8 },
    limits: { min: 0, max: 50 },
  },
  preTaxCostOfDebt: {
    label: 'Interest rate the company pays on new borrowing',
    term: 'Pre-tax cost of debt',
    help: 'Use the rate the company could borrow at today, not old fixed-rate loans.',
    unit: '%',
    typical: { min: 2, max: 12 },
    limits: { min: 0, max: 100 },
  },
  targetDebtRatio: {
    label: 'Share of funding from debt',
    term: 'Target debt / capital',
    help: 'Long-run mix of debt and equity funding, at market values.',
    unit: '%',
    typical: { min: 0, max: 60 },
    limits: { min: 0, max: 100 },
  },
  directWacc: {
    label: 'Required return (enter directly)',
    term: 'WACC',
    help: 'Use when you already have a discount rate, for example from an approved policy.',
    unit: '%',
    typical: { min: 6, max: 14 },
    limits: { min: 0.01, max: 100 },
  },
  terminalGrowthRate: {
    label: 'Growth per year after the forecast, forever',
    term: 'Terminal growth (g)',
    help: 'Most businesses cannot outgrow the economy forever; long-run inflation plus real growth is a common ceiling.',
    unit: '%',
    typical: { min: 0, max: 3 },
    limits: { min: -10, max: 20 },
  },
  exitMultiple: {
    label: 'Sale price as a multiple of final-year EBITDA',
    term: 'Exit EV / EBITDA',
    help: 'What a buyer might pay at the end of the forecast, compared with that year’s operating earnings.',
    unit: 'x',
    typical: { min: 4, max: 15 },
    limits: { min: 0.1, max: 100 },
  },
  leaseLiabilities: {
    label: 'Lease liabilities',
    term: 'Lease liabilities (IFRS 16 / ASC 842)',
    help: 'Present value of lease payments owed. Leave blank if not known — it will be flagged, not assumed.',
    unit: 'M',
    limits: { min: 0, max: 1e9 },
  },
  minorityInterest: {
    label: 'Share of subsidiaries owned by others',
    term: 'Minority (non-controlling) interest',
    help: 'Value of subsidiaries owned by outside shareholders.',
    unit: 'M',
    limits: { min: 0, max: 1e9 },
  },
  preferredEquity: {
    label: 'Preferred shares',
    term: 'Preferred equity',
    help: 'Claims that rank ahead of ordinary shareholders.',
    unit: 'M',
    limits: { min: 0, max: 1e9 },
  },
  nonOperatingInvestments: {
    label: 'Investments not used in the business',
    term: 'Non-operating assets',
    help: 'For example stakes in other companies or surplus property, at current value.',
    unit: 'M',
    limits: { min: 0, max: 1e9 },
  },
};

export interface AssumptionReviewNote {
  key: NumericAssumptionKey;
  message: string;
}

/** Soft review notes for values outside the illustrative typical band. Never changes values. */
export function reviewAssumptions(values: Partial<Record<NumericAssumptionKey, number>>): AssumptionReviewNote[] {
  const notes: AssumptionReviewNote[] = [];
  for (const [key, value] of Object.entries(values) as [NumericAssumptionKey, number | undefined][]) {
    const guide = ASSUMPTION_GUIDE[key];
    if (value === undefined || !Number.isFinite(value) || !guide?.typical) continue;
    if (value < guide.typical.min || value > guide.typical.max) {
      notes.push({
        key,
        message: `${guide.term} of ${value}${guide.unit === 'M' ? 'M' : guide.unit} is outside the illustrative range of ${guide.typical.min}–${guide.typical.max}${guide.unit}. Check the source.`,
      });
    }
  }
  return notes;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Accepts only well-formed fields from untrusted storage. Unknown keys and out-of-limit numbers are
 * dropped (falling back to model defaults) rather than coerced.
 */
export function sanitizeValuationAssumptions(raw: unknown): ValuationOverrides {
  if (!raw || typeof raw !== 'object') return {};
  const src = raw as Record<string, unknown>;
  const out: ValuationOverrides = {};
  for (const key of Object.keys(ASSUMPTION_GUIDE) as NumericAssumptionKey[]) {
    const v = src[key];
    const { min, max } = ASSUMPTION_GUIDE[key].limits;
    if (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max) out[key] = v;
  }
  if (src.waccMode === 'build_up' || src.waccMode === 'direct') out.waccMode = src.waccMode;
  if (src.terminalValueMethod === 'gordon_growth' || src.terminalValueMethod === 'exit_multiple') out.terminalValueMethod = src.terminalValueMethod;
  if (src.cashFlowTiming === 'mid_year' || src.cashFlowTiming === 'end_of_year') out.cashFlowTiming = src.cashFlowTiming;
  if (typeof src.valuationDate === 'string' && ISO_DATE.test(src.valuationDate)) out.valuationDate = src.valuationDate;
  return out;
}

/** Applies a patch; keys set to undefined are removed so the model default applies again. */
export function applyAssumptionPatch(current: ValuationOverrides, patch: Partial<ValuationOverrides>): ValuationOverrides {
  const next: Record<string, unknown> = { ...current };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete next[k];
    else next[k] = v;
  }
  return sanitizeValuationAssumptions(next);
}
