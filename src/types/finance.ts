/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SectorId = 
  | 'saas' 
  | 'manufacturing' 
  | 'healthcare' 
  | 'hospitality' 
  | 'retail' 
  | 'real_estate' 
  | 'banking'
  | 'general';

export type PersonaMode = 'guided' | 'professional' | 'advanced' | 'reviewer';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'CAD' | 'AUD' | 'CHF' | 'GHS';

export type AccountingBasis = 'IFRS' | 'US_GAAP';

export type FiscalYearEnd = '12-31' | '03-31' | '06-30' | '09-30';

export type PeriodType = 'historical' | 'forecast';

export interface Company {
  id: string;
  name: string;
  ticker?: string;
  isListed: boolean;
  sectorId: SectorId;
  currency: CurrencyCode;
  currencySymbol: string;
  domicile: string;
  fiscalYearEnd: FiscalYearEnd;
  accountingBasis: AccountingBasis;
  shareCount: number; // Millions of shares
  currentSharePrice?: number; // In reporting currency
  description: string;
}

export interface DriverDefinition {
  id: string;
  name: string;
  category: 'revenue' | 'cogs' | 'opex' | 'working_capital' | 'capex' | 'debt_tax' | 'valuation';
  unit: '%' | '$' | 'count' | 'days' | 'multiple' | 'ratio';
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  baselineDescription: string;
  formulaDescription: string;
  isAdvanced?: boolean;
}

export interface SectorBlueprint {
  id: SectorId;
  name: string;
  tagline: string;
  description: string;
  typicalOperatingDrivers: string[];
  keyDistinction: string;
  drivers: DriverDefinition[];
  allowedValuationMethods: ('dcf_fcff' | 'trading_comps' | 'nav' | 'dividend_discount')[];
  samplePeers: { ticker: string; name: string; evSales: number; evEbitda: number; pe: number }[];
}

export type ScenarioId = 'base' | 'bull' | 'bear' | 'custom';

export interface Scenario {
  id: ScenarioId;
  name: string;
  description: string;
  badgeColor: string;
  driverOverrides: Record<string, number>;
}

export interface ModelPeriod {
  year: number;
  periodLabel: string;
  type: PeriodType;
}

export interface IncomeStatementRow {
  period: ModelPeriod;
  revenue: number;
  revenueGrowthPct: number;
  cogs: number;
  grossProfit: number;
  grossMarginPct: number;
  salesMarketing: number;
  researchDevelopment: number;
  generalAdmin: number;
  totalOpex: number;
  ebitda: number;
  ebitdaMarginPct: number;
  depreciationAmortization: number;
  ebit: number; // Operating income
  interestExpense: number;
  interestIncome: number;
  ebt: number; // Earnings before tax
  taxExpense: number;
  effectiveTaxRatePct: number;
  netIncome: number;
  netMarginPct: number;
}

export interface BalanceSheetRow {
  period: ModelPeriod;
  // Current Assets
  cashAndEquivalents: number;
  accountsReceivable: number;
  inventory: number;
  otherCurrentAssets: number;
  totalCurrentAssets: number;
  // Non-Current Assets
  grossPPE: number;
  accumulatedDepreciation: number;
  netPPE: number;
  intangiblesAndOther: number;
  totalNonCurrentAssets: number;
  totalAssets: number;
  // Current Liabilities
  accountsPayable: number;
  accruedExpenses: number;
  shortTermDebt: number;
  totalCurrentLiabilities: number;
  // Non-Current Liabilities
  longTermDebt: number;
  totalLiabilities: number;
  // Equity
  commonStock: number;
  retainedEarnings: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  balanceDelta: number; // Strict 0.00 check
}

export interface CashFlowStatementRow {
  period: ModelPeriod;
  // Operating Activities
  netIncome: number;
  depreciationAmortization: number;
  deltaAccountsReceivable: number;
  deltaInventory: number;
  deltaAccountsPayable: number;
  deltaAccruedExpenses: number;
  cashFromOperations: number;
  // Investing Activities
  capex: number; // outflow (negative)
  cashFromInvesting: number;
  // Financing Activities
  debtIssued: number;
  debtRepaid: number;
  equityIssued: number;
  dividendsPaid: number;
  cashFromFinancing: number;
  // Reconciliation
  netChangeInCash: number;
  beginningCash: number;
  endingCash: number;
}

