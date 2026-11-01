import type { Company, IncomeStatementRow, ValuationOutput, ValuationOverrides } from '@/types/finance';
import { buildWorkbook, downloadWorkbook, type ExportBranding, type ReportExportDocument } from '@/lib/export';
import { ASSUMPTION_GUIDE, type NumericAssumptionKey } from '../engine/assumptions';
import { ASSUMPTION_CATALOG } from '../engine/assumptionsImport';

export interface ValuationReportInput {
  company: Company;
  scenarioName: string;
  valuation: ValuationOutput;
  /** The user's own values (overrides); anything absent is a model default. */
  assumptions: ValuationOverrides;
  incomeStatements: IncomeStatementRow[];
  /** e.g. "Workspace Acme · version 3" or "This browser only (not saved to a workspace)". */
  storageLabel: string;
  /** True when the exported figures include edits that are not saved as a version. */
  hasUnsavedChanges: boolean;
  historicalSourceLabel: string;
  generatedAt: Date;
  branding?: Partial<ExportBranding>;
}

const CHOICE_LABELS: Record<string, string> = {
  build_up: 'build_up', direct: 'direct', gordon_growth: 'gordon_growth', exit_multiple: 'exit_multiple', mid_year: 'mid_year', end_of_year: 'end_of_year',
};
const finite = (v: number | null | undefined) => (v !== null && v !== undefined && Number.isFinite(v) ? v : null);

/** Value actually used by the model for each assumption, and whether it came from the user. */
function assumptionRows(v: ValuationOutput, a: ValuationOverrides) {
  const effective: Record<string, string | number | null> = {
    valuationDate: a.valuationDate ?? null,
    cashFlowTiming: v.cashFlowTiming,
    waccMode: a.waccMode ?? 'build_up',
    riskFreeRate: v.waccInputs.riskFreeRate,
    equityBeta: v.waccInputs.equityBeta,
    equityRiskPremium: v.waccInputs.equityRiskPremium,
    preTaxCostOfDebt: v.waccInputs.preTaxCostOfDebt,
    targetDebtRatio: v.waccInputs.targetDebtRatio,
    directWacc: a.directWacc ?? null,
    terminalGrowthRate: v.terminalGrowthRatePct,
    exitMultiple: v.exitMultipleEVtoEBITDA,
    leaseLiabilities: a.leaseLiabilities ?? null,
    minorityInterest: a.minorityInterest ?? null,
    preferredEquity: a.preferredEquity ?? null,
    nonOperatingInvestments: a.nonOperatingInvestments ?? null,
    terminalValueMethod: v.terminalValueMethod,
  };
  return ASSUMPTION_CATALOG.map((e) => {
    const raw = effective[e.key];
    const value = typeof raw === 'string' ? CHOICE_LABELS[raw] ?? raw : raw;
    const own = (a as Record<string, unknown>)[e.key] !== undefined;
    const bridgeItem = e.key in ASSUMPTION_GUIDE && ASSUMPTION_GUIDE[e.key as NumericAssumptionKey].unit === 'M';
    // "default" keeps the sheet re-importable: it means "no value of your own" on upload.
    return {
      assumption: e.label,
      value: value ?? 'default',
      unit: e.unit,
      source: own ? 'Your input' : value === null ? (bridgeItem ? 'Not provided' : 'Not set') : 'Model default',
    };
  });
}

