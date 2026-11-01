/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useModelContext } from '@/contexts/ModelContext';
import { useYearMonthFilterContext } from '@/contexts/YearMonthFilterContext';
import {
  Building2,
  CheckCircle2,
  GitBranch,
  Layers,
  Plus,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { PersonaMode, ScenarioId } from '@/types/finance';
import { AccountButton } from '@/features/auth';

interface HeaderProps {
  onOpenWizard: () => void;
  onNavigateTab: (tabId: string, subTabId?: string) => void;
}

export function Header({ onOpenWizard, onNavigateTab }: HeaderProps) {
  const {
    companies,
    activeCompany,
    setActiveCompany,
    scenarios,
    activeScenarioId,
    setActiveScenarioId,
    personaMode,
    setPersonaMode,
    calculationRun,
    openDriverDrawer,
  } = useModelContext();

  const { year, setPeriod } = useYearMonthFilterContext();

  const availableYears = [2026, 2027, 2028, 2029, 2030];

  return (
    <header className="sticky top-0 z-40 h-[74px] border-b border-border bg-card/95 backdrop-blur-sm px-6 flex items-center justify-between gap-4">
      {/* Left: Active Company and Sector Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary">
            <Building2 className="h-5 w-5 stroke-[1.6]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <select
                value={activeCompany.id}
                onChange={(e) => {
                  const target = companies.find((c) => c.id === e.target.value);
                  if (target) setActiveCompany(target);
                }}
                className="text-sm font-semibold text-foreground bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer max-w-[210px] truncate"
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id} className="bg-card text-foreground">
                    {c.name} {c.isListed ? `(${c.ticker})` : '(Private)'}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary-soft px-1.5 py-0.2 rounded">
                {activeCompany.sectorId}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {activeCompany.currency} ({activeCompany.currencySymbol}) • {activeCompany.accountingBasis}
              </span>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="hidden md:block h-6 w-px bg-border mx-1" />

        {/* Scenario Selector */}
        <div className="hidden lg:flex items-center gap-1.5 bg-muted/60 px-2 py-1 rounded-md border border-border">
          <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
            Scenario:
          </span>
          <select
            value={activeScenarioId}
            onChange={(e) => setActiveScenarioId(e.target.value as ScenarioId)}
            className="text-xs font-semibold text-foreground bg-transparent border-none focus:outline-none cursor-pointer"
          >
            {scenarios.map((scen) => (
              <option key={scen.id} value={scen.id} className="bg-card text-foreground">
                {scen.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Model Health Pill */}
        <button
          type="button"
          onClick={() => onNavigateTab('dashboard', 'health')}
          title="Click to view comprehensive model validation checks"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-card text-xs font-medium text-foreground hover:bg-muted/50 transition-colors shadow-xs"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
          <span className="text-[11px] font-semibold text-foreground">
            {calculationRun.validation.overallStatus}
          </span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            View checks
          </span>
        </button>

        {/* Forecast Horizon Year Selector */}
        <div className="hidden xl:flex items-center gap-1 bg-muted/40 p-1 rounded-md border border-border">
          {availableYears.map((yr) => (
            <button
              key={yr}
              type="button"
              onClick={() => setPeriod(yr, 0)}
              className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
                year === yr
                  ? 'bg-card text-primary shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              FY{yr}
            </button>
          ))}
        </div>

        {/* Persona Mode Selector */}
        <div className="hidden md:flex items-center gap-1 bg-muted/50 p-1 rounded-md border border-border">
          {(['guided', 'professional', 'advanced', 'reviewer'] as PersonaMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setPersonaMode(mode)}
              className={`px-2.5 py-1 rounded text-[10px] font-semibold uppercase tracking-wider transition-all ${
                personaMode === mode
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Quick Driver Drawer Button */}
        <button
          type="button"
          onClick={() => {
            const firstDriver = calculationRun.periods.length > 0 ? 'gross_margin_pct' : 'revenue_growth_pct';
            openDriverDrawer(firstDriver);
          }}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-border bg-card text-xs font-semibold uppercase tracking-[0.08em] text-foreground hover:border-primary hover:bg-primary-soft hover:text-primary transition-colors shadow-xs"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Inspect Drivers</span>
        </button>

        <AccountButton />

        {/* New Model Wizard Button */}
        <button
          type="button"
          onClick={onOpenWizard}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-primary text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground hover:bg-primary/90 transition-colors shadow-none"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Model</span>
        </button>
      </div>
    </header>
  );
}
