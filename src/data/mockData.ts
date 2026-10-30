/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BalanceSheetRow,
  CashFlowStatementRow,
  Company,
  IncomeStatementRow,
  ModelPeriod,
  Scenario,
} from '@/types/finance';

export const INITIAL_COMPANIES: Company[] = [
  {
    id: 'comp-saas-cloudscale',
    name: 'CloudScale Technologies, Inc.',
    ticker: 'CLDS',
    isListed: true,
    sectorId: 'saas',
    currency: 'USD',
    currencySymbol: '$',
    domicile: 'United States (Delaware)',
    fiscalYearEnd: '12-31',
    accountingBasis: 'US_GAAP',
    shareCount: 65.0, // 65 million shares
    currentSharePrice: 42.50,
    description: 'Enterprise cloud analytics, DevOps monitoring, and workflow automation platform serving mid-market and global 2000 customers.',
  },
  {
    id: 'comp-health-serene',
    name: 'Serene Health Systems & Clinics',
    isListed: false,
    sectorId: 'healthcare',
    currency: 'USD',
    currencySymbol: '$',
    domicile: 'United States (California)',
    fiscalYearEnd: '12-31',
    accountingBasis: 'US_GAAP',
    shareCount: 20.0,
    description: 'Premium outpatient surgical suites, specialized diagnostic imaging, and preventive specialty clinic network.',
  },
  {
    id: 'comp-mfg-apex',
    name: 'Apex Precision Dynamics, PLC',
    ticker: 'APX',
    isListed: true,
    sectorId: 'manufacturing',
    currency: 'GBP',
    currencySymbol: '£',
    domicile: 'United Kingdom (London)',
    fiscalYearEnd: '12-31',
    accountingBasis: 'IFRS',
    shareCount: 88.0,
    currentSharePrice: 5.60,
    description: 'Engineered high-tolerance aerospace actuators, industrial hydraulic components, and precision motion systems.',
  },
  {
    id: 'comp-hotel-grandhorizon',
    name: 'Grand Horizon Resorts & Hotels',
    ticker: 'GHR',
    isListed: true,
    sectorId: 'hospitality',
    currency: 'USD',
    currencySymbol: '$',
    domicile: 'United States (Florida)',
    fiscalYearEnd: '12-31',
    accountingBasis: 'US_GAAP',
    shareCount: 35.0,
    currentSharePrice: 28.75,
    description: 'Boutique luxury resort portfolio operating upscale coastal properties, spas, and conference retreat destinations.',
  },
  {
    id: 'comp-retail-metro',
    name: 'Metro Retail Group, N.V.',
    ticker: 'MRG',
    isListed: true,
    sectorId: 'retail',
    currency: 'EUR',
    currencySymbol: '€',
    domicile: 'Netherlands (Amsterdam)',
    fiscalYearEnd: '12-31',
    accountingBasis: 'IFRS',
    shareCount: 45.0,
    currentSharePrice: 19.20,
    description: 'Omnichannel lifestyle retailer operating urban store formats coupled with high-growth direct-to-consumer digital commerce.',
  },
  {
    id: 'comp-re-vanguard',
    name: 'Vanguard Commercial Real Estate',
    ticker: 'VCP',
    isListed: true,
    sectorId: 'real_estate',
    currency: 'USD',
    currencySymbol: '$',
    domicile: 'United States (Texas)',
    fiscalYearEnd: '12-31',
    accountingBasis: 'US_GAAP',
    shareCount: 30.0,
    currentSharePrice: 34.00,
    description: 'Core urban office towers, life-science innovation laboratories, and suburban logistics flex parks.',
  },
  {
    id: 'comp-bank-meridian',
    name: 'First Meridian Bancorp, Inc.',
    ticker: 'FMB',
    isListed: true,
    sectorId: 'banking',
    currency: 'USD',
    currencySymbol: '$',
    domicile: 'United States (New York)',
    fiscalYearEnd: '12-31',
    accountingBasis: 'US_GAAP',
    shareCount: 52.0,
    currentSharePrice: 22.40,
    description: 'Regional commercial banking institution offering business lending, treasury management, and residential credit.',
  },
];