export function buildValuationReportDocs(input: ValuationReportInput): ReportExportDocument[] {
  const { company, valuation: v } = input;
  const currency = company.currency;
  const branding: ExportBranding = { companyName: company.name, ...input.branding };
  const unit = `${currency} millions`;
  const date = input.generatedAt.toISOString().slice(0, 10);
  const subtitle = `${input.scenarioName} scenario · Generated ${date}`;
  const invalid = v.dcfStatus === 'invalid';
  const common = { branding, currency, reportSubtitle: subtitle };
  const footnote = 'Estimate produced by the xlPro equity DCF engine from forecast assumptions. It is not an audited figure, a fairness opinion or investment advice. '
    + `Historical data source: ${input.historicalSourceLabel}.`;

  const summary: ReportExportDocument = {
    ...common,
    sheetName: 'Summary',
    reportTitle: `${company.name} — DCF valuation`,
    caption: input.hasUnsavedChanges ? 'Includes unsaved changes: these figures do not match any saved version.' : undefined,
    metaBlocks: [
      { title: 'About this valuation', rows: [
        { label: 'Company', value: company.name },
        { label: 'Scenario', value: input.scenarioName },
        { label: 'Currency and units', value: `${unit} (per-share values in ${currency})` },
        { label: 'Valuation date', value: v.valuationDate ?? 'Start of the first forecast year' },
        { label: 'Assumptions stored in', value: input.storageLabel },
        { label: 'Engine version', value: v.engineVersion },
        { label: 'Status', value: invalid ? `Not valued — ${v.dcfErrors.join(' ')}` : 'Valued', emphasis: invalid },
      ] },
      { title: 'Result', rows: [
        { label: `Value per share (${currency})`, value: finite(v.impliedSharePrice), format: 'number', emphasis: true },
        { label: `Value for shareholders (${unit})`, value: finite(v.impliedEquityValue), format: 'number', emphasis: true },
        { label: `Business value — EV (${unit})`, value: finite(v.enterpriseValue), format: 'number' },
        { label: 'Required return — WACC (%)', value: finite(v.waccInputs.wacc), format: 'percent' },
        v.terminalValueMethod === 'gordon_growth'
          ? { label: 'Long-term growth (%)', value: finite(v.terminalGrowthRatePct), format: 'percent' }
          : { label: 'Exit multiple (EV / EBITDA)', value: finite(v.exitMultipleEVtoEBITDA), format: 'multiple' },
        { label: 'Share of value after the forecast (%)', value: finite(v.terminalShareOfEv) === null ? null : v.terminalShareOfEv * 100, format: 'percent' },
        { label: `Share price entered (${currency})`, value: finite(v.currentSharePrice), format: 'number' },
        { label: 'Difference vs entered price (%)', value: finite(v.upsideDownsidePct), format: 'percent' },
      ] },
    ],
    sections: [],
    footnote,
  };

  const assumptions: ReportExportDocument = {
    ...common,
    sheetName: 'Assumptions',
    reportTitle: 'Valuation assumptions',
    caption: 'This table uses the upload template layout, so it can be edited and uploaded again.',
    sections: [{
      columns: [
        { header: 'Assumption', accessor: 'assumption', width: 34 },
        { header: 'Value', accessor: 'value', width: 16 },
        { header: 'Unit', accessor: 'unit', width: 10 },
        { header: 'Source', accessor: 'source', width: 16 },
      ],
      rows: assumptionRows(v, input.assumptions),
    }],
  };

  const actuals = input.incomeStatements.filter((r) => r.period.type === 'historical');
  const cashFlows: ReportExportDocument = {
    ...common,
    sheetName: 'Cash flows',
    reportTitle: `Free cash flow and present value (${unit})`,
    caption: 'Forecast years are estimates. Discount period is in years from the valuation date.',
    sections: [
      {
        title: 'Forecast (estimates)',
        tag: v.cashFlowTiming === 'mid_year' ? 'Mid-year timing' : 'End-of-year timing',
        columns: [
          { header: 'Year', accessor: (r: ValuationOutput['fcffSchedule'][number]) => r.period.periodLabel },
          { header: 'EBIT', accessor: 'ebit', format: 'number', align: 'right' },
          { header: 'Tax on EBIT', accessor: 'taxOnEbit', format: 'number', align: 'right' },
          { header: 'NOPAT', accessor: 'nopat', format: 'number', align: 'right' },
          { header: '+ D&A', accessor: 'depreciationAmortization', format: 'number', align: 'right' },
          { header: '− CapEx', accessor: 'capex', format: 'number', align: 'right' },
          { header: '− Increase in NWC', accessor: 'deltaNWC', format: 'number', align: 'right' },
          { header: 'Free cash flow', accessor: 'fcff', format: 'number', align: 'right', total: true },
          { header: 'Discount period', accessor: 'discountPeriod', format: 'number', align: 'right' },
          { header: 'Discount factor', accessor: 'discountFactor', format: 'decimal4', align: 'right' },
          { header: 'Present value', accessor: 'pvFCFF', format: 'number', align: 'right', total: true },
        ],
        rows: v.fcffSchedule,
        showSubtotal: v.fcffSchedule.length > 0,
        subtotalLabel: 'Total',
      },
      {
        title: 'Recent actuals (context)',
        tag: 'Actual',
        columns: [
          { header: 'Year', accessor: (r: IncomeStatementRow) => r.period.periodLabel },
          { header: 'Revenue', accessor: 'revenue', format: 'number', align: 'right' },
          { header: 'EBITDA', accessor: 'ebitda', format: 'number', align: 'right' },
          { header: 'EBIT', accessor: 'ebit', format: 'number', align: 'right' },
        ],
        rows: actuals.slice(-3),
      },
    ],
  };

  const b = v.bridge;
  const missing = new Set(b?.notProvided ?? []);
  const line = (label: string, value: number | null | undefined, kind: 'add' | 'less' | 'total', key?: string) => ({
    label: `${kind === 'add' ? '+ ' : kind === 'less' ? '− ' : '= '}${label}`,
    value: key && missing.has(key) ? null : finite(value ?? null),
    note: key && missing.has(key) ? 'Not provided' : '',
    total: kind === 'total',
  });
  const bridgeRows = invalid || !b ? [] : [
    line('Value of forecast-year cash', v.sumPvFCFF, 'add'),
    line('Value of cash after the forecast', v.pvOfTerminalValue, 'add'),
    line('Business value (EV)', v.enterpriseValue, 'total'),
    line('Cash', b.cash, 'add', 'cash'),
    line('Non-operating investments', b.nonOperatingInvestments, 'add', 'nonOperatingInvestments'),
    line('Debt', b.debt, 'less', 'debt'),
    line('Lease liabilities', b.leaseLiabilities, 'less', 'leaseLiabilities'),
    line('Minority interest', b.minorityInterest, 'less', 'minorityInterest'),
    line('Preferred equity', b.preferredEquity, 'less', 'preferredEquity'),
    line('Value for shareholders', v.impliedEquityValue, 'total'),
  ];
  const bridge: ReportExportDocument = {
    ...common,
    sheetName: 'Value bridge',
    reportTitle: `From business value to shareholder value (${unit})`,
    caption: 'Balance-sheet items are from the latest actual year. Items marked "Not provided" were not entered and are excluded, not assumed.',
    sections: [{
      columns: [{ header: 'Step', accessor: 'label', width: 36 }, { header: unit, accessor: 'value', format: 'number', align: 'right' }, { header: 'Note', accessor: 'note', width: 16 }],
      rows: bridgeRows,
      emphasizeRow: (r: { total: boolean }) => r.total,
    }],
  };

  const s = v.sensitivityMatrix;
  const isMultiple = s.secondAxis === 'exit_multiple';
  const sensitivity: ReportExportDocument = {
    ...common,
    sheetName: 'Sensitivity',
    reportTitle: s.metric === 'value_per_share' ? `Value per share (${currency})` : `Value for shareholders (${unit})`,
    caption: `Rows: required return (WACC, %). Columns: ${isMultiple ? 'exit multiple (x)' : 'long-term growth (%)'}. Each cell is a full recalculation; "Not available" means no finite value.`,
    sections: [{
      columns: [
        { header: 'WACC (%)', accessor: 'wacc', format: 'percent' },
        ...s.growthValues.map((g, i) => ({ header: isMultiple ? `${g.toFixed(1)}x` : `${g.toFixed(2)}%`, accessor: (r: { cells: (number | null)[] }) => r.cells[i], format: 'number' as const, align: 'right' as const })),
      ],
      rows: s.waccValues.map((w, i) => ({ wacc: w, cells: s.matrix[i] ?? [] })),
    }],
  };

  const checks: ReportExportDocument = {
    ...common,
    sheetName: 'Checks',
    reportTitle: 'Model checks',
    sections: [{
      columns: [{ header: 'Status', accessor: 'status', width: 10 }, { header: 'Check', accessor: 'title', width: 40 }, { header: 'Detail', accessor: 'detail', width: 90 }],
      rows: invalid ? v.dcfErrors.map((e) => ({ status: 'fail', title: 'Inputs cannot produce a value', detail: e })) : v.dcfChecks,
    }],
  };

  return [summary, assumptions, cashFlows, bridge, sensitivity, checks];
}

export function valuationReportFileName(company: Company, scenarioName: string, at: Date) {
  return `${company.name}-${scenarioName}-DCF-${at.toISOString().slice(0, 10)}`;
}

export function downloadValuationReport(input: ValuationReportInput): string {
  return downloadWorkbook(buildWorkbook(buildValuationReportDocs(input)), valuationReportFileName(input.company, input.scenarioName, input.generatedAt));
}
