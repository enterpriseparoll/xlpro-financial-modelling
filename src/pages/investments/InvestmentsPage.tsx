/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useModelContext } from '@/contexts/ModelContext';
import { PageShell } from '@/components/layout/PageShell';
import {
  ArrowRight,
  Calculator,
  Coins,
  Layers,
  PieChart,
  Plus,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Shareholder } from '@/types/finance';
import { formatMillions, formatPerShare } from '@/features/equity-dcf/components/formatValuation';
import { ValuationInvalidNotice } from '@/features/equity-dcf/components/ValuationInvalidNotice';

export function InvestmentsPage({
  subTab = 'captable',
}: {
  subTab?: 'captable' | 'returns';
}) {
  const { activeCompany, calculationRun } = useModelContext();
  const [activeSubView, setActiveSubView] = useState<'captable' | 'returns'>(subTab);

  const sym = activeCompany.currencySymbol;
  const impliedEquity = calculationRun.valuation.impliedEquityValue;

  // Cap table state
  const [shareholders, setShareholders] = useState<Shareholder[]>([
    {
      id: 'sh-1',
      name: 'Founders & Management Team',
      shareClass: 'Founders Common',
      sharesCount: 16.0,
      investmentAmount: 0.5,
      ownershipPct: 40.0,
      liquidationPrefMultiple: 1.0,
      isParticipating: false,
    },
    {
      id: 'sh-2',
      name: 'Blue Horizon Seed Capital',
      shareClass: 'Seed Preferred',
      sharesCount: 4.0,
      investmentAmount: 2.0,
      ownershipPct: 10.0,
      liquidationPrefMultiple: 1.0,
      isParticipating: false,
    },
    {
      id: 'sh-3',
      name: 'Vanguard Growth Partners (Series A)',
      shareClass: 'Series A Preferred',
      sharesCount: 10.0,
      investmentAmount: 12.0,
      ownershipPct: 25.0,
      liquidationPrefMultiple: 1.0,
      isParticipating: false,
    },
    {
      id: 'sh-4',
      name: 'Sovereign Institutional Fund (Series B)',
      shareClass: 'Series B Preferred',
      sharesCount: 6.0,
      investmentAmount: 18.0,
      ownershipPct: 15.0,
      liquidationPrefMultiple: 1.0,
      isParticipating: false,
    },
    {
      id: 'sh-5',
      name: 'Employee Stock Option Pool (ESOP)',
      shareClass: 'Option Pool / ESOP',
      sharesCount: 4.0,
      investmentAmount: 0.0,
      ownershipPct: 10.0,
      liquidationPrefMultiple: 1.0,
      isParticipating: false,
    },
  ]);

  // Total shares & invested
  const totalShares = shareholders.reduce((acc, s) => acc + s.sharesCount, 0);
  const totalInvested = shareholders.reduce((acc, s) => acc + s.investmentAmount, 0);

  // Exit simulator state
  const [exitValuation, setExitValuation] = useState<number>(Number.isFinite(impliedEquity) ? Math.round(impliedEquity * 1.25) : 0);
  const [holdingYears, setHoldingYears] = useState<number>(5);

  // Compute waterfall distribution & returns
  const exitReturns = shareholders.map((sh) => {
    // 1. Check liquidation preferences for preferred shares
    const prefPayment = sh.shareClass.includes('Preferred') ? sh.investmentAmount * sh.liquidationPrefMultiple : 0;
    const remainingPool = Math.max(0, exitValuation - totalInvested);
    const commonProceeds = (remainingPool * sh.ownershipPct) / 100;
    const totalProceeds = prefPayment + commonProceeds;

    const moic = sh.investmentAmount > 0 ? totalProceeds / sh.investmentAmount : totalProceeds > 0 ? 99.0 : 0;
    // IRR = (MOIC)^(1/years) - 1
    const irrPct = sh.investmentAmount > 0 ? (Math.pow(Math.max(0.01, moic), 1 / holdingYears) - 1) * 100 : 0;

    return {
      ...sh,
      totalProceeds,
      moic,
      irrPct,
    };
  });

  return (
    <PageShell
      moduleName="Investment Analysis & Private Equity"
      title={activeCompany.name}
      titleHighlight="Cap Table & Returns"
      description="Capital structure capitalization table, preference rights, dilution modeling, and exit waterfall return analysis (MOIC & IRR)."
    >
      {/* Sub-view switcher */}
      <div className="flex items-center gap-1 bg-muted/60 rounded-md p-1 w-fit border border-border">
        <button
          type="button"
          onClick={() => setActiveSubView('captable')}
          className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
            activeSubView === 'captable'
              ? 'bg-card text-primary shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Cap Table & Dilution
        </button>
        <button
          type="button"
          onClick={() => setActiveSubView('returns')}
          className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
            activeSubView === 'returns'
              ? 'bg-card text-primary shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Returns & Exit Waterfall (MOIC/IRR)
        </button>
      </div>

      <ValuationInvalidNotice valuation={calculationRun.valuation} />

      {/* ── SUB-VIEW 1: CAP TABLE & DILUTION ── */}
      {activeSubView === 'captable' && (
        <div className="space-y-6">
          {/* Top Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Diluted Shares
              </span>
              <p className="text-2xl font-bold font-mono text-foreground mt-1">
                {totalShares.toFixed(1)}M
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Common & Preferred instruments</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Cumulative Paid-In Capital
              </span>
              <p className="text-2xl font-bold font-mono text-primary mt-1">
                {sym}{totalInvested.toFixed(1)}M
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Total primary equity financing</p>
            </div>

            <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Implied Valuation (Model DCF)
              </span>
              <p className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                {formatMillions(sym, impliedEquity)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {formatPerShare(sym, impliedEquity / totalShares)} per share
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Shareholder / Investor Entity</th>
                  <th className="px-4 py-3">Security Class</th>
                  <th className="px-4 py-3 text-right">Shares (M)</th>
                  <th className="px-4 py-3 text-right">Capital Invested</th>
                  <th className="px-4 py-3 text-right">Fully Diluted %</th>
                  <th className="px-4 py-3 text-right">Liquidation Pref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {shareholders.map((sh) => (
                  <tr key={sh.id} className="hover:bg-muted/40">
                    <td className="px-4 py-2.5 font-sans font-semibold text-foreground">{sh.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded bg-muted text-foreground">
                        {sh.shareClass}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-foreground">{sh.sharesCount.toFixed(2)}M</td>
                    <td className="px-4 py-2.5 text-right">{sym}{sh.investmentAmount.toFixed(1)}M</td>
                    <td className="px-4 py-2.5 text-right font-bold text-primary">{sh.ownershipPct.toFixed(1)}%</td>
                    <td className="px-4 py-2.5 text-right font-sans text-muted-foreground">
                      {sh.shareClass.includes('Preferred') ? `${sh.liquidationPrefMultiple.toFixed(1)}x Non-Part.` : 'Common (Pari Passu)'}
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-muted/30 font-bold border-t-2 border-border">
                  <td className="px-4 py-3 font-sans text-foreground">Total Fully Diluted Capitalization</td>
                  <td className="px-4 py-3 font-sans text-muted-foreground">All Classes</td>
                  <td className="px-4 py-3 text-right text-foreground">{totalShares.toFixed(2)}M</td>
                  <td className="px-4 py-3 text-right text-foreground">{sym}{totalInvested.toFixed(1)}M</td>
                  <td className="px-4 py-3 text-right text-primary">100.0%</td>
                  <td className="px-4 py-3 text-right font-sans text-muted-foreground">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUB-VIEW 2: RETURNS & EXIT WATERFALL ── */}
      {activeSubView === 'returns' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>Simulated Exit Equity Valuation</span>
                <span className="font-mono text-primary font-bold">{sym}{exitValuation}M</span>
              </div>
              <input
                type="range"
                min={20}
                max={500}
                step={5}
                value={exitValuation}
                onChange={(e) => setExitValuation(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-[11px] text-muted-foreground">
                Base DCF model implied equity value is {formatMillions(sym, impliedEquity)}.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span>Holding Period to Exit</span>
                <span className="font-mono text-foreground font-bold">{holdingYears} Years</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={holdingYears}
                onChange={(e) => setHoldingYears(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <p className="text-[11px] text-muted-foreground">
                Determines annualized Internal Rate of Return (IRR) compounding.
              </p>
            </div>
          </div>

          {/* Returns Table */}
          <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs space-y-3">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                Liquidation Waterfall & Investment Returns by Share Class
              </h3>
              <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                Exit: {sym}{exitValuation}M
              </span>
            </div>

            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Investor Entity</th>
                  <th className="px-4 py-2.5 text-right">Invested</th>
                  <th className="px-4 py-2.5 text-right">Exit Proceeds</th>
                  <th className="px-4 py-2.5 text-right">Net Gain / Profit</th>
                  <th className="px-4 py-2.5 text-right">MOIC Multiple</th>
                  <th className="px-4 py-2.5 text-right">Annualized IRR %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono">
                {exitReturns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-muted/40">
                    <td className="px-4 py-2.5 font-sans font-semibold text-foreground">
                      {ret.name}
                      <span className="block text-[10px] text-muted-foreground font-normal">{ret.shareClass}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">{sym}{ret.investmentAmount.toFixed(1)}M</td>
                    <td className="px-4 py-2.5 text-right font-bold text-primary">{sym}{ret.totalProceeds.toFixed(2)}M</td>
                    <td className="px-4 py-2.5 text-right text-emerald-700">
                      +{sym}{Math.max(0, ret.totalProceeds - ret.investmentAmount).toFixed(2)}M
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-foreground">
                      {ret.investmentAmount > 0 ? `${ret.moic.toFixed(2)}x` : '— (Common)'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                      {ret.investmentAmount > 0 ? `${ret.irrPct.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
}
