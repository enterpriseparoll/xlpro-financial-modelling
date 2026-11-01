/**
 * Equity DCF (FCFF) domain contracts — industrial / non-financial companies only.
 * Banks and insurers are valued by `features/bank-valuation` (residual income).
 *
 * Unit conventions (enforced throughout the engine):
 * - Rates, weights and growth are DECIMALS (0.085 = 8.5%). Convert to percent only at the UI boundary.
 * - Money is in one declared unit per run (`DcfInputs.moneyUnit`), e.g. millions of the reporting currency.
 * - Share counts are in the same scale as money, so equity value / shares = value per share
 *   (e.g. money in millions and shares in millions).
 */

export type CashFlowTiming = 'mid_year' | 'end_of_year';

export interface DcfPeriodInput {
  label: string;
  year: number;
  ebit: number;
  depreciationAmortization: number;
  /** Positive number = cash spent. */
  capex: number;
  /** Increase in net working capital (positive = cash absorbed). */
  deltaNwc: number;
  /** Required only for the exit-multiple terminal method (final period). */
  ebitda?: number;
  /**
   * Share of this period's full-year cash flow still to be received after the valuation date, in (0, 1].
   * Defaults to 1. Use `yearFractionRemaining` to derive a first-period stub.
   */
  yearFraction?: number;
}

export type WaccInput =
  | { mode: 'direct'; wacc: number }
  | {
      mode: 'target_weights';
      riskFreeRate: number;
      equityBeta: number;
      equityRiskPremium: number;
      preTaxCostOfDebt: number;
      taxRate: number;
      /** D / (D + E), in [0, 1]. */
      targetDebtWeight: number;
    }
  | {
      mode: 'market_weights';
      riskFreeRate: number;
      equityBeta: number;
      equityRiskPremium: number;
      preTaxCostOfDebt: number;
      taxRate: number;
      marketValueEquity: number;
      marketValueDebt: number;
    };

export type TerminalValueInput =
  | { method: 'gordon_growth'; growthRate: number }
  | { method: 'exit_multiple'; evToEbitda: number };

/**
 * EV-to-equity bridge items at the valuation date. Leave an item undefined when it is not known —
 * the engine reports it as "not provided" rather than assuming zero silently.
 */
export interface BridgeInput {
  cash?: number;
  debt?: number;
  leaseLiabilities?: number;
  minorityInterest?: number;
  preferredEquity?: number;
  nonOperatingInvestments?: number;
  dilutedShares?: number;
}

export interface DcfInputs {
  periods: DcfPeriodInput[];
  /** Cash tax rate applied to positive EBIT (no credit for losses). */
  taxRate: number;
  wacc: WaccInput;
  terminal: TerminalValueInput;
  timing: CashFlowTiming;
  bridge: BridgeInput;
  marketPrice?: number;
  moneyUnit?: string;
}

export interface WaccResult {
  mode: WaccInput['mode'];
  wacc: number;
  costOfEquity?: number;
  afterTaxCostOfDebt?: number;
  debtWeight?: number;
  equityWeight?: number;
}

export interface DcfRow {
  label: string;
  year: number;
  ebit: number;
  taxOnEbit: number;
  nopat: number;
  depreciationAmortization: number;
  capex: number;
  deltaNwc: number;
  /** Full-year unlevered free cash flow. */
  fcff: number;
  yearFraction: number;
  /** fcff × yearFraction — the portion received after the valuation date. */
  fcffInPeriod: number;
  discountPeriod: number;
  discountFactor: number;
  presentValue: number;
}

export interface TerminalValueResult {
  method: TerminalValueInput['method'];
  growthRate?: number;
  evToEbitda?: number;
  /** Gordon only: final full-year FCFF × (1 + g). */
  terminalFcff?: number;
  value: number;
  discountPeriod: number;
  discountFactor: number;
  presentValue: number;
}

export type BridgeItemKey = Exclude<keyof BridgeInput, 'dilutedShares'>;

export interface BridgeResult {
  enterpriseValue: number;
  cash: number;
  nonOperatingInvestments: number;
  debt: number;
  leaseLiabilities: number;
  minorityInterest: number;
  preferredEquity: number;
  netDebt: number;
  equityValue: number;
  notProvided: BridgeItemKey[];
}

export type DcfCheckStatus = 'pass' | 'warning' | 'fail';

export interface DcfCheck {
  id: string;
  status: DcfCheckStatus;
  title: string;
  detail: string;
}

export interface DcfResult {
  engineVersion: string;
  moneyUnit?: string;
  timing: CashFlowTiming;
  wacc: WaccResult;
  rows: DcfRow[];
  sumPvFcff: number;
  terminal: TerminalValueResult;
  enterpriseValue: number;
  bridge: BridgeResult;
  dilutedShares: number | null;
  valuePerShare: number | null;
  marketPrice: number | null;
  upside: number | null;
  terminalShareOfEv: number;
  checks: DcfCheck[];
}

export type SensitivitySecondAxis = 'terminal_growth' | 'exit_multiple';

export interface DcfSensitivity {
  metric: 'value_per_share' | 'equity_value';
  waccValues: number[];
  secondAxis: SensitivitySecondAxis;
  secondAxisValues: number[];
  /** [waccIndex][secondAxisIndex]; null where inputs are invalid (e.g. growth ≥ WACC). */
  cells: (number | null)[][];
}
