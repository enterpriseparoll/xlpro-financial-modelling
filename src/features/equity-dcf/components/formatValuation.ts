/** Display helpers for DCF outputs. Non-finite values (an invalid valuation) render as an em dash, never "NaN". */
export const NOT_AVAILABLE = '—';

export function formatMillions(sym: string, value: number | null | undefined, dp = 1): string {
  return value != null && Number.isFinite(value) ? `${sym}${value.toFixed(dp)}M` : NOT_AVAILABLE;
}

export function formatPerShare(sym: string, value: number | null | undefined): string {
  return value != null && Number.isFinite(value) ? `${sym}${value.toFixed(2)}` : NOT_AVAILABLE;
}

export function formatMultiple(numerator: number, denominator: number): string {
  const x = numerator / denominator;
  return Number.isFinite(x) && denominator > 0 ? `${x.toFixed(1)}x` : NOT_AVAILABLE;
}

/** Value per share, distinguishing an invalid valuation ("—") from a missing share count. */
export function formatImpliedSharePrice(
  sym: string,
  valuation: { dcfStatus: 'valid' | 'invalid'; impliedSharePrice: number | null },
): string {
  if (valuation.dcfStatus === 'invalid') return NOT_AVAILABLE;
  return valuation.impliedSharePrice === null ? 'Shares not set' : formatPerShare(sym, valuation.impliedSharePrice);
}