export const DEFAULT_SCENARIOS: Scenario[] = [
  {
    id: 'base',
    name: 'Base Case (Management Plan)',
    description: 'Consensus forecast based on planned operational capacity and normalized market baseline.',
    badgeColor: 'bg-primary-soft text-primary-soft-foreground border-primary/20',
    driverOverrides: {},
  },
  {
    id: 'bull',
    name: 'Bull Case (Expansion & Upside)',
    description: 'Favorable macroeconomic tailwinds, pricing power expansion (+5%), and improved asset utilization.',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    driverOverrides: {
      new_subscribers_growth_pct: 30.0,
      monthly_arpu: 2100,
      annual_churn_pct: 4.8,
      gross_margin_pct: 82.0,
      clinic_utilization_pct: 91.0,
      avg_rev_per_visit: 395,
      capacity_utilization_pct: 88.0,
      occupancy_rate_pct: 82.0,
      average_daily_rate_adr: 245,
      same_store_sales_growth_pct: 7.0,
      property_occupancy_pct: 96.0,
      base_rent_per_sqft: 41.0,
      revenue_growth_pct: 15.0,
    },
  },
  {
    id: 'bear',
    name: 'Bear Case (Downside / Stress)',
    description: 'Conservative stress test with macroeconomic contraction, demand softness (-10%), and margin pressure.',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    driverOverrides: {
      new_subscribers_growth_pct: 12.0,
      monthly_arpu: 1650,
      annual_churn_pct: 9.5,
      gross_margin_pct: 74.0,
      clinic_utilization_pct: 70.0,
      avg_rev_per_visit: 320,
      capacity_utilization_pct: 64.0,
      occupancy_rate_pct: 62.0,
      average_daily_rate_adr: 185,
      same_store_sales_growth_pct: -1.5,
      property_occupancy_pct: 82.0,
      base_rent_per_sqft: 32.0,
      revenue_growth_pct: 3.0,
    },
  },
];

