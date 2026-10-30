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
  BookOpen,
  CheckCircle2,
  Cpu,
  Layers,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { SectorId } from '@/types/finance';

export function BlueprintsPage({
  onNavigateTab,
}: {
  onNavigateTab: (tabId: string, subTabId?: string) => void;
}) {
  const { companies, setActiveCompany } = useModelContext();
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<SectorId>('saas');

  const blueprints = Object.values(SECTOR_BLUEPRINTS);
  const activeBp = SECTOR_BLUEPRINTS[selectedBlueprintId];

  return (
    <PageShell
      moduleName="Blueprint Architecture"
      title="Sector Blueprints"
      titleHighlight="Registry"
      description="Pre-configured, domain-validated financial schemas that prevent invalid configurations across disparate industries."
    >
      <div className="space-y-6">
        {/* Sector Blueprint Selector Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {blueprints.map((bp) => (
            <button
              key={bp.id}
              type="button"
              onClick={() => setSelectedBlueprintId(bp.id)}
              className={`px-4 py-2 rounded-md text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-all ${
                selectedBlueprintId === bp.id
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card border border-border text-foreground hover:bg-muted'
              }`}
            >
              {bp.name}
            </button>
          ))}
        </div>

        {/* Selected Blueprint Detail Hero */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Blueprint Specification
              </span>
              <h3 className="text-2xl font-serif font-medium text-foreground tracking-tight mt-0.5">
                {activeBp.name}
              </h3>
              <p className="text-xs text-primary font-medium mt-1">
                {activeBp.tagline}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                const targetComp = companies.find((c) => c.sectorId === activeBp.id);
                if (targetComp) {
                  setActiveCompany(targetComp);
                  onNavigateTab('models', 'workspace');
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground hover:bg-primary/90 shadow-none transition-colors"
            >
              <span>Launch In Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
            {activeBp.description}
          </p>

          <div className="p-3.5 rounded-lg bg-primary-soft/40 border border-primary/20 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Domain Distinction & Accounting Taxonomy
            </span>
            <p className="text-xs text-foreground font-medium leading-relaxed">
              {activeBp.keyDistinction}
            </p>
          </div>
        </div>

        {/* Blueprint Drivers Specification */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-foreground">
                Configured Operating Drivers ({activeBp.drivers.length} Parameter Rules)
              </h4>
              <p className="text-xs text-muted-foreground">
                Permitted drivers, unit scales, mathematical definitions, and validation bounds.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Vetted & Validated
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Driver Name</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Unit</th>
                  <th className="px-4 py-2.5 text-right">Default Baseline</th>
                  <th className="px-4 py-2.5 text-right">Min / Max Range</th>
                  <th className="px-4 py-2.5">Formula Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeBp.drivers.map((drv) => (
                  <tr key={drv.id} className="hover:bg-muted/40">
                    <td className="px-4 py-2.5 font-semibold text-foreground">{drv.name}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] font-bold uppercase text-primary bg-primary-soft px-1.5 py-0.2 rounded">
                        {drv.category}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-muted-foreground">{drv.unit}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">
                      {drv.defaultValue} {drv.unit}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">
                      {drv.min} – {drv.max}
                    </td>
                    <td className="px-4 py-2.5 text-[11px] font-mono text-muted-foreground max-w-xs truncate">
                      {drv.formulaDescription}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
