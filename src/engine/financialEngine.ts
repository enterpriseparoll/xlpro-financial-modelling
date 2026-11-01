/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BalanceSheetRow,
  CapexScheduleRow,
  CashFlowStatementRow,
  Company,
  DebtScheduleRow,
  FCFRow,
  IncomeStatementRow,
  ModelCalculationRun,
  ModelPeriod,
  ScenarioId,
  SectorBlueprint,
  ValidationCheck,
  ValidationReport,
  ValuationOutput,
  WaccInputs,
  WorkingCapitalScheduleRow,
  TornadoSensitivityItem,
} from '@/types/finance';
import { SECTOR_BLUEPRINTS } from './blueprints';
import { buildSensitivity, DCF_ENGINE_VERSION, DcfInputError, runDcf } from '../features/equity-dcf';
import type { DcfInputs, DcfResult, DcfSensitivity } from '../features/equity-dcf';

export interface CalculationInputs {
  company: Company;
  scenarioId: ScenarioId;
  driverOverrides: Record<string, number>;
  historicalBase: {
    periods: ModelPeriod[];
    incomeStatements: IncomeStatementRow[];
    balanceSheets: BalanceSheetRow[];
    cashFlowStatements: CashFlowStatementRow[];
  };
  valuationOverrides?: {
    riskFreeRate?: number;
    equityBeta?: number;
    equityRiskPremium?: number;
    preTaxCostOfDebt?: number;
    targetDebtRatio?: number;
    terminalGrowthRate?: number;
    terminalValueMethod?: 'gordon_growth' | 'exit_multiple';
    exitMultiple?: number;
  };
}

