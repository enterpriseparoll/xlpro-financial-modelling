/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useModelContext } from '@/contexts/ModelContext';
import { PageShell } from '@/components/layout/PageShell';
import { SECTOR_BLUEPRINTS } from '@/engine/blueprints';
import {
  Calculator,
  ChevronRight,
  DollarSign,
  GitCompare,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { formatMillions, formatMultiple, formatImpliedSharePrice } from '@/features/equity-dcf/components/formatValuation';
import { ValuationInvalidNotice } from '@/features/equity-dcf/components/ValuationInvalidNotice';
import { GuidedValuationWorkspace } from '@/features/equity-dcf/components/GuidedValuationWorkspace';

export type ValuationSubView = 'guided' | 'dcf' | 'comps' | 'sensitivity' | 'tornado';

export function ValuationPage({
  subTab = 'guided',
}: {
  subTab?: ValuationSubView;
}) {
  const { activeCompany, calculationRun, openDriverDrawer } = useModelContext();
  const blueprint = SECTOR_BLUEPRINTS[activeCompany.sectorId] || SECTOR_BLUEPRINTS.general;
  const { valuation, tornadoSensitivities } = calculationRun;
  const sym = activeCompany.currencySymbol;
  const { growthValues: axisValues } = valuation.sensitivityMatrix;
  const centreAxisValue = axisValues[Math.floor(axisValues.length / 2)];

  const [activeSubView, setActiveSubView] = useState<ValuationSubView>(subTab);
  useEffect(() => setActiveSubView(subTab), [subTab]);

  return (
    <PageShell
      moduleName="Valuation & Capital Structure"
      title={activeCompany.name}
      titleHighlight="Valuation Engine"
      description="Discounted Cash Flow (FCFF), Weighted Average Cost of Capital (WACC), Trading Comparables, and 2-Variable Sensitivity Matrix."
      actions={
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-primary bg-primary-soft px-3 py-2 rounded-md border border-primary/20">
            Implied EV: {formatMillions(sym, valuation.enterpriseValue)}
          </span>
        </div>
      }
    >
      {/* Sub-view switcher */}
      <div className="flex items-center gap-1 bg-muted/60 rounded-md p-1 w-fit border border-border">
        {[
          { key: 'guided', label: 'Guided valuation' },
          { key: 'dcf', label: 'DCF & WACC Engine' },
          { key: 'comps', label: 'Trading Comparables' },
          { key: 'sensitivity', label: '2D Sensitivity Matrix' },
          { key: 'tornado', label: 'Tornado Attribution Chart' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveSubView(tab.key as typeof activeSubView)}
            className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
              activeSubView === tab.key
                ? 'bg-card text-primary shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeSubView === 'guided' && <GuidedValuationWorkspace onOpenAnalystView={() => setActiveSubView('dcf')} />}

      {activeSubView !== 'guided' && <ValuationInvalidNotice valuation={valuation} />}

      {/* ── SUB-VIEW 1: DCF & WACC ENGINE ── */}
      {activeSubView === 'dcf' && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Enterprise Value (EV)
              </span>
              <p className="text-2xl font-bold font-mono text-primary mt-1">
                {formatMillions(sym, valuation.enterpriseValue)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">PV FCFF + PV Terminal Value</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Net Debt (Debt - Cash)
              </span>
              <p className="text-2xl font-bold font-mono text-foreground mt-1">
                {formatMillions(sym, valuation.netDebt)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {valuation.dcfStatus === 'invalid'
                  ? 'Not available'
                  : `${formatMillions(sym, valuation.balanceSheetDebt)} debt - ${formatMillions(sym, valuation.balanceSheetCash)} cash`}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Implied Equity Value
              </span>
              <p className="text-2xl font-bold font-mono text-primary mt-1">
                {formatMillions(sym, valuation.impliedEquityValue)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Available to common equity</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Implied Value / Share
              </span>
              <p className="text-2xl font-bold font-mono text-foreground mt-1">
                {formatImpliedSharePrice(sym, valuation)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {valuation.dcfStatus === 'invalid'
                  ? 'Not available'
                  : valuation.impliedSharePrice === null
                  ? 'Enter diluted shares outstanding to see value per share'
                  : `Based on ${valuation.shareCount.toFixed(1)}M diluted shares`}
              </p>
            </div>
          </div>

          {/* FCFF Schedule Table */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Free Cash Flow to Firm (FCFF) Projections
                </h3>
                <p className="text-xs text-muted-foreground">
                  Mid-year discounting convention applied at WACC = {valuation.waccInputs.wacc.toFixed(2)}%.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse font-mono">
                <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-3.5 py-2.5 font-sans">Cash Flow Line Item ({sym}M)</th>
                    {valuation.fcffSchedule.map((row) => (
                      <th key={row.period.year} className="px-3.5 py-2.5 text-right font-bold text-foreground">
                        {row.period.periodLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="hover:bg-muted/40 font-semibold">
                    <td className="px-3.5 py-2 font-sans text-foreground">EBIT (Operating Income)</td>
                    {valuation.fcffSchedule.map((r) => (
                      <td key={r.period.year} className="px-3.5 py-2 text-right">{sym}{r.ebit.toFixed(2)}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-muted/40 text-rose-700">
                    <td className="px-3.5 py-2 font-sans pl-6">(-) Taxes on EBIT (NOPAT Adjustment)</td>
                    {valuation.fcffSchedule.map((r) => (
                      <td key={r.period.year} className="px-3.5 py-2 text-right">({sym}{r.taxOnEbit.toFixed(2)})</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-muted/40 font-semibold bg-muted/10">
                    <td className="px-3.5 py-2 font-sans text-foreground">NOPAT</td>
                    {valuation.fcffSchedule.map((r) => (
                      <td key={r.period.year} className="px-3.5 py-2 text-right">{sym}{r.nopat.toFixed(2)}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-muted/40 text-emerald-700">
                    <td className="px-3.5 py-2 font-sans pl-6">(+) D&A Non-Cash Expense</td>
                    {valuation.fcffSchedule.map((r) => (
                      <td key={r.period.year} className="px-3.5 py-2 text-right">+{sym}{r.depreciationAmortization.toFixed(2)}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-muted/40 text-rose-700">
                    <td className="px-3.5 py-2 font-sans pl-6">(-) Capital Expenditures (CAPEX)</td>
                    {valuation.fcffSchedule.map((r) => (
                      <td key={r.period.year} className="px-3.5 py-2 text-right">({sym}{r.capex.toFixed(2)})</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-muted/40 text-muted-foreground">
                    <td className="px-3.5 py-2 font-sans pl-6">(-) Change in Net Working Capital (ΔNWC)</td>
                    {valuation.fcffSchedule.map((r) => (
                      <td key={r.period.year} className="px-3.5 py-2 text-right">
                        {r.deltaNWC < 0 ? `+${sym}${Math.abs(r.deltaNWC).toFixed(2)}` : `(${sym}${r.deltaNWC.toFixed(2)})`}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-muted/40 font-bold bg-primary-soft/30 border-t border-border">
                    <td className="px-3.5 py-2.5 font-sans text-foreground">Free Cash Flow to Firm (FCFF)</td>
                    {valuation.fcffSchedule.map((r) => (
                      <td key={r.period.year} className="px-3.5 py-2.5 text-right text-primary text-sm font-bold">
                        {sym}{r.fcff.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-muted/40 text-[11px] text-muted-foreground">
                    <td className="px-3.5 py-1.5 font-sans pl-6">Discount Factor (Mid-Year Convention)</td>
                    {valuation.fcffSchedule.map((r) => (
                      <td key={r.period.year} className="px-3.5 py-1.5 text-right">{r.discountFactor.toFixed(4)}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-muted/40 font-bold bg-muted/20">
                    <td className="px-3.5 py-2 font-sans text-foreground">Present Value of FCFF</td>
                    {valuation.fcffSchedule.map((r) => (
                      <td key={r.period.year} className="px-3.5 py-2 text-right text-foreground font-bold">
                        {sym}{r.pvFCFF.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-VIEW 2: TRADING COMPARABLES ── */}
      {activeSubView === 'comps' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Public Market Peer Multiples ({blueprint.name})
              </h3>
              <p className="text-xs text-muted-foreground">
                Peer benchmark screening across EV/Sales, EV/EBITDA, and Price-to-Earnings ratios.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Peer Company</th>
                  <th className="px-4 py-3">Ticker</th>
                  <th className="px-4 py-3 text-right">EV / Revenue</th>
                  <th className="px-4 py-3 text-right">EV / EBITDA</th>
                  <th className="px-4 py-3 text-right">P / E</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {blueprint.samplePeers.map((peer) => (
                  <tr key={peer.ticker} className="hover:bg-muted/40">
                    <td className="px-4 py-2.5 font-sans font-semibold text-foreground">{peer.name}</td>
                    <td className="px-4 py-2.5 text-primary font-bold">{peer.ticker}</td>
                    <td className="px-4 py-2.5 text-right">{peer.evSales.toFixed(1)}x</td>
                    <td className="px-4 py-2.5 text-right font-bold text-foreground">{peer.evEbitda.toFixed(1)}x</td>
                    <td className="px-4 py-2.5 text-right">{peer.pe.toFixed(1)}x</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="text-[10px] font-sans font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                        Active Peer
                      </span>
                    </td>
                  </tr>
                ))}
                {/* Target Company Implied */}
                <tr className="bg-primary-soft/40 font-bold border-t-2 border-primary">
                  <td className="px-4 py-3 font-sans text-primary">{activeCompany.name} (Implied)</td>
                  <td className="px-4 py-3 text-primary">{activeCompany.ticker ?? 'UNLISTED'}</td>
                  <td className="px-4 py-3 text-right text-primary">
                    {formatMultiple(valuation.enterpriseValue, calculationRun.incomeStatements[calculationRun.incomeStatements.length - 1].revenue)}
                  </td>
                  <td className="px-4 py-3 text-right text-primary">
                    {formatMultiple(valuation.enterpriseValue, calculationRun.incomeStatements[calculationRun.incomeStatements.length - 1].ebitda)}
                  </td>
                  <td className="px-4 py-3 text-right text-primary">
                    {formatMultiple(valuation.impliedEquityValue, calculationRun.incomeStatements[calculationRun.incomeStatements.length - 1].netIncome)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-[10px] font-sans font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded">
                      Model Target
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUB-VIEW 3: 2D SENSITIVITY MATRIX ── */}
      {activeSubView === 'sensitivity' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                2-Variable Valuation Sensitivity Matrix
              </h3>
              <p className="text-xs text-muted-foreground">
                {valuation.sensitivityMatrix.metric === 'value_per_share' ? `Implied Share Price (${sym})` : `Implied Equity Value (${sym}M)`} across
                varying Discount Rates (WACC) vs{' '}
                {valuation.sensitivityMatrix.secondAxis === 'exit_multiple' ? 'Exit EV/EBITDA Multiples' : 'Perpetual Terminal Growth Rates (g)'}.
                Every cell is a full recalculation; "n/a" means the combination has no finite value.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse font-mono">
                <thead>
                  <tr className="border-b border-border bg-muted/60 text-[11px] font-bold">
                    <th className="px-4 py-3 text-left font-sans text-muted-foreground">
                      {valuation.sensitivityMatrix.secondAxis === 'exit_multiple' ? 'WACC \\ Exit multiple' : 'WACC \\ Growth (g)'}
                    </th>
                    {valuation.sensitivityMatrix.growthValues.map((g) => (
                      <th
                        key={g}
                        className={`px-4 py-3 ${
                          g === centreAxisValue ? 'bg-primary-soft text-primary font-bold' : 'text-foreground'
                        }`}
                      >
                        {valuation.sensitivityMatrix.secondAxis === 'exit_multiple' ? `${g.toFixed(1)}x` : `${g.toFixed(2)}%`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {valuation.sensitivityMatrix.waccValues.map((w, wIdx) => {
                    const isBaseWacc = Math.abs(w - valuation.waccInputs.wacc) < 0.05;
                    return (
                      <tr key={w} className={`hover:bg-muted/40 ${isBaseWacc ? 'bg-primary-soft/20' : ''}`}>
                        <td
                          className={`px-4 py-2.5 text-left font-bold ${
                            isBaseWacc ? 'text-primary bg-primary-soft font-bold' : 'text-foreground font-semibold'
                          }`}
                        >
                          {w.toFixed(2)}%
                        </td>
                        {valuation.sensitivityMatrix.growthValues.map((g, gIdx) => {
                          const val = valuation.sensitivityMatrix.matrix[wIdx]?.[gIdx] ?? null;
                          const isCenter = isBaseWacc && g === centreAxisValue;

                          return (
                            <td
                              key={g}
                              className={`px-4 py-2.5 text-sm font-bold ${
                                isCenter
                                  ? 'bg-primary text-primary-foreground font-black rounded-xs ring-2 ring-primary ring-offset-1'
                                  : 'text-foreground'
                              }`}
                            >
                              {val === null ? 'n/a' : `${sym}${val.toFixed(valuation.sensitivityMatrix.metric === 'value_per_share' ? 2 : 1)}`}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-muted-foreground pt-1">
              * Highlighted cell represents base-case valuation at WACC = {valuation.waccInputs.wacc.toFixed(2)}% and g = {valuation.terminalGrowthRatePct}%.
            </p>
          </div>
        </div>
      )}

      {/* ── SUB-VIEW 4: TORNADO SENSITIVITY CHART ── */}
      {activeSubView === 'tornado' && (
        <div className="rounded-lg border border-border bg-card p-6 shadow-xs space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Driver Sensitivity Ranking
              </span>
              <h3 className="text-base font-semibold text-foreground tracking-tight mt-0.5">
                Valuation Tornado Attribution Chart
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Displays the total Enterprise Value swing ({sym}M) resulting from an operational shock to each core driver.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-foreground bg-muted px-2.5 py-1 rounded">
              Base EV: {formatMillions(sym, valuation.enterpriseValue)}
            </span>
          </div>

          <div className="space-y-4">
            {tornadoSensitivities.map((item, idx) => {
              const maxSwing = tornadoSensitivities[0]?.evSwing || 1;
              const widthPct = Math.min(100, Math.max(15, (item.evSwing / maxSwing) * 100));

              return (
                <div
                  key={item.driverId}
                  onClick={() => openDriverDrawer(item.driverId)}
                  className="rounded-lg border border-border bg-background p-4 hover:border-primary/50 transition-all cursor-pointer group space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {item.driverName}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground bg-muted px-1.5 py-0.2 rounded">
                        {item.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-muted-foreground text-[11px]">EV Swing:</span>
                      <span className="text-primary font-bold text-sm">
                        &plusmn;{sym}{item.evSwing.toFixed(1)}M
                      </span>
                    </div>
                  </div>

                  {/* Tornado visual bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-muted/60 h-3 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${widthPct}%` }}
                        className="bg-primary h-full rounded-full transition-all duration-300"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-0.5">
                      <span>Downside: {sym}{item.downsideImpliedEV.toFixed(1)}M ({item.downsideValue} {item.unit})</span>
                      <span>Baseline: {formatMillions(sym, valuation.enterpriseValue)} ({item.baseValue} {item.unit})</span>
                      <span>Upside: {sym}{item.upsideImpliedEV.toFixed(1)}M ({item.upsideValue} {item.unit})</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PageShell>
  );
}
