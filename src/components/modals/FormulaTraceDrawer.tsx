/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SlideInForm } from '@/components/ui/slide-in-form';
import { useModelContext } from '@/contexts/ModelContext';
import { SECTOR_BLUEPRINTS } from '@/engine/blueprints';
import { Calculator, Info, Layers, Sliders, Sparkles } from 'lucide-react';
import { CellTraceDetail } from '@/types/finance';

interface FormulaTraceDrawerProps {
  open: boolean;
  onClose: () => void;
  trace: CellTraceDetail | null;
}

export function FormulaTraceDrawer({ open, onClose, trace }: FormulaTraceDrawerProps) {
  const { activeCompany, openDriverDrawer } = useModelContext();
  const blueprint = SECTOR_BLUEPRINTS[activeCompany.sectorId] || SECTOR_BLUEPRINTS.general;
  const sym = activeCompany.currencySymbol;

  if (!trace) return null;

  return (
    <SlideInForm
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      title={trace.lineItemName}
      description={`${trace.statement} • Period: ${trace.periodLabel}`}
      footer={
        <button
          type="button"
          onClick={onClose}
          className="h-9 px-5 rounded-md bg-primary text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground hover:bg-primary/90 transition-colors shadow-none"
        >
          Close Inspector
        </button>
      }
    >
      <div className="space-y-5">
        {/* Value Card */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Calculated Output ({trace.periodLabel})
          </span>
          <p className="text-3xl font-bold font-mono text-primary">
            {sym}{trace.calculatedValue.toFixed(2)} {trace.unit}
          </p>
          <p className="text-xs text-muted-foreground">
            Strict deterministic output produced by the versioned {blueprint.name} calculation engine.
          </p>
        </div>

        {/* Formula Logic Card */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Calculator className="h-4 w-4 text-primary" />
            <span>Topological Mathematical Formula</span>
          </div>
          <div className="bg-muted/70 p-3 rounded-md border border-border font-mono text-xs text-foreground leading-relaxed">
            {trace.formula}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {trace.economicRationale}
          </p>
        </div>

        {/* Direct Drivers Feeding into Cell */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <Layers className="h-4 w-4 text-primary" />
              <span>Direct Driver Inputs & Provenance</span>
            </div>
          </div>

          <div className="space-y-2">
            {trace.directDrivers.map((drv, i) => (
              <div
                key={i}
                className="p-3 rounded-md bg-background border border-border flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <p className="font-semibold text-foreground">{drv.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{drv.source}</p>
                </div>
                <div className="text-right font-mono">
                  <span className="font-bold text-foreground text-sm">{drv.value}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action to calibrate corresponding sector driver */}
        <div className="p-4 rounded-lg bg-primary-soft/40 border border-primary/20 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-foreground">Change Underlying Assumptions?</p>
            <p className="text-[11px] text-muted-foreground">
              Adjust business drivers without breaking formulas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              openDriverDrawer(blueprint.drivers[0].id);
            }}
            className="h-8 px-3 rounded-md bg-primary text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors shrink-0 flex items-center gap-1.5"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>Calibrate</span>
          </button>
        </div>
      </div>
    </SlideInForm>
  );
}