// Generates 3 years of reconciled historical statements for any company
export function getHistoricalBase(company: Company) {
  const periods: ModelPeriod[] = [
    { year: 2023, periodLabel: 'FY2023A', type: 'historical' },
    { year: 2024, periodLabel: 'FY2024A', type: 'historical' },
    { year: 2025, periodLabel: 'FY2025A', type: 'historical' },
  ];

  // Base revenue scaling per sector
  let baseRev23 = 68.5;
  let grossMargin = 0.76;
  let opexRatio = 0.58;

  if (company.sectorId === 'healthcare') {
    baseRev23 = 45.0;
    grossMargin = 0.46;
    opexRatio = 0.28;
  } else if (company.sectorId === 'manufacturing') {
    baseRev23 = 82.0;
    grossMargin = 0.42;
    opexRatio = 0.22;
  } else if (company.sectorId === 'hospitality') {
    baseRev23 = 54.0;
    grossMargin = 0.60;
    opexRatio = 0.36;
  } else if (company.sectorId === 'retail') {
    baseRev23 = 140.0;
    grossMargin = 0.45;
    opexRatio = 0.34;
  } else if (company.sectorId === 'real_estate') {
    baseRev23 = 42.0;
    grossMargin = 0.72;
    opexRatio = 0.16;
  } else if (company.sectorId === 'banking') {
    baseRev23 = 58.0;
    grossMargin = 0.88;
    opexRatio = 0.54;
  }

  const incomeStatements: IncomeStatementRow[] = [];
  const balanceSheets: BalanceSheetRow[] = [];
  const cashFlowStatements: CashFlowStatementRow[] = [];

  let prevCash = 14.5;
  let prevRetained = 28.0;
  let prevNetPPE = baseRev23 * 0.45;

  periods.forEach((p, idx) => {
    const revMultiplier = 1 + idx * 0.14; // ~14% historical growth
    const revenue = baseRev23 * revMultiplier;
    const prevRev = idx === 0 ? revenue * 0.88 : incomeStatements[idx - 1].revenue;
    const growth = ((revenue - prevRev) / prevRev) * 100;

    const cogs = revenue * (1 - grossMargin);
    const grossProfit = revenue - cogs;
    const grossMarginPct = grossMargin * 100;

    const totalOpex = revenue * opexRatio;
    const sm = totalOpex * 0.45;
    const rd = totalOpex * 0.30;
    const ga = totalOpex * 0.25;

    const ebitda = grossProfit - totalOpex;
    const ebitdaMarginPct = (ebitda / revenue) * 100;

    const da = prevNetPPE * 0.12;
    const ebit = ebitda - da;

    const interestExpense = 1.25;
    const interestIncome = 0.25;
    const ebt = ebit - interestExpense + interestIncome;

    const taxExpense = Math.max(0, ebt * 0.21);
    const effectiveTaxRatePct = ebt > 0 ? 21.0 : 0;
    const netIncome = ebt - taxExpense;
    const netMarginPct = (netIncome / revenue) * 100;

    incomeStatements.push({
      period: p,
      revenue,
      revenueGrowthPct: growth,
      cogs,
      grossProfit,
      grossMarginPct,
      salesMarketing: sm,
      researchDevelopment: rd,
      generalAdmin: ga,
      totalOpex,
      ebitda,
      ebitdaMarginPct,
      depreciationAmortization: da,
      ebit,
      interestExpense,
      interestIncome,
      ebt,
      taxExpense,
      effectiveTaxRatePct,
      netIncome,
      netMarginPct,
    });

    // Balance sheet components
    const accountsReceivable = (revenue / 365) * 42;
    const inventory = (cogs / 365) * 35;
    const otherCurrentAssets = 2.5;

    const capex = revenue * 0.055;
    const netPPE = prevNetPPE + capex - da;
    prevNetPPE = netPPE;

    const intangibles = 8.0;
    const accountsPayable = (cogs / 365) * 38;
    const accruedExpenses = totalOpex * 0.08;
    const shortTermDebt = 2.0;
    const longTermDebt = 22.0;
    const commonStock = 25.0;

    const dividends = netIncome > 0 ? netIncome * 0.15 : 0;
    const retainedEarnings = prevRetained + netIncome - dividends;
    prevRetained = retainedEarnings;

    const totalEquity = commonStock + retainedEarnings;
    const totalLiabilities = accountsPayable + accruedExpenses + shortTermDebt + longTermDebt;
    const totalLiabEquity = totalLiabilities + totalEquity;

    const nonCashAssets = accountsReceivable + inventory + otherCurrentAssets + netPPE + intangibles;
    const cash = Math.max(4.0, totalLiabEquity - nonCashAssets);
    const totalCurrentAssets = cash + accountsReceivable + inventory + otherCurrentAssets;
    const totalAssets = totalCurrentAssets + netPPE + intangibles;

    const balanceDelta = Number((totalAssets - totalLiabEquity).toFixed(4));

    balanceSheets.push({
      period: p,
      cashAndEquivalents: cash,
      accountsReceivable,
      inventory,
      otherCurrentAssets,
      totalCurrentAssets,
      grossPPE: netPPE * 1.6,
      accumulatedDepreciation: netPPE * 0.6,
      netPPE,
      intangiblesAndOther: intangibles,
      totalNonCurrentAssets: netPPE + intangibles,
      totalAssets,
      accountsPayable,
      accruedExpenses,
      shortTermDebt,
      totalCurrentLiabilities: accountsPayable + accruedExpenses + shortTermDebt,
      longTermDebt,
      totalLiabilities,
      commonStock,
      retainedEarnings,
      totalEquity,
      totalLiabilitiesAndEquity: totalLiabEquity,
      balanceDelta,
    });

    const netChangeInCash = cash - prevCash;
    prevCash = cash;

    cashFlowStatements.push({
      period: p,
      netIncome,
      depreciationAmortization: da,
      deltaAccountsReceivable: -(accountsReceivable * 0.1),
      deltaInventory: -(inventory * 0.1),
      deltaAccountsPayable: accountsPayable * 0.1,
      deltaAccruedExpenses: accruedExpenses * 0.05,
      cashFromOperations: netIncome + da - 1.2,
      capex: -capex,
      cashFromInvesting: -capex,
      debtIssued: 0,
      debtRepaid: 1.0,
      equityIssued: 0,
      dividendsPaid: dividends,
      cashFromFinancing: -1.0 - dividends,
      netChangeInCash,
      beginningCash: cash - netChangeInCash,
      endingCash: cash,
    });
  });

  return {
    periods,
    incomeStatements,
    balanceSheets,
    cashFlowStatements,
  };
}
