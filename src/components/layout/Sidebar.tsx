/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  ROUTES,
  getSubRoutes,
} from '@/config/routes.config';
import { useModelContext } from '@/contexts/ModelContext';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  User,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  activeSubTab: string;
  onNavigate: (tabId: string, subTabId?: string) => void;
}

export function Sidebar({ activeTab, activeSubTab, onNavigate }: SidebarProps) {
  const [isSecondaryOpen, setIsSecondaryOpen] = useState(true);
  const { personaMode, setPersonaMode, calculationRun, activeCompany } = useModelContext();

  const primaryRoutes = ROUTES.filter((r) => r.sortOrder < 99).sort((a, b) => a.sortOrder - b.sortOrder);
  const currentSubRoutes = getSubRoutes(activeTab);

  return (
    <aside className="flex h-screen shrink-0 select-none border-r border-border bg-card">
      {/* ── Primary Sidebar (80px) ── */}
      <div className="w-20 flex flex-col items-center justify-between py-4 border-r border-border bg-card">
        {/* Brand Icon */}
        <div className="flex flex-col items-center gap-1">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-soft shadow-xs text-primary transition-transform hover:scale-105">
            <BarChart3 className="h-6 w-6 stroke-[1.75]" />
          </div>
          <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
            Platform
          </span>
        </div>

        {/* Primary Navigation Icons */}
        <nav className="flex flex-col items-center gap-2 my-auto w-full px-2" aria-label="Main Navigation">
          {primaryRoutes.map((route) => {
            const isActive = activeTab === route.id;
            const Icon = route.icon;

            return (
              <button
                key={route.id}
                type="button"
                onClick={() => onNavigate(route.id)}
                title={route.label}
                className={`group relative flex flex-col items-center justify-center w-14 h-12 rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:bg-primary-soft/60 hover:text-foreground'
                }`}
              >
                <Icon className="h-4.5 w-4.5 stroke-[1.6]" />
                <span className="text-[9px] font-semibold tracking-tight mt-0.5 truncate max-w-[50px]">
                  {route.label}
                </span>

                {/* Subtle active pill indicator on left edge */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-primary-foreground/40 rounded-r" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="flex flex-col items-center gap-2 pt-2 border-t border-border w-full px-2">
          {/* Persona Mode Switch Indicator */}
          <button
            type="button"
            onClick={() => {
              const modes: typeof personaMode[] = ['guided', 'professional', 'advanced', 'reviewer'];
              const nextIndex = (modes.indexOf(personaMode) + 1) % modes.length;
              setPersonaMode(modes[nextIndex]);
            }}
            title={`Mode: ${personaMode.toUpperCase()} (Click to cycle)`}
            className="w-12 py-1 px-1 rounded-md bg-muted text-[8px] font-bold uppercase tracking-wider text-muted-foreground hover:bg-primary-soft hover:text-primary transition-colors text-center"
          >
            {personaMode.slice(0, 4)}
          </button>

          <div
            title="User Profile"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary font-semibold text-xs border border-primary/20"
          >
            <User className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* ── Secondary Sidebar (224px or Collapsible to 16px) ── */}
      {isSecondaryOpen ? (
        <div className="w-56 flex flex-col justify-between py-5 px-4 bg-background/50 border-r border-border transition-all duration-200">
          <div>
            {/* Secondary Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-primary">
                  Navigation
                </p>
                <p className="text-sm font-semibold text-foreground tracking-tight capitalize">
                  {activeTab.replace('_', ' ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSecondaryOpen(false)}
                title="Collapse sidebar"
                className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            {/* Sub-Routes List */}
            <div className="mt-4 space-y-1">
              {currentSubRoutes.length > 0 ? (
                currentSubRoutes.map((sub) => {
                  const isSubActive = activeSubTab === sub.id;
                  const SubIcon = sub.icon;

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => onNavigate(activeTab, sub.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left ${
                        isSubActive
                          ? 'bg-primary-soft text-primary font-semibold border-l-2 border-primary shadow-xs'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {SubIcon && <SubIcon className="h-3.5 w-3.5 shrink-0 opacity-80" />}
                      <span className="truncate">{sub.label}</span>
                    </button>
                  );
                })
              ) : (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  No sub-pages in this section
                </div>
              )}
            </div>
          </div>

          {/* Model Health / Snapshot in Secondary Sidebar */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="rounded-md border border-border bg-card p-3 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Model Integrity
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    calculationRun.validation.isValid
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  <ShieldCheck className="h-3 w-3" />
                  {calculationRun.validation.isValid ? '100% Tied' : 'Issues'}
                </span>
              </div>
              <div className="text-[11px] font-medium text-foreground truncate">
                {activeCompany.name}
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>Sector</span>
                <span className="uppercase font-semibold text-primary">{activeCompany.sectorId}</span>
              </div>
            </div>

            {/* Persona Mode Badge */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-muted-foreground">Persona Mode</span>
              <span className="text-[10px] font-bold uppercase text-primary tracking-wide">
                {personaMode}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Collapsed 16px restore handle */
        <div
          onClick={() => setIsSecondaryOpen(true)}
          title="Expand sub-menu"
          className="w-4 bg-muted/40 hover:bg-primary-soft/60 cursor-pointer border-r border-border flex items-center justify-center transition-colors"
        >
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      )}
    </aside>
  );
}
