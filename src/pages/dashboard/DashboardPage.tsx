/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useModelContext } from '@/contexts/ModelContext';
import { PageShell } from '@/components/layout/PageShell';
import { SECTOR_BLUEPRINTS } from '@/engine/blueprints';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  DollarSign,
  FileText,
  Layers,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

export function DashboardPage({
  onNavigateTab,
}: {
  onNavigateTab: (tabId: string, subTabId?: string) => void;
}) {
  const { activeCompany, calculationRun, activeScenarioId, openDriverDrawer } = useModelContext();
  const blueprint = SECTOR_BLUEPRINTS[activeCompany.sectorId] || SECTOR_BLUEPRINTS.general;

  const [activeTab, setActiveTab] = useState<'overview' | 'health'>('overview');

  const { incomeStatements, balanceSheets, valuation, validation, explanations } = calculationRun;

  const lastHist = incomeStatements.filter((s) => s.period.type === 'historical').pop()!;
  const lastFore = incomeStatements[incomeStatements.length - 1];

  const sym = activeCompany.currencySymbol;
  const currentCash = balanceSheets[balanceSheets.length - 1].cashAndEquivalents;
  const currentDebt = balanceSheets[balanceSheets.length - 1].shortTermDebt + balanceSheets[balanceSheets.length - 1].longTermDebt;

  return (
    <PageShell
      moduleName="Executive Intelligence"
      title={activeCompany.name}
      titleHighlight="Corporate Model"
      description={`Configured via ${blueprint.name} Blueprint (${activeCompany.accountingBasis} • ${activeCompany.currency}). Real-time 3-statement integrated calculation with zero-plug validation.`}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('models', 'workspace')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-card border border-border text-xs font-semibold uppercase tracking-[0.08em] text-foreground hover:bg-muted shadow-xs transition-colors"
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Open Workspace</span>
          </button>
          <button
            type="button"
            onClick={() => openDriverDrawer(blueprint.drivers[0].id)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground hover:bg-primary/90 shadow-none transition-colors"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Calibrate Drivers</span>
          </button>
        </div>
      }
    >
      {/* In-page View Switcher */}
      <div className="flex items-center gap-1 bg-muted/60 rounded-md p-1 w-fit border border-border">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
            activeTab === 'overview'
              ? 'bg-card text-primary shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Executive Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('health')}
          className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
            activeTab === 'health'
              ? 'bg-card text-primary shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Model Health & Audit</span>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.2 rounded-full">
            {validation.passedCount}/{validation.checks.length}
          </span>
        </button>
      </div>

      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Revenue FY30E */}
            <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Revenue (FY{lastFore.period.year}E)
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded bg-primary-soft text-primary">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-semibold tracking-tight text-foreground font-mono">
                {sym}{lastFore.revenue.toFixed(1)}M
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span className="font-semibold">
                  +{(((lastFore.revenue - lastHist.revenue) / lastHist.revenue) * 100).toFixed(1)}%
                </span>
                <span className="text-muted-foreground">vs FY{lastHist.period.year}A</span>
              </div>
            </div>

            {/* Card 2: EBITDA Margin */}
            <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  EBITDA Margin
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded bg-primary-soft text-primary">
                  <BarChart2 className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-semibold tracking-tight text-foreground font-mono">
                {lastFore.ebitdaMarginPct.toFixed(1)}%
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground font-mono">
                  {sym}{lastFore.ebitda.toFixed(1)}M
                </span>
                <span>operating earnings</span>
              </div>
            </div>

            {/* Card 3: Enterprise Value (DCF) */}
            <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  Enterprise Value (DCF)
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded bg-primary-soft text-primary">
                  <DollarSign className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-semibold tracking-tight text-primary font-mono">
                {sym}{valuation.enterpriseValue.toFixed(1)}M
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>WACC:</span>
                <span className="font-semibold font-mono text-foreground">
                  {valuation.waccInputs.wacc.toFixed(2)}%
                </span>
                <span>• g: {valuation.terminalGrowthRatePct}%</span>
              </div>
            </div>

            {/* Card 4: Implied Share Price / Equity Value */}
            <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                  {activeCompany.isListed ? 'Implied Share Price' : 'Implied Equity Value'}
                </span>
                <span className="flex h-7 w-7 items-center justify-center rounded bg-primary-soft text-primary">
                  <Sparkles className="h-4 w-4" />
                </span>
              </div>
              <div className="text-2xl font-semibold tracking-tight text-foreground font-mono">
                {sym}
                {activeCompany.isListed
                  ? valuation.impliedSharePrice.toFixed(2)
                  : `${valuation.impliedEquityValue.toFixed(1)}M`}
              </div>
              {valuation.upsideDownsidePct !== undefined ? (
                <div
                  className={`flex items-center gap-1.5 text-xs ${
                    valuation.upsideDownsidePct >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {valuation.upsideDownsidePct >= 0 ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  <span className="font-semibold">
                    {valuation.upsideDownsidePct >= 0 ? '+' : ''}
                    {valuation.upsideDownsidePct.toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">vs current trading</span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  Unlisted private equity valuation
                </div>
              )}
            </div>
          </div>

          {/* Trajectory Table / Visual Progress Strip */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-semibold text-foreground tracking-tight">
                  Financial Trajectory & Statement Synthesis
                </h3>
                <p className="text-xs text-muted-foreground">
                  Historical track record (FY23–25A) and integrated 5-year forecast (FY26–30E).
                </p>
              </div>
              <span className="text-xs font-semibold text-primary bg-primary-soft px-2.5 py-1 rounded">
                Scenario: {activeScenarioId.toUpperCase()}
              </span>
            </div>

            {/* Responsive Table with Shading */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-3.5 py-2.5">Financial Metric ({sym}M)</th>
                    {incomeStatements.map((row) => (
                      <th
                        key={row.period.year}
                        className={`px-3.5 py-2.5 text-right font-mono ${
                          row.period.type === 'forecast' ? 'bg-primary-soft/40 text-primary font-bold' : ''
                        }`}
                      >
                        {row.period.periodLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-mono text-xs">
                  {/* Revenue */}
                  <tr className="hover:bg-muted/40 font-semibold">
                    <td className="px-3.5 py-2 text-foreground font-sans">Total Net Revenue</td>
                    {incomeStatements.map((r) => (
                      <td
                        key={r.period.year}
                        className={`px-3.5 py-2 text-right ${
                          r.period.type === 'forecast' ? 'bg-primary-soft/10 text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {sym}{r.revenue.toFixed(1)}
                      </td>
                    ))}
                  </tr>

                  {/* Growth Rate */}
                  <tr className="hover:bg-muted/40 text-[11px] text-muted-foreground">
                    <td className="px-3.5 py-1.5 pl-6 font-sans">Revenue Growth YoY %</td>
                    {incomeStatements.map((r) => (
                      <td
                        key={r.period.year}
                        className={`px-3.5 py-1.5 text-right ${
                          r.revenueGrowthPct >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        } ${r.period.type === 'forecast' ? 'bg-primary-soft/10' : ''}`}
                      >
                        {r.revenueGrowthPct >= 0 ? '+' : ''}{r.revenueGrowthPct.toFixed(1)}%
                      </td>
                    ))}
                  </tr>

                  {/* Gross Profit */}
                  <tr className="hover:bg-muted/40">
                    <td className="px-3.5 py-2 text-foreground font-sans">Gross Profit</td>
                    {incomeStatements.map((r) => (
                      <td
                        key={r.period.year}
                        className={`px-3.5 py-2 text-right ${
                          r.period.type === 'forecast' ? 'bg-primary-soft/10 text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {sym}{r.grossProfit.toFixed(1)}
                      </td>
                    ))}
                  </tr>

                  {/* EBITDA */}
                  <tr className="hover:bg-muted/40 font-semibold bg-muted/20">
                    <td className="px-3.5 py-2 text-foreground font-sans">EBITDA</td>
                    {incomeStatements.map((r) => (
                      <td
                        key={r.period.year}
                        className={`px-3.5 py-2 text-right font-bold ${
                          r.period.type === 'forecast' ? 'bg-primary-soft/20 text-primary' : 'text-foreground'
                        }`}
                      >
                        {sym}{r.ebitda.toFixed(1)}
                      </td>
                    ))}
                  </tr>

                  {/* Free Cash Flow */}
                  <tr className="hover:bg-muted/40">
                    <td className="px-3.5 py-2 text-foreground font-sans">Free Cash Flow to Firm (FCFF)</td>
                    {incomeStatements.map((r, i) => {
                      const fcffVal =
                        r.period.type === 'forecast'
                          ? valuation.fcffSchedule[i - 3]?.fcff ?? 0
                          : r.netIncome * 0.85;
                      return (
                        <td
                          key={r.period.year}
                          className={`px-3.5 py-2 text-right ${
                            r.period.type === 'forecast' ? 'bg-primary-soft/10 font-bold text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {sym}{fcffVal.toFixed(1)}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Balance Sheet Ending Cash */}
                  <tr className="hover:bg-muted/40 text-[11px]">
                    <td className="px-3.5 py-2 text-foreground font-sans">Ending Cash & Equivalents</td>
                    {balanceSheets.map((b) => (
                      <td
                        key={b.period.year}
                        className={`px-3.5 py-2 text-right ${
                          b.period.type === 'forecast' ? 'bg-primary-soft/10 text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {sym}{b.cashAndEquivalents.toFixed(1)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Explain My Model Narrative Strip */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Deterministic Explanation */}
            <div className="rounded-lg border border-border bg-card p-6 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-soft text-primary">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Explain My Model</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Deterministic driver attribution & performance narrative
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs text-muted-foreground leading-relaxed">
                <p>{explanations.revenueDriverNarrative}</p>
                <p>{explanations.marginEvolutionNarrative}</p>
                <p>{explanations.cashRunwayNarrative}</p>
              </div>
            </div>

            {/* Valuation Bridge & Key Drivers */}
            <div className="rounded-lg border border-border bg-card p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Valuation Bridge & Capital Structure</h4>
                  <p className="text-[11px] text-muted-foreground">
                    Enterprise value to equity reconciliation
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('valuation', 'dcf')}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View DCF Model →
                </button>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2 rounded bg-muted/40">
                  <span className="font-sans text-foreground">Enterprise Value (PV FCFF + PV TV)</span>
                  <span className="font-bold text-foreground">{sym}{valuation.enterpriseValue.toFixed(1)}M</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/40">
                  <span className="font-sans text-emerald-700">(+) Balance Sheet Cash</span>
                  <span className="text-emerald-700">+{sym}{currentCash.toFixed(1)}M</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/40">
                  <span className="font-sans text-rose-700">(-) Total Debt Obligations</span>
                  <span className="text-rose-700">-{sym}{currentDebt.toFixed(1)}M</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded bg-primary-soft/50 font-bold border border-primary/20">
                  <span className="font-sans text-foreground">Implied Equity Value</span>
                  <span className="text-primary text-sm">{sym}{valuation.impliedEquityValue.toFixed(1)}M</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                {explanations.valuationBridgeNarrative}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Model Health & Validation Detail View */
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-semibold text-foreground tracking-tight">
                  Automated Financial Validation Engine
                </h3>
                <p className="text-xs text-muted-foreground">
                  Strict zero-plug verification, mathematical integrity checks, and covenant tests.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {validation.passedCount} Passed
                </span>
                {validation.warningCount > 0 && (
                  <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                    {validation.warningCount} Warnings
                  </span>
                )}
              </div>
            </div>

            {/* Checks List */}
            <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
              {validation.checks.map((chk) => (
                <div key={chk.id} className="p-4 flex items-start justify-between gap-4 bg-card hover:bg-muted/30">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-0.5 ${
                        chk.status === 'pass'
                          ? 'bg-emerald-50 text-emerald-600'
                          : chk.status === 'warning'
                          ? 'bg-amber-50 text-amber-600'
                          : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {chk.status === 'pass' ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-foreground">{chk.title}</span>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                          {chk.category}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{chk.description}</p>
                      <p className="text-xs text-foreground font-medium mt-1.5">{chk.detail}</p>
                    </div>
                  </div>

                  {chk.metricValue && (
                    <span className="shrink-0 text-xs font-mono font-bold text-foreground bg-muted px-2.5 py-1 rounded">
                      {chk.metricValue}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