export interface WorkingCapitalScheduleRow {
  period: ModelPeriod;
  dso: number; // Days Sales Outstanding
  dio: number; // Days Inventory Outstanding
  dpo: number; // Days Payables Outstanding
  accountsReceivable: number;
  inventory: number;
  accountsPayable: number;
  netWorkingCapital: number;
  deltaNWC: number;
}

export interface DebtScheduleRow {
  period: ModelPeriod;
  beginningDebt: number;
  newBorrowings: number;
  repayments: number;
  cashSweeps: number;
  endingDebt: number;
  averageDebt: number;
  interestRatePct: number;
  interestExpense: number;
}

export interface CapexScheduleRow {
  period: ModelPeriod;
  beginningNetPPE: number;
  capex: number;
  depreciation: number;
  endingNetPPE: number;
}

export interface FCFRow {
  period: ModelPeriod;
  ebit: number;
  taxOnEbit: number;
  nopat: number;
  depreciationAmortization: number;
  capex: number;
  deltaNWC: number;
  fcff: number;
  discountPeriod: number;
  discountFactor: number;
  pvFCFF: number;
}

export interface WaccInputs {
  riskFreeRate: number; // %
  equityBeta: number;
  equityRiskPremium: number; // %
  costOfEquity: number; // %
  preTaxCostOfDebt: number; // %
  taxRate: number; // %
  afterTaxCostOfDebt: number; // %
  targetDebtRatio: number; // %
  targetEquityRatio: number; // %
  wacc: number; // %
}

/**
 * User-editable valuation assumptions for the industrial FCFF DCF, scoped per company and scenario.
 * Rates are in percent. Undefined means "use the model default" (bridge items: "not provided").
 */
export interface ValuationOverrides {
  waccMode?: 'build_up' | 'direct';
  /** Used only when waccMode is 'direct'. */
  directWacc?: number;
  riskFreeRate?: number;
  equityBeta?: number;
  equityRiskPremium?: number;
  preTaxCostOfDebt?: number;
  targetDebtRatio?: number;
  terminalGrowthRate?: number;
  terminalValueMethod?: 'gordon_growth' | 'exit_multiple';
  exitMultiple?: number;
  /** YYYY-MM-DD. When set, the first forecast year is a partial (stub) period. */
  valuationDate?: string;
  cashFlowTiming?: 'mid_year' | 'end_of_year';
  leaseLiabilities?: number;
  minorityInterest?: number;
  preferredEquity?: number;
  nonOperatingInvestments?: number;
}

export interface ValuationOutput {
  waccInputs: WaccInputs;
  fcffSchedule: FCFRow[];
  sumPvFCFF: number;
  terminalValueMethod: 'gordon_growth' | 'exit_multiple';
  terminalGrowthRatePct: number;
  exitMultipleEVtoEBITDA: number;
  terminalFCFF: number;
  terminalValueUndiscounted: number;
  pvOfTerminalValue: number;
  enterpriseValue: number;
  balanceSheetCash: number;
  balanceSheetDebt: number;
  netDebt: number;
  impliedEquityValue: number;
  shareCount: number;
  /** null when the share count is not set — never an assumed count. */
  impliedSharePrice: number | null;
  currentSharePrice?: number;
  upsideDownsidePct?: number;
  /** 'invalid' when inputs cannot produce a finite value; numeric outputs are then NaN. */
  dcfStatus: 'valid' | 'invalid';
  /** Full EV-to-equity bridge; `notProvided` lists items the user has not entered. */
  bridge: {
    cash: number;
    nonOperatingInvestments: number;
    debt: number;
    leaseLiabilities: number;
    minorityInterest: number;
    preferredEquity: number;
    notProvided: string[];
  } | null;
  /** PV of terminal value / EV, as a decimal; NaN when EV is not positive or the valuation is invalid. */
  terminalShareOfEv: number;
  /** Fraction of the first forecast year still to come (1 = full year). */
  firstPeriodFraction: number;
  valuationDate?: string;
  cashFlowTiming: 'mid_year' | 'end_of_year';
  dcfErrors: string[];
  dcfChecks: { id: string; status: 'pass' | 'warning' | 'fail'; title: string; detail: string }[];
  engineVersion: string;
  sensitivityMatrix: {
    metric: 'value_per_share' | 'equity_value';
    waccValues: number[];
    /** Terminal growth (%) — or exit multiples (x) when secondAxis is 'exit_multiple'. */
    growthValues: number[];
    secondAxis?: 'terminal_growth' | 'exit_multiple';
    matrix: (number | null)[][]; // [waccIndex][growthIndex]; null where inputs are invalid
  };
}