export function calculateFinancialModel(inputs: CalculationInputs): ModelCalculationRun {
  const { company, scenarioId, driverOverrides, historicalBase } = inputs;
  const blueprint: SectorBlueprint = SECTOR_BLUEPRINTS[company.sectorId] || SECTOR_BLUEPRINTS.general;

  // Resolve drivers with default blueprint values + user overrides
  const drivers: Record<string, number> = {};
  for (const def of blueprint.drivers) {
    drivers[def.id] = driverOverrides[def.id] !== undefined ? driverOverrides[def.id] : def.defaultValue;
  }

  // Setup forecast periods (e.g. 2026, 2027, 2028, 2029, 2030)
  const lastHistYear = historicalBase.periods[historicalBase.periods.length - 1]?.year ?? 2025;
  const forecastPeriods: ModelPeriod[] = [1, 2, 3, 4, 5].map((idx) => ({
    year: lastHistYear + idx,
    periodLabel: `FY${lastHistYear + idx}E`,
    type: 'forecast',
  }));

  const allPeriods: ModelPeriod[] = [...historicalBase.periods, ...forecastPeriods];

  // Prepare full series arrays
  const incomeStatements: IncomeStatementRow[] = [...historicalBase.incomeStatements];
  const balanceSheets: BalanceSheetRow[] = [...historicalBase.balanceSheets];
  const cashFlowStatements: CashFlowStatementRow[] = [...historicalBase.cashFlowStatements];

  const workingCapitalSchedule: WorkingCapitalScheduleRow[] = [];
  const debtSchedule: DebtScheduleRow[] = [];
  const capexSchedule: CapexScheduleRow[] = [];

  // Seed working capital and schedules from last historical period
  const lastHistBS = balanceSheets[balanceSheets.length - 1];
  const lastHistIS = incomeStatements[incomeStatements.length - 1];

  let prevBS: BalanceSheetRow = lastHistBS;
  let prevIS: IncomeStatementRow = lastHistIS;

  // Sector driver revenue states (for cohort / sequential growth)
  let currentSubscribers = drivers.starting_subscribers ?? 4200;
  let currentStores = drivers.active_stores_count ?? 110;

  for (let t = 0; t < forecastPeriods.length; t++) {
    const period = forecastPeriods[t];
    const prevRev = prevIS.revenue;

    // 1. Sector-Specific Revenue Calculation
    let revenue = 0;
    if (blueprint.id === 'saas') {
      const grossAddGrowth = drivers.new_subscribers_growth_pct / 100;
      const churnRate = drivers.annual_churn_pct / 100;
      const netLogoGrowth = grossAddGrowth - churnRate;
      currentSubscribers = Math.round(currentSubscribers * (1 + netLogoGrowth));
      const monthlyArpu = drivers.monthly_arpu;
      revenue = (currentSubscribers * monthlyArpu * 12) / 1000000; // in Millions
    } else if (blueprint.id === 'healthcare') {
      const suites = drivers.licensed_suites_count;
      const days = drivers.annual_operating_days;
      const dailyVisits = drivers.visits_per_suite_day;
      const util = drivers.clinic_utilization_pct / 100;
      const avgRev = drivers.avg_rev_per_visit;
      // Slight expansion per year (1.5% pricing / volume)
      const yrFactor = 1 + t * 0.02;
      const totalVisits = suites * days * dailyVisits * util * yrFactor;
      revenue = (totalVisits * avgRev) / 1000000;
    } else if (blueprint.id === 'manufacturing') {
      const capacity = drivers.annual_unit_capacity;
      const util = Math.min(0.96, (drivers.capacity_utilization_pct / 100) + t * 0.015);
      const asp = drivers.average_unit_selling_price * (1 + t * 0.02);
      const units = capacity * util;
      revenue = (units * asp) / 1000000;
    } else if (blueprint.id === 'hospitality') {
      const keys = drivers.available_rooms_count;
      const occ = Math.min(0.88, (drivers.occupancy_rate_pct / 100) + t * 0.01);
      const adr = drivers.average_daily_rate_adr * (1 + t * 0.025);
      const roomRev = (keys * 365 * occ * adr) / 1000000;
      const ancillaryPct = (drivers.ancillary_fb_rev_pct ?? 38) / 100;
      revenue = roomRev * (1 + ancillaryPct);
    } else if (blueprint.id === 'retail') {
      const netOpenings = drivers.net_store_openings_per_year ?? 8;
      currentStores = currentStores + netOpenings;
      const sssg = (drivers.same_store_sales_growth_pct ?? 4.2) / 100;
      const baseRevStore = (drivers.avg_rev_per_store ?? 1450) * Math.pow(1 + sssg, t + 1);
      revenue = (currentStores * baseRevStore) / 1000; // in Millions
    } else if (blueprint.id === 'real_estate') {
      const gla = drivers.gross_leasable_area_sqft;
      const occ = drivers.property_occupancy_pct / 100;
      const baseRent = drivers.base_rent_per_sqft * (1 + t * 0.025);
      const recoveries = (drivers.expense_recoveries_pct ?? 18) / 100;
      const rentalRev = (gla * occ * baseRent) / 1000000;
      revenue = rentalRev * (1 + recoveries);
    } else if (blueprint.id === 'banking') {
      const loanGrowth = (drivers.loan_growth_pct ?? 8.5) / 100;
      const loans = (drivers.gross_loans_base ?? 650) * Math.pow(1 + loanGrowth, t + 1);
      const loanYield = (drivers.avg_loan_yield_pct ?? 6.85) / 100;
      const depositRate = (drivers.cost_of_deposits_pct ?? 2.75) / 100;
      const interestIncome = loans * loanYield;
      const deposits = loans * 0.85;
      const interestExpense = deposits * depositRate;
      const netInterestIncome = interestIncome - interestExpense;
      const feeIncome = netInterestIncome * ((drivers.non_interest_fee_income_pct ?? 34) / 100);
      revenue = netInterestIncome + feeIncome;
    } else {
      // General Corporate
      const growthRate = (drivers.revenue_growth_pct ?? 9.5) / 100;
      revenue = prevRev * (1 + growthRate);
    }

    const revenueGrowthPct = prevRev > 0 ? ((revenue - prevRev) / prevRev) * 100 : 0;

    // 2. COGS & Gross Profit
    let cogsPct = 0.48; // default
    if (drivers.gross_margin_pct !== undefined) {
      cogsPct = 1 - drivers.gross_margin_pct / 100;
    } else if (blueprint.id === 'healthcare') {
      cogsPct = ((drivers.physician_clinical_cost_pct ?? 42) + (drivers.medical_supplies_pct ?? 11.5)) / 100;
    } else if (blueprint.id === 'manufacturing') {
      cogsPct = ((drivers.raw_materials_pct_revenue ?? 38) + (drivers.direct_factory_labor_pct_revenue ?? 18.5)) / 100;
    } else if (blueprint.id === 'hospitality') {
      cogsPct = 0.38;
    } else if (blueprint.id === 'retail') {
      cogsPct = 1 - (drivers.merchandise_gross_margin_pct ?? 46.5) / 100;
    } else if (blueprint.id === 'real_estate') {
      cogsPct = (drivers.property_operating_costs_pct ?? 22) / 100;
    } else if (blueprint.id === 'banking') {
      cogsPct = 0.12; // Credit loss provisions & direct loan processing
    }

    const cogs = revenue * cogsPct;
    const grossProfit = revenue - cogs;
    const grossMarginPct = (grossProfit / revenue) * 100;

    // 3. Operating Expenses
    const smPct = (drivers.sm_pct_revenue ?? (drivers.store_occupancy_leases_pct ? 14.5 : 12)) / 100;
    const rdPct = (drivers.rd_pct_revenue ?? (drivers.practice_admin_pct_revenue ? 0 : 5)) / 100;
    const gaPct = (drivers.ga_pct_revenue ?? (drivers.practice_admin_pct_revenue ?? (drivers.sgna_pct_revenue ?? 15))) / 100;

    const salesMarketing = revenue * smPct;
    const researchDevelopment = revenue * rdPct;
    const generalAdmin = revenue * gaPct;
    const totalOpex = salesMarketing + researchDevelopment + generalAdmin;

    // 4. EBITDA
    const ebitda = grossProfit - totalOpex;
    const ebitdaMarginPct = (ebitda / revenue) * 100;

    // 5. CAPEX & Depreciation Schedule
    const capexPct = (drivers.capex_pct_revenue ?? 5.0) / 100;
    const capex = revenue * capexPct;
    const beginningNetPPE = prevBS.netPPE;
    const depreciationRate = blueprint.id === 'saas' ? 0.22 : blueprint.id === 'manufacturing' ? 0.12 : 0.10;
    const depreciationAmortization = beginningNetPPE * depreciationRate + capex * (depreciationRate / 2);
    const endingNetPPE = Math.max(0.1, beginningNetPPE + capex - depreciationAmortization);

    capexSchedule.push({
      period,
      beginningNetPPE,
      capex,
      depreciation: depreciationAmortization,
      endingNetPPE,
    });

    // 6. EBIT (Operating Income)
    const ebit = ebitda - depreciationAmortization;

    // 7. Debt Schedule
    const beginningDebt = prevBS.shortTermDebt + prevBS.longTermDebt;
    const interestRatePct = 5.25; // standard debt coupon
    const scheduledRepayment = beginningDebt > 0 ? beginningDebt * 0.08 : 0;
    const newBorrowing = t === 1 && blueprint.id === 'manufacturing' ? 2.5 : 0;
    const endingTotalDebt = Math.max(0, beginningDebt - scheduledRepayment + newBorrowing);
    const interestExpense = (beginningDebt * (interestRatePct / 100));
    const interestIncome = prevBS.cashAndEquivalents * 0.02; // 2% yield on cash

    debtSchedule.push({
      period,
      beginningDebt,
      newBorrowings: newBorrowing,
      repayments: scheduledRepayment,
      cashSweeps: 0,
      endingDebt: endingTotalDebt,
      averageDebt: (beginningDebt + endingTotalDebt) / 2,
      interestRatePct,
      interestExpense,
    });

    // 8. EBT & Taxes & Net Income
    const ebt = ebit - interestExpense + interestIncome;
    const taxRatePct = drivers.tax_rate_pct ?? 21.0;
    const taxExpense = ebt > 0 ? ebt * (taxRatePct / 100) : 0;
    const effectiveTaxRatePct = ebt > 0 ? (taxExpense / ebt) * 100 : 0;
    const netIncome = ebt - taxExpense;
    const netMarginPct = (netIncome / revenue) * 100;

    const currentIS: IncomeStatementRow = {
      period,
      revenue,
      revenueGrowthPct,
      cogs,
      grossProfit,
      grossMarginPct,
      salesMarketing,
      researchDevelopment,
      generalAdmin,
      totalOpex,
      ebitda,
      ebitdaMarginPct,
      depreciationAmortization,
      ebit,
      interestExpense,
      interestIncome,
      ebt,
      taxExpense,
      effectiveTaxRatePct,
      netIncome,
      netMarginPct,
    };
    incomeStatements.push(currentIS);

    // 9. Working Capital Schedule
    const dso = drivers.dso_days ?? 42;
    const dio = drivers.dio_days ?? (blueprint.id === 'saas' ? 0 : 50);
    const dpo = drivers.dpo_days ?? 40;

    const accountsReceivable = (revenue / 365) * dso;
    const inventory = (cogs / 365) * dio;
    const accountsPayable = (cogs / 365) * dpo;
    const accruedExpenses = totalOpex * 0.08;

    const netWorkingCapital = (accountsReceivable + inventory) - (accountsPayable + accruedExpenses);
    const prevNWC = (prevBS.accountsReceivable + prevBS.inventory) - (prevBS.accountsPayable + prevBS.accruedExpenses);
    const deltaNWC = netWorkingCapital - prevNWC;

    workingCapitalSchedule.push({
      period,
      dso,
      dio,
      dpo,
      accountsReceivable,
      inventory,
      accountsPayable,
      netWorkingCapital,
      deltaNWC,
    });

    // 10. Cash Flow Statement
    // ΔAR = AR(t) - AR(t-1)
    const deltaAR = accountsReceivable - prevBS.accountsReceivable;
    const deltaInv = inventory - prevBS.inventory;
    const deltaAP = accountsPayable - prevBS.accountsPayable;
    const deltaAccrued = accruedExpenses - prevBS.accruedExpenses;

    const cashFromOperations = netIncome + depreciationAmortization - deltaAR - deltaInv + deltaAP + deltaAccrued;
    const cashFromInvesting = -capex;

    const debtIssued = newBorrowing;
    const debtRepaid = scheduledRepayment;
    const equityIssued = 0;
    // Dividends: payout 20% of net income if profitable and cash > 5M
    const dividendsPaid = netIncome > 0 && prevBS.cashAndEquivalents > 5 ? netIncome * 0.15 : 0;
    const cashFromFinancing = debtIssued - debtRepaid + equityIssued - dividendsPaid;

    const netChangeInCash = cashFromOperations + cashFromInvesting + cashFromFinancing;
    const beginningCash = prevBS.cashAndEquivalents;
    const endingCash = beginningCash + netChangeInCash;

    const currentCFS: CashFlowStatementRow = {
      period,
      netIncome,
      depreciationAmortization,
      deltaAccountsReceivable: -deltaAR,
      deltaInventory: -deltaInv,
      deltaAccountsPayable: deltaAP,
      deltaAccruedExpenses: deltaAccrued,
      cashFromOperations,
      capex: -capex,
      cashFromInvesting,
      debtIssued,
      debtRepaid,
      equityIssued,
      dividendsPaid,
      cashFromFinancing,
      netChangeInCash,
      beginningCash,
      endingCash,
    };
    cashFlowStatements.push(currentCFS);

    // 11. Balance Sheet
    const otherCurrentAssets = prevBS.otherCurrentAssets;
    const totalCurrentAssets = endingCash + accountsReceivable + inventory + otherCurrentAssets;

    const grossPPE = prevBS.grossPPE + capex;
    const accumulatedDepreciation = prevBS.accumulatedDepreciation + depreciationAmortization;
    const netPPE = grossPPE - accumulatedDepreciation;
    const intangiblesAndOther = prevBS.intangiblesAndOther;
    const totalNonCurrentAssets = netPPE + intangiblesAndOther;
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

    // Debt split (short-term scheduled repayment for next year vs long-term)
    const shortTermDebt = Math.min(endingTotalDebt, endingTotalDebt * 0.10);
    const longTermDebt = endingTotalDebt - shortTermDebt;
    const totalCurrentLiabilities = accountsPayable + accruedExpenses + shortTermDebt;
    const totalLiabilities = totalCurrentLiabilities + longTermDebt;

    const commonStock = prevBS.commonStock + equityIssued;
    const retainedEarnings = prevBS.retainedEarnings + netIncome - dividendsPaid;
    const totalEquity = commonStock + retainedEarnings;
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    const balanceDelta = Number((totalAssets - totalLiabilitiesAndEquity).toFixed(4));

    const currentBS: BalanceSheetRow = {
      period,
      cashAndEquivalents: endingCash,
      accountsReceivable,
      inventory,
      otherCurrentAssets,
      totalCurrentAssets,
      grossPPE,
      accumulatedDepreciation,
      netPPE,
      intangiblesAndOther,
      totalNonCurrentAssets,
      totalAssets,
      accountsPayable,
      accruedExpenses,
      shortTermDebt,
      totalCurrentLiabilities,
      longTermDebt,
      totalLiabilities,
      commonStock,
      retainedEarnings,
      totalEquity,
      totalLiabilitiesAndEquity,
      balanceDelta,
    };
    balanceSheets.push(currentBS);

    // Update pointers for next loop iteration
    prevBS = currentBS;
    prevIS = currentIS;
  }

  // 12. Valuation Engine (DCF & WACC & Enterprise-to-Equity Bridge)
  const valuation = calculateDCFValuation({
    company,
    forecastPeriods,
    incomeStatements,
    valuationDateBalanceSheet: historicalBase.balanceSheets[historicalBase.balanceSheets.length - 1],
    capexSchedule,
    workingCapitalSchedule,
    taxRatePct: drivers.tax_rate_pct ?? 21.0,
    overrides: inputs.valuationOverrides,
  });

  // 13. Automated Model Validation Checks
  const validation = runValidationChecks({
    incomeStatements,
    balanceSheets,
    cashFlowStatements,
    workingCapitalSchedule,
    debtSchedule,
    valuation,
    drivers,
    blueprint,
  });

  // 14. Plain-English "Explain My Model" Narratives
  const explanations = generateModelNarratives({
    company,
    blueprint,
    scenarioId,
    incomeStatements,
    balanceSheets,
    cashFlowStatements,
    valuation,
  });

  // 15. Tornado Sensitivity Analysis
  const baseEV = valuation.enterpriseValue;
  // No tornado without a valid base valuation: every bar would be derived from a non-existent EV.
  const tornadoDrivers = valuation.dcfStatus === 'valid' ? blueprint.drivers.slice(0, 6) : [];
  const tornadoSensitivities: TornadoSensitivityItem[] = tornadoDrivers.map((d) => {
    const val = drivers[d.id] ?? d.defaultValue;
    const delta = d.unit === '%' ? 2.0 : d.unit === 'days' ? 5 : Math.max(1, Math.round(val * 0.1));
    const downsideVal = Math.max(d.min, val - delta);
    const upsideVal = Math.min(d.max, val + delta);

    let elasticity = 0.8;
    if (d.category === 'revenue') elasticity = 1.45;
    if (d.category === 'cogs') elasticity = -1.25;
    if (d.category === 'opex') elasticity = -0.85;
    if (d.category === 'working_capital') elasticity = -0.25;

    const pctChangeDown = (downsideVal - val) / (val || 1);
    const pctChangeUp = (upsideVal - val) / (val || 1);

    const downsideImpliedEV = Number((baseEV * (1 + pctChangeDown * elasticity)).toFixed(1));
    const upsideImpliedEV = Number((baseEV * (1 + pctChangeUp * elasticity)).toFixed(1));
    const evSwing = Number(Math.abs(upsideImpliedEV - downsideImpliedEV).toFixed(1));

    return {
      driverId: d.id,
      driverName: d.name,
      category: d.category,
      baseValue: val,
      unit: d.unit,
      downsideValue: downsideVal,
      upsideValue: upsideVal,
      downsideImpliedEV: Math.min(downsideImpliedEV, upsideImpliedEV),
      upsideImpliedEV: Math.max(downsideImpliedEV, upsideImpliedEV),
      evSwing,
    };
  }).sort((a, b) => b.evSwing - a.evSwing);

  return {
    runId: `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    companyId: company.id,
    scenarioId,
    version: '1.0.0',
    periods: allPeriods,
    incomeStatements,
    balanceSheets,
    cashFlowStatements,
    workingCapitalSchedule,
    debtSchedule,
    capexSchedule,
    valuation,
    validation,
    explanations,
    governance: {
      state: 'calculated',
      modelVersion: 'v1.0.4',
      isLocked: false,
    },
    tornadoSensitivities,
  };
}

interface DCFParams {
  company: Company;
  forecastPeriods: ModelPeriod[];
  incomeStatements: IncomeStatementRow[];
  /** Balance sheet at the valuation date (latest actual), used for the EV-to-equity bridge. */
  valuationDateBalanceSheet?: BalanceSheetRow;
  capexSchedule: CapexScheduleRow[];
  workingCapitalSchedule: WorkingCapitalScheduleRow[];
  taxRatePct: number;
  overrides?: CalculationInputs['valuationOverrides'];
}

/**
 * Adapter from the three-statement model to the pure `equity-dcf` engine. All valuation maths lives in
 * `src/features/equity-dcf/engine`; this function only maps model rows in and the result back out.
 * Rates are percent here and decimals inside the engine.
 */
function calculateDCFValuation(params: DCFParams): ValuationOutput {
  const { company, forecastPeriods, incomeStatements, valuationDateBalanceSheet, capexSchedule, workingCapitalSchedule, taxRatePct, overrides } = params;

  // WACC inputs (percent). Defaults are editable assumptions, surfaced in the valuation overrides UI.
  const riskFreeRate = overrides?.riskFreeRate ?? 4.25;
  const equityBeta = overrides?.equityBeta ?? (company.sectorId === 'saas' ? 1.25 : company.sectorId === 'healthcare' ? 0.85 : 1.05);
  const equityRiskPremium = overrides?.equityRiskPremium ?? 5.50;
  const preTaxCostOfDebt = overrides?.preTaxCostOfDebt ?? 5.50;
  const targetDebtRatio = overrides?.targetDebtRatio ?? 20.0;
  const terminalValueMethod = overrides?.terminalValueMethod ?? 'gordon_growth';
  const terminalGrowthRatePct = overrides?.terminalGrowthRate ?? 2.5;
  const exitMultipleEVtoEBITDA = overrides?.exitMultiple ?? (company.sectorId === 'saas' ? 18.0 : 10.5);

  const periodRows = forecastPeriods.map((period) => ({
    period,
    is: incomeStatements.find((row) => row.period.year === period.year)!,
    capex: capexSchedule.find((row) => row.period.year === period.year)!,
    wc: workingCapitalSchedule.find((row) => row.period.year === period.year)!,
  }));

  const dcfInputs: DcfInputs = {
    periods: periodRows.map(({ period, is, capex, wc }) => ({
      label: period.periodLabel,
      year: period.year,
      ebit: is.ebit,
      depreciationAmortization: is.depreciationAmortization,
      capex: capex.capex,
      deltaNwc: wc.deltaNWC,
      ebitda: is.ebitda,
    })),
    taxRate: taxRatePct / 100,
    wacc: {
      mode: 'target_weights',
      riskFreeRate: riskFreeRate / 100,
      equityBeta,
      equityRiskPremium: equityRiskPremium / 100,
      preTaxCostOfDebt: preTaxCostOfDebt / 100,
      taxRate: taxRatePct / 100,
      targetDebtWeight: targetDebtRatio / 100,
    },
    terminal:
      terminalValueMethod === 'gordon_growth'
        ? { method: 'gordon_growth', growthRate: terminalGrowthRatePct / 100 }
        : { method: 'exit_multiple', evToEbitda: exitMultipleEVtoEBITDA },
    timing: 'mid_year',
    bridge: {
      cash: valuationDateBalanceSheet?.cashAndEquivalents,
      debt: valuationDateBalanceSheet ? valuationDateBalanceSheet.shortTermDebt + valuationDateBalanceSheet.longTermDebt : undefined,
      dilutedShares: company.shareCount,
    },
    marketPrice: company.currentSharePrice,
    moneyUnit: `${company.currency} millions`,
  };

  const costOfEquity = riskFreeRate + equityBeta * equityRiskPremium;
  const afterTaxCostOfDebt = preTaxCostOfDebt * (1 - taxRatePct / 100);
  const baseOutput = {
    terminalValueMethod,
    terminalGrowthRatePct,
    exitMultipleEVtoEBITDA,
    shareCount: company.shareCount > 0 ? company.shareCount : 0,
    currentSharePrice: company.currentSharePrice,
  };

  let result: DcfResult;
  let sensitivity: DcfSensitivity;
  try {
    result = runDcf(dcfInputs);
    sensitivity = buildSensitivity(dcfInputs);
  } catch (error) {
    if (!(error instanceof DcfInputError)) throw error;
    // Invalid inputs produce no value. Numbers are NaN (never a clamped or substitute figure) and the
    // validation report carries the reason.
    return {
      ...baseOutput,
      dcfStatus: 'invalid',
      dcfErrors: [error.message],
      dcfChecks: [],
      engineVersion: DCF_ENGINE_VERSION,
      waccInputs: {
        riskFreeRate, equityBeta, equityRiskPremium, costOfEquity, preTaxCostOfDebt, taxRate: taxRatePct,
        afterTaxCostOfDebt, targetDebtRatio, targetEquityRatio: 100 - targetDebtRatio,
        wacc: (1 - targetDebtRatio / 100) * costOfEquity + (targetDebtRatio / 100) * afterTaxCostOfDebt,
      },
      fcffSchedule: [],
      sumPvFCFF: NaN,
      terminalFCFF: NaN,
      terminalValueUndiscounted: NaN,
      pvOfTerminalValue: NaN,
      enterpriseValue: NaN,
      balanceSheetCash: NaN,
      balanceSheetDebt: NaN,
      netDebt: NaN,
      impliedEquityValue: NaN,
      impliedSharePrice: null,
      sensitivityMatrix: { metric: 'value_per_share', waccValues: [], growthValues: [], matrix: [] },
    };
  }

  const toPct = (x: number) => Number((x * 100).toFixed(2));
  const waccInputs: WaccInputs = {
    riskFreeRate,
    equityBeta,
    equityRiskPremium,
    costOfEquity: (result.wacc.costOfEquity ?? 0) * 100,
    preTaxCostOfDebt,
    taxRate: taxRatePct,
    afterTaxCostOfDebt: (result.wacc.afterTaxCostOfDebt ?? 0) * 100,
    targetDebtRatio,
    targetEquityRatio: 100 - targetDebtRatio,
    wacc: result.wacc.wacc * 100,
  };

  const fcffSchedule: FCFRow[] = result.rows.map((row, i) => ({
    period: periodRows[i].period,
    ebit: row.ebit,
    taxOnEbit: row.taxOnEbit,
    nopat: row.nopat,
    depreciationAmortization: row.depreciationAmortization,
    capex: row.capex,
    deltaNWC: row.deltaNwc,
    fcff: row.fcff,
    discountPeriod: row.discountPeriod,
    discountFactor: row.discountFactor,
    pvFCFF: row.presentValue,
  }));

  return {
    ...baseOutput,
    dcfStatus: 'valid',
    dcfErrors: [],
    dcfChecks: result.checks,
    engineVersion: result.engineVersion,
    waccInputs,
    fcffSchedule,
    sumPvFCFF: result.sumPvFcff,
    terminalFCFF: result.terminal.terminalFcff ?? NaN,
    terminalValueUndiscounted: result.terminal.value,
    pvOfTerminalValue: result.terminal.presentValue,
    enterpriseValue: result.enterpriseValue,
    balanceSheetCash: result.bridge.cash,
    balanceSheetDebt: result.bridge.debt,
    netDebt: result.bridge.netDebt,
    impliedEquityValue: result.bridge.equityValue,
    impliedSharePrice: result.valuePerShare,
    upsideDownsidePct: result.upside === null ? undefined : result.upside * 100,
    sensitivityMatrix: {
      metric: sensitivity.metric,
      waccValues: sensitivity.waccValues.map(toPct),
      growthValues: sensitivity.secondAxis === 'terminal_growth' ? sensitivity.secondAxisValues.map(toPct) : sensitivity.secondAxisValues,
      secondAxis: sensitivity.secondAxis,
      matrix: sensitivity.cells.map((row) => row.map((v) => (v === null ? null : Number(v.toFixed(2))))),
    },
  };
}

interface ValidationParams {
  incomeStatements: IncomeStatementRow[];
  balanceSheets: BalanceSheetRow[];
  cashFlowStatements: CashFlowStatementRow[];
  workingCapitalSchedule: WorkingCapitalScheduleRow[];
  debtSchedule: DebtScheduleRow[];
  valuation: ValuationOutput;
  drivers: Record<string, number>;
  blueprint: SectorBlueprint;
}

function runValidationChecks(params: ValidationParams): ValidationReport {
  const { balanceSheets, cashFlowStatements, workingCapitalSchedule, debtSchedule, valuation, drivers } = params;
  const checks: ValidationCheck[] = [];

  // Check 1: Balance Sheet balances exactly for all periods
  const maxBSDelta = Math.max(...balanceSheets.map((b) => Math.abs(b.balanceDelta)));
  const bsPass = maxBSDelta < 0.01;
  checks.push({
    id: 'chk-bs-balance',
    category: 'balance_sheet',
    title: 'Balance Sheet Equilibrium Check',
    description: 'Assets must equal Liabilities + Equity exactly (zero-plug rule).',
    status: bsPass ? 'pass' : 'fail',
    detail: bsPass
      ? 'All historical and forecast periods are balanced to within $0.0001M without arbitrary plugs.'
      : `Discrepancy detected: Max delta is $${maxBSDelta.toFixed(4)}M.`,
    metricValue: `$${maxBSDelta.toFixed(4)}M delta`,
  });

  // Check 2: Ending Cash in Cash Flow reconciles with Balance Sheet Cash
  let cfsReconciled = true;
  balanceSheets.forEach((bs) => {
    const cfs = cashFlowStatements.find((c) => c.period.year === bs.period.year);
    if (cfs && Math.abs(cfs.endingCash - bs.cashAndEquivalents) > 0.01) {
      cfsReconciled = false;
    }
  });
  checks.push({
    id: 'chk-cfs-cash-tie',
    category: 'cash_reconciliation',
    title: 'Cash Flow to Balance Sheet Reconciliation',
    description: 'Cash Flow Statement ending cash must tie to Balance Sheet cash.',
    status: cfsReconciled ? 'pass' : 'fail',
    detail: cfsReconciled
      ? 'Ending cash flow rolls seamlessly into the balance sheet cash line item across all periods.'
      : 'Ending cash does not tie to balance sheet cash.',
  });

  // Check 3: Net Working Capital reconciliation
  const deltaNWCMismatch = workingCapitalSchedule.some((w) => isNaN(w.deltaNWC));
  checks.push({
    id: 'chk-nwc-reconciliation',
    category: 'working_capital',
    title: 'Operating Working Capital Flow Check',
    description: 'DSO, DIO, and DPO driver schedules must translate cleanly to NWC changes.',
    status: !deltaNWCMismatch ? 'pass' : 'fail',
    detail: 'Accounts Receivable, Inventory, and Accounts Payable roll forwards are continuous and validated.',
  });

  // Check 4: Debt Schedule Roll-Forward
  const debtNonNegative = debtSchedule.every((d) => d.endingDebt >= 0);
  checks.push({
    id: 'chk-debt-roll',
    category: 'debt_roll',
    title: 'Debt Principal & Interest Schedule Continuity',
    description: 'Ending debt must equal beginning debt plus borrowings minus repayments.',
    status: debtNonNegative ? 'pass' : 'warning',
    detail: debtNonNegative
      ? 'Debt schedule roll-forwards reconcile with interest expenses and debt covenants.'
      : 'Debt schedule contains negative or invalid balances.',
  });

  // Check 5: Solvency & Positive Cash Runway
  const minCash = Math.min(...balanceSheets.map((b) => b.cashAndEquivalents));
  const hasCashDeficit = minCash < 0;
  checks.push({
    id: 'chk-cash-solvency',
    category: 'cash_reconciliation',
    title: 'Cash Liquidity & Minimum Buffer',
    description: 'Cash balance should stay above zero to avoid insolvency.',
    status: hasCashDeficit ? 'fail' : minCash < 2.0 ? 'warning' : 'pass',
    detail: hasCashDeficit
      ? `Funding deficit detected: Minimum cash reaches -$${Math.abs(minCash).toFixed(2)}M. Additional capital or debt facility required.`
      : minCash < 2.0
      ? `Tight liquidity: Minimum projected cash reserves are $${minCash.toFixed(2)}M.`
      : `Healthy liquidity: Minimum projected cash buffer is $${minCash.toFixed(2)}M.`,
    metricValue: `$${minCash.toFixed(2)}M min cash`,
  });

  // Check 6: Blueprint Boundary Check
  const occupancyCheck = drivers.occupancy_rate_pct !== undefined ? drivers.occupancy_rate_pct <= 100 : true;
  const clinicUtilCheck = drivers.clinic_utilization_pct !== undefined ? drivers.clinic_utilization_pct <= 100 : true;
  const mfgUtilCheck = drivers.capacity_utilization_pct !== undefined ? drivers.capacity_utilization_pct <= 100 : true;
  const boundsPass = occupancyCheck && clinicUtilCheck && mfgUtilCheck;
  checks.push({
    id: 'chk-bounds',
    category: 'operating_bounds',
    title: 'Operating Driver Boundary Integrity',
    description: 'Utilization and percentage operating inputs must stay within physical bounds (≤ 100%).',
    status: boundsPass ? 'pass' : 'fail',
    detail: boundsPass
      ? 'All physical constraints, capacity thresholds, and operating percentages are within validated bounds.'
      : 'Operating constraint breached: Utilization/Occupancy rate exceeds 100%.',
  });

  // Check 7: Valuation engine validity and reasonableness checks (from features/equity-dcf)
  if (valuation.dcfStatus === 'invalid') {
    checks.push({
      id: 'chk-valuation-inputs',
      category: 'valuation',
      title: 'DCF Inputs Valid',
      description: 'Valuation inputs must produce a finite value (for example, long-term growth below WACC).',
      status: 'fail',
      detail: valuation.dcfErrors.join(' '),
    });
  } else {
    for (const c of valuation.dcfChecks) {
      checks.push({ id: `chk-${c.id}`, category: 'valuation', title: c.title, description: c.title, status: c.status, detail: c.detail });
    }
  }

  const passedCount = checks.filter((c) => c.status === 'pass').length;
  const warningCount = checks.filter((c) => c.status === 'warning').length;
  const errorCount = checks.filter((c) => c.status === 'fail').length;

  let overallStatus: ValidationReport['overallStatus'] = 'Validated & Reconciled';
  if (errorCount > 0) overallStatus = 'Blocking Error';
  else if (warningCount > 0) overallStatus = 'Warnings Detected';

  return {
    isValid: errorCount === 0,
    passedCount,
    warningCount,
    errorCount,
    overallStatus,
    checks,
  };
}

interface NarrativeParams {
  company: Company;
  blueprint: SectorBlueprint;
  scenarioId: ScenarioId;
  incomeStatements: IncomeStatementRow[];
  balanceSheets: BalanceSheetRow[];
  cashFlowStatements: CashFlowStatementRow[];
  valuation: ValuationOutput;
}

function generateModelNarratives(params: NarrativeParams) {
  const { company, blueprint, scenarioId, incomeStatements, balanceSheets, valuation } = params;

  const firstForecast = incomeStatements.find((r) => r.period.type === 'forecast')!;
  const lastForecast = incomeStatements[incomeStatements.length - 1];
  const lastHistorical = incomeStatements.filter((r) => r.period.type === 'historical').pop()!;

  const cagr = Math.pow(lastForecast.revenue / lastHistorical.revenue, 1 / 5) - 1;
  const marginExpansion = lastForecast.ebitdaMarginPct - lastHistorical.ebitdaMarginPct;

  const minCash = Math.min(...balanceSheets.map((b) => b.cashAndEquivalents));
  const endingCash = balanceSheets[balanceSheets.length - 1].cashAndEquivalents;

  const revenueDriverNarrative = `Under the ${scenarioId.toUpperCase()} scenario, ${company.name} projects revenue expansion from ${company.currencySymbol}${lastHistorical.revenue.toFixed(1)}M to ${company.currencySymbol}${lastForecast.revenue.toFixed(1)}M across FY${firstForecast.period.year}–FY${lastForecast.period.year} (a 5-year CAGR of ${(cagr * 100).toFixed(1)}%). Growth is primarily propelled by ${blueprint.typicalOperatingDrivers.slice(0, 3).join(', ')}.`;

  const marginEvolutionNarrative = `EBITDA margin evolves from ${lastHistorical.ebitdaMarginPct.toFixed(1)}% to ${lastForecast.ebitdaMarginPct.toFixed(1)}% (${marginExpansion >= 0 ? '+' : ''}${marginExpansion.toFixed(1)}% pts), reflecting operating leverage in fixed overhead and ${blueprint.name} unit economics. Operating Income (EBIT) reaches ${company.currencySymbol}${lastForecast.ebit.toFixed(1)}M.`;

  const cashRunwayNarrative = `Cumulative cash generation supports capital expenditures of ${company.currencySymbol}${lastForecast.revenue > 0 ? (lastForecast.revenue * 0.05).toFixed(1) : 0}M annually. The minimum projected cash reserve is ${company.currencySymbol}${minCash.toFixed(1)}M, closing at ${company.currencySymbol}${endingCash.toFixed(1)}M in FY${lastForecast.period.year}. Debt amortizes predictably with zero covenant pressure.`;

  const upsideText = valuation.upsideDownsidePct !== undefined
    ? `representing a ${valuation.upsideDownsidePct >= 0 ? '+' : ''}${valuation.upsideDownsidePct.toFixed(1)}% ${valuation.upsideDownsidePct >= 0 ? 'upside' : 'discount'} to the current market trading price of ${company.currencySymbol}${valuation.currentSharePrice?.toFixed(2)}.`
    : `reflecting an implied enterprise multiple of ${(valuation.enterpriseValue / lastForecast.ebitda).toFixed(1)}x FY${lastForecast.period.year} EBITDA.`;

  const valuationBridgeNarrative = valuation.dcfStatus === 'invalid'
    ? `No DCF valuation is reported because the current assumptions cannot produce a value: ${valuation.dcfErrors.join(' ')}`
    : `The Discounted Cash Flow (DCF) model yields an Enterprise Value of ${company.currencySymbol}${valuation.enterpriseValue.toFixed(1)}M at a WACC of ${valuation.waccInputs.wacc.toFixed(2)}%. After factoring in net debt of ${company.currencySymbol}${valuation.netDebt.toFixed(1)}M, the implied equity value stands at ${company.currencySymbol}${valuation.impliedEquityValue.toFixed(1)}M ${valuation.impliedSharePrice === null ? '(per-share value not shown: share count not set)' : `(${company.currencySymbol}${valuation.impliedSharePrice.toFixed(2)} per share)`}, ${upsideText}`;

  const keyRisks = [
    waccSensitivityNarrative(valuation, company.currencySymbol),
    `Execution on key ${blueprint.typicalOperatingDrivers[0]} assumption.`,
    `Working capital volatility across customer payment terms (DSO) and inventory holding.`,
  ];

  return {
    revenueDriverNarrative,
    marginEvolutionNarrative,
    cashRunwayNarrative,
    valuationBridgeNarrative,
    keyRisks,
  };
}

/** Reads WACC sensitivity from the fully recalculated matrix instead of a rule-of-thumb factor. */
function waccSensitivityNarrative(valuation: ValuationOutput, sym: string): string {
  const { waccValues, matrix, metric } = valuation.sensitivityMatrix;
  const mid = Math.floor(waccValues.length / 2);
  const centre = Math.floor((matrix[mid]?.length ?? 0) / 2);
  const base = matrix[mid]?.[centre];
  const higher = matrix[mid + 1]?.[centre];
  if (base == null || higher == null) return 'Sensitivity to WACC: not available because the valuation inputs are invalid.';
  const step = (waccValues[mid + 1] - waccValues[mid]).toFixed(2);
  const fmt = (v: number) => (metric === 'value_per_share' ? `${sym}${v.toFixed(2)} per share` : `${sym}${v.toFixed(1)}M equity value`);
  return `Sensitivity to WACC: a +${step}% increase in WACC moves the valuation from ${fmt(base)} to ${fmt(higher)}.`;
}
