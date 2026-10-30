/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useModelContext } from '@/contexts/ModelContext';
import { SlideInForm } from '@/components/ui/slide-in-form';
import { SECTOR_BLUEPRINTS } from '@/engine/blueprints';
import { Calculator, Info, Sparkles, TrendingUp } from 'lucide-react';

export function DriverDrawer() {
  const {
    activeCompany,
    isDriverDrawerOpen,
    closeDriverDrawer,
    selectedDriverId,
    driverOverrides,
    updateDriver,
  } = useModelContext();

  const blueprint = SECTOR_BLUEPRINTS[activeCompany.sectorId] || SECTOR_BLUEPRINTS.general;
  const driverDef = blueprint.drivers.find((d) => d.id === selectedDriverId) || blueprint.drivers[0];

  const currentValue = driverDef
    ? (driverOverrides[driverDef.id] !== undefined ? driverOverrides[driverDef.id] : driverDef.defaultValue)
    : 0;

  const [tempValue, setTempValue] = useState<number>(currentValue);
  const [reason, setReason] = useState<string>('');

  useEffect(() => {
    if (driverDef) {
      setTempValue(currentValue);
      setReason('');
    }
  }, [driverDef, currentValue]);

  if (!driverDef) return null;

  const handleSave = () => {
    updateDriver(driverDef.id, tempValue, reason.trim() || undefined);
    closeDriverDrawer();
  };

  const handleReset = () => {
    setTempValue(driverDef.defaultValue);
  };

  return (
    <SlideInForm
      open={isDriverDrawerOpen}
      onOpenChange={(open) => {
        if (!open) closeDriverDrawer();
      }}
      title={driverDef.name}
      description={`Category: ${driverDef.category.toUpperCase()} • Sector: ${blueprint.name}`}
      footer={
        <>
          <button
            type="button"
            onClick={handleReset}
            className="h-9 px-3.5 rounded-md border border-border bg-card text-xs font-semibold uppercase tracking-[0.08em] text-foreground hover:bg-muted transition-colors"
          >
            Reset Default ({driverDef.defaultValue} {driverDef.unit})
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-9 px-5 rounded-md bg-primary text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground hover:bg-primary/90 transition-colors shadow-none"
          >
            Apply & Recalculate
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Value Controls */}
        <div className="rounded-lg border border-border bg-card p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
              Calibrated Value
            </label>
            <span className="text-lg font-bold font-mono text-primary">
              {tempValue} {driverDef.unit}
            </span>
          </div>

          {/* Range Slider */}
          <input
            type="range"
            min={driverDef.min}
            max={driverDef.max}
            step={driverDef.step}
            value={tempValue}
            onChange={(e) => setTempValue(Number(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />

          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
            <span>Min: {driverDef.min} {driverDef.unit}</span>
            <span>Default: {driverDef.defaultValue} {driverDef.unit}</span>
            <span>Max: {driverDef.max} {driverDef.unit}</span>
          </div>

          {/* Direct Input */}
          <div className="pt-2">
            <label className="text-[11px] text-muted-foreground mb-1 block">
              Direct Numeric Override ({driverDef.unit})
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={driverDef.min}
                max={driverDef.max}
                step={driverDef.step}
                value={tempValue}
                onChange={(e) => setTempValue(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span className="text-xs font-semibold text-muted-foreground shrink-0 px-2 py-1 bg-muted rounded">
                {driverDef.unit}
              </span>
            </div>
          </div>
        </div>

        {/* Formula Explanation Card */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Calculator className="h-4 w-4 text-primary" />
            <span>Calculation Formula & Logic</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed font-mono bg-muted/50 p-2.5 rounded border border-border">
            {driverDef.formulaDescription}
          </p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Economic Baseline: </span>
            {driverDef.baselineDescription}
          </p>
        </div>

        {/* Quick Driver Selection Dropdown (to switch drivers directly within drawer) */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-xs space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
            Switch Sector Driver
          </label>
          <select
            value={driverDef.id}
            onChange={(e) => {
              const target = blueprint.drivers.find((d) => d.id === e.target.value);
              if (target) {
                setTempValue(driverOverrides[target.id] ?? target.defaultValue);
              }
            }}
            className="w-full h-9 px-3 rounded-md border border-border bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {blueprint.drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.category.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* Reason / Audit Justification */}
        <div className="rounded-lg border border-border bg-card p-4 shadow-xs space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <Info className="h-4 w-4 text-primary" />
            <span>Audit Trail Documentation</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Provide the business rationale for this assumption change (recorded in model audit log).
          </p>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Calibrated based on Q3 earnings release and vendor contract renegotiations..."
            className="w-full p-2.5 rounded-md border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
    </SlideInForm>
  );
}