export interface ValidationCheck {
  id: string;
  category: 'balance_sheet' | 'cash_reconciliation' | 'debt_roll' | 'working_capital' | 'operating_bounds' | 'valuation';
  title: string;
  description: string;
  status: 'pass' | 'warning' | 'fail';
  detail: string;
  metricValue?: string | number;
}

export interface ValidationReport {
  isValid: boolean;
  passedCount: number;
  warningCount: number;
  errorCount: number;
  overallStatus: 'Validated & Reconciled' | 'Warnings Detected' | 'Blocking Error';
  checks: ValidationCheck[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  author: string;
  driverId: string;
  driverName: string;
  oldValue: number;
  newValue: number;
  unit: string;
  reason: string;
  affectedSections: string[];
}

export interface ModelCalculationRun {
  runId: string;
  timestamp: string;
  companyId: string;
  scenarioId: ScenarioId;
  version: string;
  periods: ModelPeriod[];
  incomeStatements: IncomeStatementRow[];
  balanceSheets: BalanceSheetRow[];
  cashFlowStatements: CashFlowStatementRow[];
  workingCapitalSchedule: WorkingCapitalScheduleRow[];
  debtSchedule: DebtScheduleRow[];
  capexSchedule: CapexScheduleRow[];
  valuation: ValuationOutput;
  validation: ValidationReport;
  explanations: {
    revenueDriverNarrative: string;
    marginEvolutionNarrative: string;
    cashRunwayNarrative: string;
    valuationBridgeNarrative: string;
    keyRisks: string[];
  };
  governance: ModelGovernance;
  tornadoSensitivities: TornadoSensitivityItem[];
}

export type ModelLifecycleState = 'draft' | 'calculated' | 'ready_for_review' | 'approved' | 'published';

export interface ModelGovernance {
  state: ModelLifecycleState;
  modelVersion: string;
  submittedBy?: string;
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  approvalNotes?: string;
  isLocked: boolean;
}

export interface TornadoSensitivityItem {
  driverId: string;
  driverName: string;
  category: string;
  baseValue: number;
  unit: string;
  downsideValue: number;
  upsideValue: number;
  downsideImpliedEV: number;
  upsideImpliedEV: number;
  evSwing: number; // upsideImpliedEV - downsideImpliedEV
}

export interface Shareholder {
  id: string;
  name: string;
  shareClass: 'Founders Common' | 'Seed Preferred' | 'Series A Preferred' | 'Series B Preferred' | 'Option Pool / ESOP';
  sharesCount: number; // In millions
  investmentAmount: number; // In millions
  ownershipPct: number; // Calculated %
  liquidationPrefMultiple: number; // e.g. 1.0x
  isParticipating: boolean;
}

export interface CapTableData {
  companyId: string;
  shareholders: Shareholder[];
  totalShares: number;
  totalInvested: number;
  postMoneyValuation: number;
}

export interface ExitScenarioAnalysis {
  exitYear: number;
  exitValuation: number;
  holdingPeriodYears: number;
  totalProceeds: number;
  shareholderReturns: Array<{
    shareholderId: string;
    name: string;
    shareClass: string;
    investedAmount: number;
    proceeds: number;
    moic: number;
    irrPct: number;
  }>;
}

export interface CellTraceDetail {
  lineItemKey: string;
  lineItemName: string;
  statement: 'Income Statement' | 'Balance Sheet' | 'Cash Flow Statement';
  periodLabel: string;
  periodYear: number;
  calculatedValue: number;
  unit: string;
  formula: string;
  directDrivers: Array<{ name: string; value: string | number; source: string }>;
  economicRationale: string;
}

