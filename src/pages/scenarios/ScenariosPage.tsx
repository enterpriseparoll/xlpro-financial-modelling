/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { loadValuationAssumptions } from '@/features/equity-dcf/services/valuationAssumptionsStore';
import { useModelContext } from '@/contexts/ModelContext';
import { PageShell } from '@/components/layout/PageShell';
import { SECTOR_BLUEPRINTS } from '@/engine/blueprints';
import { calculateFinancialModel } from '@/engine/financialEngine';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GitCompare,
  Layers,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { ScenarioId } from '@/types/finance';
import { formatMillions, formatImpliedSharePrice } from '@/features/equity-dcf/components/formatValuation';

export function ScenariosPage() {
  const {
    activeCompany,
    scenarios,
    activeScenarioId,
    setActiveScenarioId,
    calculationRun,
    historicalBase,
    valuationAssumptions,
  } = useModelContext();

  const blueprint = SECTOR_BLUEPRINTS[activeCompany.sectorId] || SECTOR_BLUEPRINTS.general;
  const sym = activeCompany.currencySymbol;

  // Run calculation for Base, Bull, and Bear simultaneously for side-by-side comparison
  const scenarioRuns = scenarios.map((scen) => {
    return {
      scenario: scen,
      run: calculateFinancialModel({
        company: activeCompany,
        scenarioId: scen.id,
        driverOverrides: scen.driverOverrides,
        historicalBase,
        valuationOverrides: loadValuationAssumptions(activeCompany.id, scen.id),
      }),
    };
  });

  // Stress test simulator local states
  const [demandShockPct, setDemandShockPct] = useState<number>(-10.0);
  const [marginCompressBps, setMarginCompressBps] = useState<number>(-2.5);
  const [interestHikePct, setInterestHikePct] = useState<number>(2.0);

  // Compute stress test run
  const stressRun = calculateFinancialModel({
    company: activeCompany,
    scenarioId: 'custom',
    driverOverrides: {
      revenue_growth_pct: (blueprint.drivers.find((d) => d.id === 'revenue_growth_pct')?.defaultValue ?? 9.5) + demandShockPct,
      gross_margin_pct: (blueprint.drivers.find((d) => d.id === 'gross_margin_pct')?.defaultValue ?? 52.0) + marginCompressBps,
    },
    historicalBase,
    valuationOverrides: {
      ...valuationAssumptions,
      preTaxCostOfDebt: (calculationRun.valuation.waccInputs.preTaxCostOfDebt ?? 5.5) + interestHikePct,
    },
  });

  return (
    <PageShell
      moduleName="Scenario Analysis & Stress Testing"
      title={activeCompany.name}
      titleHighlight="Scenarios"
      description="Compare Base, Bull, and Bear operational scenarios side by side, and simulate severe macroeconomic shocks."
      actions={
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1.5 rounded">
            Active: <strong className="text-foreground uppercase">{activeScenarioId}</strong>
          </span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Side-by-Side Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {scenarioRuns.map(({ scenario, run }) => {
            const isActive = activeScenarioId === scenario.id;
            const lastIS = run.incomeStatements[run.incomeStatements.length - 1];
            const lastBS = run.balanceSheets[run.balanceSheets.length - 1];

            return (
              <div
                key={scenario.id}
                onClick={() => setActiveScenarioId(scenario.id)}
                className={`rounded-lg border p-5 transition-all cursor-pointer relative bg-card ${
                  isActive
                    ? 'border-primary shadow-md ring-2 ring-primary ring-offset-1'
                    : 'border-border shadow-xs hover:border-primary/40'
                }`}
              >
                {isActive && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded">
                    Active Scenario
                  </span>
                )}

                <div className="space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Scenario Calibration
                  </span>
                  <h3 className="text-base font-semibold text-foreground tracking-tight">
                    {scenario.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {scenario.description}
                  </p>
                </div>

                <div className="mt-4 pt-4 border-t border-border space-y-2.5 text-xs font-mono">
                  <div className="flex justify-between py-1">
                    <span className="font-sans text-muted-foreground">Revenue FY30E</span>
                    <span className="font-bold text-foreground">{sym}{lastIS.revenue.toFixed(1)}M</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="font-sans text-muted-foreground">EBITDA Margin</span>
                    <span className="font-bold text-foreground">{lastIS.ebitdaMarginPct.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="font-sans text-muted-foreground">Ending Cash</span>
                    <span className="font-bold text-emerald-700">{sym}{lastBS.cashAndEquivalents.toFixed(1)}M</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="font-sans text-muted-foreground">Enterprise Value</span>
                    <span className="font-bold text-primary">{formatMillions(sym, run.valuation.enterpriseValue)}</span>
                  </div>
                  <div className="flex justify-between py-1.5 bg-muted/60 px-2 rounded font-bold">
                    <span className="font-sans text-foreground">Implied Share Price</span>
                    <span className="text-foreground text-sm font-bold">
                      {formatImpliedSharePrice(sym, run.valuation)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveScenarioId(scenario.id);
                  }}
                  className={`w-full mt-4 h-9 rounded-md text-xs font-semibold uppercase tracking-[0.08em] transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  {isActive ? 'Currently Active' : 'Switch To This Scenario'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Macroeconomic Stress Testing Panel */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-primary" />
                <h3 className="text-base font-semibold text-foreground">
                  Dynamic Stress Test Simulator
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Apply severe macroeconomic demand shocks, gross margin compression, and debt interest spikes.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
              Simulated Resilience
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {/* Control 1: Demand Shock */}
            <div className="space-y-2 rounded-lg border border-border p-4 bg-muted/20">
              <div className="flex justify-between text-xs font-semibold">
                <span>Top-Line Demand Shock</span>
                <span className="font-mono text-rose-700 font-bold">{demandShockPct}%</span>
              </div>
              <input
                type="range"
                min={-30}
                max={5}
                step={1}
                value={demandShockPct}
                onChange={(e) => setDemandShockPct(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-[11px] text-muted-foreground">Simulates contract cancellation or store traffic decline.</p>
            </div>

            {/* Control 2: Margin Compression */}
            <div className="space-y-2 rounded-lg border border-border p-4 bg-muted/20">
              <div className="flex justify-between text-xs font-semibold">
                <span>Gross Margin Compression</span>
                <span className="font-mono text-rose-700 font-bold">{marginCompressBps}% pts</span>
              </div>
              <input
                type="range"
                min={-10}
                max={2}
                step={0.5}
                value={marginCompressBps}
                onChange={(e) => setMarginCompressBps(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-[11px] text-muted-foreground">Simulates input cost inflation and vendor price hikes.</p>
            </div>

            {/* Control 3: Debt Interest Hike */}
            <div className="space-y-2 rounded-lg border border-border p-4 bg-muted/20">
              <div className="flex justify-between text-xs font-semibold">
                <span>Benchmark Interest Hike</span>
                <span className="font-mono text-primary font-bold">+{interestHikePct}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={6}
                step={0.25}
                value={interestHikePct}
                onChange={(e) => setInterestHikePct(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-[11px] text-muted-foreground">Central bank policy tightening on floating debt rate.</p>
            </div>
          </div>

          {/* Stress Results Summary */}
          <div className="p-4 rounded-lg bg-primary-soft/30 border border-primary/20 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground font-sans">Stressed Revenue</span>
              <p className="text-base font-bold text-foreground mt-0.5">
                {sym}{stressRun.incomeStatements[stressRun.incomeStatements.length - 1].revenue.toFixed(1)}M
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground font-sans">Stressed EBITDA</span>
              <p className="text-base font-bold text-foreground mt-0.5">
                {sym}{stressRun.incomeStatements[stressRun.incomeStatements.length - 1].ebitda.toFixed(1)}M
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground font-sans">Minimum Cash Buffer</span>
              <p className={`text-base font-bold mt-0.5 ${
                Math.min(...stressRun.balanceSheets.map((b) => b.cashAndEquivalents)) < 2.0
                  ? 'text-rose-700'
                  : 'text-emerald-700'
              }`}>
                {sym}{Math.min(...stressRun.balanceSheets.map((b) => b.cashAndEquivalents)).toFixed(1)}M
              </p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground font-sans">Stressed Equity Value</span>
              <p className="text-base font-bold text-primary mt-0.5">
                {formatMillions(sym, stressRun.valuation.impliedEquityValue)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
