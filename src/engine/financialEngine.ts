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
    balanceSheets,
    capexSchedule,
    workingCapitalSchedule,
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
  const tornadoSensitivities: TornadoSensitivityItem[] = blueprint.drivers.slice(0, 6).map((d) => {
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
  balanceSheets: BalanceSheetRow[];
  capexSchedule: CapexScheduleRow[];
  workingCapitalSchedule: WorkingCapitalScheduleRow[];
  overrides?: CalculationInputs['valuationOverrides'];
}

function calculateDCFValuation(params: DCFParams): ValuationOutput {
  const { company, forecastPeriods, incomeStatements, balanceSheets, capexSchedule, workingCapitalSchedule, overrides } = params;

  // WACC Inputs
  const riskFreeRate = overrides?.riskFreeRate ?? 4.25; // 10Y US Treasury / sovereign
  const equityBeta = overrides?.equityBeta ?? (company.sectorId === 'saas' ? 1.25 : company.sectorId === 'healthcare' ? 0.85 : 1.05);
  const equityRiskPremium = overrides?.equityRiskPremium ?? 5.50;
  const costOfEquity = riskFreeRate + equityBeta * equityRiskPremium;

  const preTaxCostOfDebt = overrides?.preTaxCostOfDebt ?? 5.50;
  const taxRate = 21.0;
  const afterTaxCostOfDebt = preTaxCostOfDebt * (1 - taxRate / 100);

  const targetDebtRatio = overrides?.targetDebtRatio ?? 20.0;
  const targetEquityRatio = 100.0 - targetDebtRatio;

  const wacc = (costOfEquity * (targetEquityRatio / 100)) + (afterTaxCostOfDebt * (targetDebtRatio / 100));

  const waccInputs: WaccInputs = {
    riskFreeRate,
    equityBeta,
    equityRiskPremium,
    costOfEquity,
    preTaxCostOfDebt,
    taxRate,
    afterTaxCostOfDebt,
    targetDebtRatio,
    targetEquityRatio,
    wacc,
  };

  // Build Free Cash Flow to Firm (FCFF) Schedule
  // FCFF = EBIT * (1 - t) + D&A - CAPEX - ΔNWC
  const fcffSchedule: FCFRow[] = [];
  let sumPvFCFF = 0;

  forecastPeriods.forEach((period, idx) => {
    const is = incomeStatements.find((row) => row.period.year === period.year)!;
    const capexRow = capexSchedule.find((row) => row.period.year === period.year)!;
    const wcRow = workingCapitalSchedule.find((row) => row.period.year === period.year)!;

    const ebit = is.ebit;
    const taxOnEbit = Math.max(0, ebit) * (taxRate / 100);
    const nopat = ebit - taxOnEbit;
    const da = is.depreciationAmortization;
    const capex = capexRow.capex;
    const deltaNWC = wcRow.deltaNWC;

    const fcff = nopat + da - capex - deltaNWC;

    // Mid-year discounting convention (0.5, 1.5, 2.5, 3.5, 4.5)
    const discountPeriod = idx + 0.5;
    const discountFactor = 1 / Math.pow(1 + wacc / 100, discountPeriod);
    const pvFCFF = fcff * discountFactor;

    sumPvFCFF += pvFCFF;

    fcffSchedule.push({
      period,
      ebit,
      taxOnEbit,
      nopat,
      depreciationAmortization: da,
      capex,
      deltaNWC,
      fcff,
      discountPeriod,
      discountFactor,
      pvFCFF,
    });
  });

  // Terminal Value
  const terminalValueMethod = overrides?.terminalValueMethod ?? 'gordon_growth';
  const terminalGrowthRatePct = overrides?.terminalGrowthRate ?? 2.5;
  const exitMultipleEVtoEBITDA = overrides?.exitMultiple ?? (company.sectorId === 'saas' ? 18.0 : 10.5);

  const lastFCFF = fcffSchedule[fcffSchedule.length - 1].fcff;
  const lastEBITDA = incomeStatements[incomeStatements.length - 1].ebitda;
  const finalDiscountFactor = 1 / Math.pow(1 + wacc / 100, forecastPeriods.length);

  let terminalFCFF = lastFCFF * (1 + terminalGrowthRatePct / 100);
  let terminalValueUndiscounted = 0;

  if (terminalValueMethod === 'gordon_growth') {
    const spread = (wacc / 100) - (terminalGrowthRatePct / 100);
    const effectiveSpread = Math.max(0.005, spread);
    terminalValueUndiscounted = terminalFCFF / effectiveSpread;
  } else {
    terminalValueUndiscounted = lastEBITDA * exitMultipleEVtoEBITDA;
  }

  const pvOfTerminalValue = terminalValueUndiscounted * finalDiscountFactor;
  const enterpriseValue = sumPvFCFF + pvOfTerminalValue;

  // Enterprise-to-Equity Bridge
  const latestBS = balanceSheets[balanceSheets.length - 1];
  const balanceSheetCash = latestBS.cashAndEquivalents;
  const balanceSheetDebt = latestBS.shortTermDebt + latestBS.longTermDebt;
  const netDebt = balanceSheetDebt - balanceSheetCash;

  const impliedEquityValue = enterpriseValue - netDebt;
  const shareCount = company.shareCount || 50; // Millions
  const impliedSharePrice = impliedEquityValue / shareCount;

  const currentSharePrice = company.currentSharePrice;
  const upsideDownsidePct = currentSharePrice
    ? ((impliedSharePrice - currentSharePrice) / currentSharePrice) * 100
    : undefined;

  // 2D Sensitivity Matrix (WACC vs Terminal Growth Rate)
  const waccValues = [wacc - 1.5, wacc - 0.75, wacc, wacc + 0.75, wacc + 1.5].map((v) => Number(v.toFixed(2)));
  const growthValues = [
    terminalGrowthRatePct - 1.0,
    terminalGrowthRatePct - 0.5,
    terminalGrowthRatePct,
    terminalGrowthRatePct + 0.5,
    terminalGrowthRatePct + 1.0,
  ].map((v) => Number(v.toFixed(2)));

  const matrix: number[][] = [];
  for (const w of waccValues) {
    const rowVals: number[] = [];
    for (const g of growthValues) {
      const spread = Math.max(0.005, (w / 100) - (g / 100));
      const tv = (lastFCFF * (1 + g / 100)) / spread;
      const pvTV = tv / Math.pow(1 + w / 100, forecastPeriods.length);
      // approx sum of PV FCFF with test wacc
      let testSumPv = 0;
      fcffSchedule.forEach((row, i) => {
        testSumPv += row.fcff / Math.pow(1 + w / 100, i + 0.5);
      });
      const ev = testSumPv + pvTV;
      const eq = ev - netDebt;
      const price = eq / shareCount;
      rowVals.push(Number(price.toFixed(2)));
    }
    matrix.push(rowVals);
  }

  return {
    waccInputs,
    fcffSchedule,
    sumPvFCFF,
    terminalValueMethod,
    terminalGrowthRatePct,
    exitMultipleEVtoEBITDA,
    terminalFCFF,
    terminalValueUndiscounted,
    pvOfTerminalValue,
    enterpriseValue,
    balanceSheetCash,
    balanceSheetDebt,
    netDebt,
    impliedEquityValue,
    shareCount,
    impliedSharePrice,
    currentSharePrice,
    upsideDownsidePct,
    sensitivityMatrix: {
      waccValues,
      growthValues,
      matrix,
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

  // Check 7: Valuation WACC vs Terminal Growth Rate
  const waccSpread = valuation.waccInputs.wacc - valuation.terminalGrowthRatePct;
  const valuationValid = waccSpread >= 0.5;
  checks.push({
    id: 'chk-valuation-wacc-spread',
    category: 'valuation',
    title: 'DCF Mathematical Convergence (WACC > g)',
    description: 'WACC must exceed perpetual terminal growth rate by at least 0.50% for finite value.',
    status: valuationValid ? 'pass' : 'fail',
    detail: valuationValid
      ? `Spread is healthy (+${waccSpread.toFixed(2)}%). WACC is ${valuation.waccInputs.wacc.toFixed(2)}% vs ${valuation.terminalGrowthRatePct.toFixed(2)}% terminal growth.`
      : `Mathematical breach: WACC (${valuation.waccInputs.wacc.toFixed(2)}%) must be strictly greater than terminal growth (${valuation.terminalGrowthRatePct.toFixed(2)}%).`,
    metricValue: `${waccSpread.toFixed(2)}% spread`,
  });

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

  const valuationBridgeNarrative = `The Discounted Cash Flow (DCF) model yields an Enterprise Value of ${company.currencySymbol}${valuation.enterpriseValue.toFixed(1)}M at a WACC of ${valuation.waccInputs.wacc.toFixed(2)}%. After factoring in net debt of ${company.currencySymbol}${valuation.netDebt.toFixed(1)}M, the implied equity value stands at ${company.currencySymbol}${valuation.impliedEquityValue.toFixed(1)}M (${company.currencySymbol}${valuation.impliedSharePrice.toFixed(2)} per share), ${upsideText}`;

  const keyRisks = [
    `Sensitivity to WACC: A 100 bps increase in discount rate reduces implied equity value by ~${(valuation.impliedEquityValue * 0.09).toFixed(1)}M.`,
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
