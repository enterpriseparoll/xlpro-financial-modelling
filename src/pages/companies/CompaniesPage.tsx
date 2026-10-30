/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { EditCompanyDrawer } from '@/features/company-setup/components/EditCompanyDrawer';
import { useModelContext } from '@/contexts/ModelContext';
import { PageShell } from '@/components/layout/PageShell';
import { SECTOR_BLUEPRINTS } from '@/engine/blueprints';
import {
  Building2,
  Check,
  CheckCircle2,
  ExternalLink,
  Layers,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import type { SectorId, Company } from '@/types/finance';

export function CompaniesPage({
  onOpenWizard,
  onNavigateTab,
}: {
  onOpenWizard: () => void;
  onNavigateTab: (tabId: string, subTabId?: string) => void;
}) {
  const { companies, activeCompany, setActiveCompany } = useModelContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [editingCompany,setEditingCompany]=useState<Company | null>(null);
  const [selectedSector, setSelectedSector] = useState<string>('all');

  const filtered = companies.filter((c) => {
    const matchSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.ticker && c.ticker.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.domicile.toLowerCase().includes(searchTerm.toLowerCase());
    const matchSector = selectedSector === 'all' || c.sectorId === selectedSector;
    return matchSearch && matchSector;
  });

  return (
    <PageShell
      moduleName="Corporate Registry"
      title="Company Directory"
      titleHighlight="& Entities"
      description="Select from verified reference entities across multiple global sectors or launch a new custom financial model."
      actions={
        <div className="flex flex-wrap gap-2"><button type="button" onClick={()=>onNavigateTab('market_data')} className="rounded-md border border-border px-4 py-2 text-xs font-semibold">Market Data Library</button><button
          type="button"
          onClick={onOpenWizard}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground hover:bg-primary/90 shadow-none transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Company Model</span>
        </button></div>
      }
    >
      <div className="space-y-6">
        {/* Filter & Search Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4 bg-card p-4 rounded-lg border border-border shadow-xs">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search companies by name, ticker, or domicile..."
              className="w-full h-10 pl-9 pr-3 rounded-md border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Filter Sector:
            </span>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="h-10 px-3 rounded-md border border-border bg-background text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
            >
              <option value="all">All Global Sectors</option>
              {Object.values(SECTOR_BLUEPRINTS).map((bp) => (
                <option key={bp.id} value={bp.id}>
                  {bp.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Company Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((comp) => {
            const isActive = activeCompany.id === comp.id;
            const bp = SECTOR_BLUEPRINTS[comp.sectorId] || SECTOR_BLUEPRINTS.general;

            return (
              <div
                key={comp.id}
                className={`rounded-lg border bg-card p-5 shadow-xs transition-all flex flex-col justify-between space-y-4 ${
                  isActive
                    ? 'border-primary ring-2 ring-primary ring-offset-1'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary-soft px-2 py-0.5 rounded">
                      {bp.name}
                    </span>
                    <span className="text-xs font-mono font-semibold text-muted-foreground">
                      {comp.currency} ({comp.currencySymbol})
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
                      <span>{comp.name}</span>
                      {comp.isListed && (
                        <span className="text-[10px] font-mono font-bold bg-muted text-foreground px-1.5 py-0.2 rounded">
                          {comp.ticker}
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                      {comp.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Structure:</span>
                      <span className="font-semibold text-foreground">
                        {comp.isListed ? 'Publicly Traded' : 'Private Holding'}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Domicile:</span>
                      <span className="font-semibold text-foreground">{comp.domicile}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Accounting:</span>
                      <span className="font-semibold text-foreground">{comp.accountingBasis}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveCompany(comp);
                      onNavigateTab('models', 'workspace');
                    }}
                    className={`flex-1 h-9 rounded-md text-xs font-semibold uppercase tracking-[0.08em] transition-colors flex items-center justify-center gap-1.5 ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'border border-border bg-card text-foreground hover:bg-muted'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Active In Workspace</span>
                      </>
                    ) : (
                      <span>Load Model</span>
                    )}
                  </button>
                  <button type="button" onClick={()=>setEditingCompany(comp)} className="h-9 rounded-md border border-border px-3 text-xs font-semibold hover:bg-muted">Edit</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {editingCompany&&<EditCompanyDrawer key={editingCompany.id} company={editingCompany} onClose={()=>setEditingCompany(null)}/>}
    </PageShell>
  );
}
