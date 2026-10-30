export interface BankValuationInputs {
  bookValuePerShare: number;
  costOfEquityPct: number;
  perpetualGrowthPct: number;
  sustainableRoePct: number;
  nextDividendPerShare: number;
  peerPriceToBook?: number;
  sharesOutstanding?: number;
}
const finite = (values: number[]) => values.every(Number.isFinite);
export function bankValuation(input: BankValuationInputs) {
  const { bookValuePerShare: bv, costOfEquityPct: kePct, perpetualGrowthPct: gPct, sustainableRoePct: roePct, nextDividendPerShare: dividend, peerPriceToBook: peer } = input;
  if (!finite([bv, kePct, gPct, roePct, dividend]) || bv <= 0 || kePct <= gPct || kePct <= 0 || gPct < 0 || dividend < 0) {
    throw new Error('Enter positive book value, valid growth, nonnegative dividends and cost of equity above growth.');
  }
  const ke = kePct / 100, g = gPct / 100, roe = roePct / 100;
  const ddm = dividend / (ke - g);
  // Steady-state residual income: BV0 + (ROE - Ke) * BV0 / (Ke - g).
  // Requires ROE, book value and growth to be sustainable in perpetuity.
  const residualIncome = bv + (roe - ke) * bv / (ke - g);
  const pb = peer !== undefined && Number.isFinite(peer) && peer > 0 ? bv * peer : undefined;
  return {
    ddmPerShare: ddm,
    residualIncomePerShare: residualIncome,
    priceToBookPerShare: pb,
    justifiedPriceToBook: (roe - g) / (ke - g),
    impliedEquityValue: input.sharesOutstanding && input.sharesOutstanding > 0 ? residualIncome * input.sharesOutstanding : undefined,
    assumptions: input,
  };
}
