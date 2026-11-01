import type { ValuationOutput, ValuationOverrides } from '../../../types/finance';

/** Deterministic JSON with sorted object keys, so equal inputs always hash identically. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

export const sameAssumptions = (a: ValuationOverrides, b: ValuationOverrides) => canonicalJson(a) === canonicalJson(b);

/** Everything that determines the valuation result, for the run's input hash. */
export interface RunInputs {
  assumptions: ValuationOverrides;
  driverOverrides: Record<string, number>;
  company: { shareCount: number; currentSharePrice?: number; currency: string; fiscalYearEnd: string };
  historicalSource: string;
}

const finiteOrNull = (v: number | null | undefined) => (v !== null && v !== undefined && Number.isFinite(v) ? v : null);

/** Outputs stored with each saved version. Invalid valuations are stored as such, with their reasons. */
export function buildRunOutputs(v: ValuationOutput) {
  return {
    status: v.dcfStatus,
    errors: v.dcfErrors,
    enterpriseValue: finiteOrNull(v.enterpriseValue),
    equityValue: finiteOrNull(v.impliedEquityValue),
    valuePerShare: finiteOrNull(v.impliedSharePrice),
    waccPct: finiteOrNull(v.waccInputs.wacc),
    terminalMethod: v.terminalValueMethod,
    terminalGrowthPct: v.terminalValueMethod === 'gordon_growth' ? finiteOrNull(v.terminalGrowthRatePct) : null,
    exitMultiple: v.terminalValueMethod === 'exit_multiple' ? finiteOrNull(v.exitMultipleEVtoEBITDA) : null,
    terminalShareOfEv: finiteOrNull(v.terminalShareOfEv),
    checks: v.dcfChecks.map((c) => ({ id: c.id, status: c.status })),
  };
}
