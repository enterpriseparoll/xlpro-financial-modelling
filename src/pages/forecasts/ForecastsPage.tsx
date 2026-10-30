/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useModelContext } from '@/contexts/ModelContext';
import { PageShell } from '@/components/layout/PageShell';
import { SECTOR_BLUEPRINTS } from '@/engine/blueprints';
import {
  ArrowRight,
  Database,
  Layers,
  Sliders,
  TrendingUp,
} from 'lucide-react';

export function ForecastsPage({
  subTab = 'drivers',
}: {
  subTab?: 'drivers' | 'schedules' | 'working_capital';
}) {
  const { activeCompany, calculationRun, openDriverDrawer } = useModelContext();
  const blueprint = SECTOR_BLUEPRINTS[activeCompany.sectorId] || SECTOR_BLUEPRINTS.general;
  const sym = activeCompany.currencySymbol;

  const [activeSubView, setActiveSubView] = useState<'drivers' | 'schedules' | 'working_capital'>(subTab);

  const { workingCapitalSchedule, debtSchedule, capexSchedule } = calculationRun;

  return (
    <PageShell
      moduleName="Forecast Engineering"
      title={activeCompany.name}
      titleHighlight="Forecast Schedules"
      description="Driver assumptions, debt amortisation schedules, working capital velocity, and capital expenditure roll forwards."
      actions={
        <button
          type="button"
          onClick={() => openDriverDrawer(blueprint.drivers[0].id)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground hover:bg-primary/90 shadow-none transition-colors"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Calibrate Drivers</span>
        </button>
      }
    >
      {/* Sub-view switcher */}
      <div className="flex items-center gap-1 bg-muted/60 rounded-md p-1 w-fit border border-border">
        {[
          { key: 'drivers', label: 'Operating Drivers' },
          { key: 'working_capital', label: 'Working Capital Schedule' },
          { key: 'schedules', label: 'Debt & CAPEX Schedules' },
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

      {/* ── SUB-VIEW 1: Operating Drivers ── */}
      {activeSubView === 'drivers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {blueprint.name} Operating Drivers
              </h3>
              <p className="text-xs text-muted-foreground">
                Configured operating assumptions powering the top-down and bottom-up financial projections.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {blueprint.drivers.map((drv) => (
              <div
                key={drv.id}
                onClick={() => openDriverDrawer(drv.id)}
                className="rounded-lg border border-border bg-card p-5 shadow-xs hover:border-primary/50 transition-all cursor-pointer group space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary-soft px-2 py-0.5 rounded">
                    {drv.category}
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                    Calibrate <ArrowRight className="h-3 w-3" />
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {drv.name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                    {drv.baselineDescription}
                  </p>
                </div>

                <div className="pt-2 border-t border-border flex items-baseline justify-between font-mono">
                  <span className="text-[11px] text-muted-foreground font-sans">Baseline / Current</span>
                  <span className="text-sm font-bold text-foreground">
                    {drv.defaultValue} {drv.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SUB-VIEW 2: Working Capital Schedule ── */}
      {activeSubView === 'working_capital' && (
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Operating Working Capital Schedule
            </h3>
            <p className="text-xs text-muted-foreground">
              Receivables (DSO), Inventory (DIO), and Payables (DPO) driver build-up and net cash impact.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse font-mono">
              <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5 font-sans">Schedule Item</th>
                  {workingCapitalSchedule.map((row) => (
                    <th key={row.period.year} className="px-4 py-2.5 text-right font-bold text-foreground">
                      {row.period.periodLabel}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="hover:bg-muted/40">
                  <td className="px-4 py-2 font-sans text-muted-foreground">Days Sales Outstanding (DSO)</td>
                  {workingCapitalSchedule.map((r) => (
                    <td key={r.period.year} className="px-4 py-2 text-right">{r.dso} days</td>
                  ))}
                </tr>
                <tr className="hover:bg-muted/40">
                  <td className="px-4 py-2 font-sans text-muted-foreground">Days Inventory Outstanding (DIO)</td>
                  {workingCapitalSchedule.map((r) => (
                    <td key={r.period.year} className="px-4 py-2 text-right">{r.dio} days</td>
                  ))}
                </tr>
                <tr className="hover:bg-muted/40">
                  <td className="px-4 py-2 font-sans text-muted-foreground">Days Payables Outstanding (DPO)</td>
                  {workingCapitalSchedule.map((r) => (
                    <td key={r.period.year} className="px-4 py-2 text-right">{r.dpo} days</td>
                  ))}
                </tr>
                <tr className="hover:bg-muted/40 font-semibold bg-muted/10">
                  <td className="px-4 py-2 font-sans text-foreground">Accounts Receivable ({sym}M)</td>
                  {workingCapitalSchedule.map((r) => (
                    <td key={r.period.year} className="px-4 py-2 text-right">{sym}{r.accountsReceivable.toFixed(2)}</td>
                  ))}
                </tr>
                <tr className="hover:bg-muted/40 font-semibold bg-muted/10">
                  <td className="px-4 py-2 font-sans text-foreground">Inventory ({sym}M)</td>
                  {workingCapitalSchedule.map((r) => (
                    <td key={r.period.year} className="px-4 py-2 text-right">{sym}{r.inventory.toFixed(2)}</td>
                  ))}
                </tr>
                <tr className="hover:bg-muted/40 font-semibold bg-muted/10">
                  <td className="px-4 py-2 font-sans text-foreground">Accounts Payable ({sym}M)</td>
                  {workingCapitalSchedule.map((r) => (
                    <td key={r.period.year} className="px-4 py-2 text-right">{sym}{r.accountsPayable.toFixed(2)}</td>
                  ))}
                </tr>
                <tr className="hover:bg-muted/40 font-bold bg-primary-soft/30 border-t border-border">
                  <td className="px-4 py-2.5 font-sans text-foreground">Net Operating Working Capital</td>
                  {workingCapitalSchedule.map((r) => (
                    <td key={r.period.year} className="px-4 py-2.5 text-right text-primary font-bold">
                      {sym}{r.netWorkingCapital.toFixed(2)}
                    </td>
                  ))}
                </tr>
                <tr className="hover:bg-muted/40 font-bold bg-muted/20">
                  <td className="px-4 py-2 font-sans text-foreground">Δ Change in NWC (CFS Impact)</td>
                  {workingCapitalSchedule.map((r) => (
                    <td key={r.period.year} className="px-4 py-2 text-right text-foreground font-bold">
                      {r.deltaNWC < 0 ? `(${sym}${Math.abs(r.deltaNWC).toFixed(2)})` : `+${sym}${r.deltaNWC.toFixed(2)}`}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SUB-VIEW 3: Debt & CAPEX Schedules ── */}
      {activeSubView === 'schedules' && (
        <div className="space-y-6">
          {/* Debt Schedule */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-3">
            <h3 className="text-base font-semibold text-foreground">
              Debt Facility & Interest Schedule
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse font-mono">
                <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 font-sans">Line Item ({sym}M)</th>
                    {debtSchedule.map((r) => (
                      <th key={r.period.year} className="px-4 py-2.5 text-right font-bold text-foreground">
                        {r.period.periodLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="hover:bg-muted/40">
                    <td className="px-4 py-2 font-sans text-muted-foreground">Beginning Debt Balance</td>
                    {debtSchedule.map((r) => (
                      <td key={r.period.year} className="px-4 py-2 text-right">{sym}{r.beginningDebt.toFixed(2)}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-muted/40 text-rose-700">
                    <td className="px-4 py-2 font-sans text-rose-700 pl-6">(-) Scheduled Principal Repayments</td>
                    {debtSchedule.map((r) => (
                      <td key={r.period.year} className="px-4 py-2 text-right">({sym}{r.repayments.toFixed(2)})</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-muted/40 font-bold bg-muted/10">
                    <td className="px-4 py-2.5 font-sans text-foreground">Ending Total Debt</td>
                    {debtSchedule.map((r) => (
                      <td key={r.period.year} className="px-4 py-2.5 text-right font-bold text-foreground">
                        {sym}{r.endingDebt.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-muted/40 text-rose-700">
                    <td className="px-4 py-2 font-sans text-rose-700">Interest Expense (P&L Impact @ 5.25%)</td>
                    {debtSchedule.map((r) => (
                      <td key={r.period.year} className="px-4 py-2 text-right font-bold">
                        ({sym}{r.interestExpense.toFixed(2)})
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* CAPEX & PP&E Roll Forward */}
          <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-3">
            <h3 className="text-base font-semibold text-foreground">
              Fixed Asset & CAPEX Schedule (PP&E Roll-Forward)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse font-mono">
                <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 font-sans">Line Item ({sym}M)</th>
                    {capexSchedule.map((r) => (
                      <th key={r.period.year} className="px-4 py-2.5 text-right font-bold text-foreground">
                        {r.period.periodLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="hover:bg-muted/40">
                    <td className="px-4 py-2 font-sans text-muted-foreground">Beginning Net PP&E</td>
                    {capexSchedule.map((r) => (
                      <td key={r.period.year} className="px-4 py-2 text-right">{sym}{r.beginningNetPPE.toFixed(2)}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-muted/40 text-emerald-700">
                    <td className="px-4 py-2 font-sans text-emerald-700 pl-6">(+) Capital Expenditures (CAPEX)</td>
                    {capexSchedule.map((r) => (
                      <td key={r.period.year} className="px-4 py-2 text-right">+{sym}{r.capex.toFixed(2)}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-muted/40 text-rose-700">
                    <td className="px-4 py-2 font-sans text-rose-700 pl-6">(-) Depreciation & Amortization</td>
                    {capexSchedule.map((r) => (
                      <td key={r.period.year} className="px-4 py-2 text-right">({sym}{r.depreciation.toFixed(2)})</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-muted/40 font-bold bg-primary-soft/30 border-t border-border">
                    <td className="px-4 py-2.5 font-sans text-foreground">Ending Net PP&E (Balance Sheet)</td>
                    {capexSchedule.map((r) => (
                      <td key={r.period.year} className="px-4 py-2.5 text-right font-bold text-primary">
                        {sym}{r.endingNetPPE.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
