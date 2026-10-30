/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { calculateFinancialModel } from '@/engine/financialEngine';
import { buildHistoricalBase, calibrateHistoricalDrivers, type HistoricalDataset } from '@/engine/historicalActivation';
import { SECTOR_BLUEPRINTS } from '@/engine/blueprints';
import { DEFAULT_SCENARIOS, INITIAL_COMPANIES, getHistoricalBase } from '@/data/mockData';
import {
  AuditLogEntry,
  Company,
  ModelCalculationRun,
  PersonaMode,
  Scenario,
  ScenarioId,
} from '@/types/finance';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface ModelContextType {
  companies: Company[];
  activeCompany: Company;
  setActiveCompany: (comp: Company) => void;
  scenarios: Scenario[];
  activeScenarioId: ScenarioId;
  setActiveScenarioId: (id: ScenarioId) => void;
  personaMode: PersonaMode;
  setPersonaMode: (mode: PersonaMode) => void;
  calculationRun: ModelCalculationRun;
  historicalBase: ReturnType<typeof getHistoricalBase>;
  activeHistoricalDataset: HistoricalDataset | null;
  refreshHistoricalDataset: () => void;
  calibratedDrivers: ReturnType<typeof calibrateHistoricalDrivers>;
  driverOverrides: Record<string, number>;
  updateDriver: (driverId: string, newValue: number, reason?: string) => void;
  resetDriversToScenario: (scenarioId: ScenarioId) => void;
  auditLogs: AuditLogEntry[];
  toasts: ToastMessage[];
  triggerToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: string) => void;
  isDriverDrawerOpen: boolean;
  selectedDriverId: string | null;
  openDriverDrawer: (driverId: string) => void;
  closeDriverDrawer: () => void;
  addNewCompany: (company: Company) => void;
  updateCompany: (company: Company) => void;
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

export function ModelProvider({ children }: { children: React.ReactNode }) {
  const [historicalRevision, setHistoricalRevision] = useState(0);
  const refreshHistoricalDataset = () => setHistoricalRevision(n => n + 1);
  const [companies, setCompanies] = useState<Company[]>(() => { try { const stored = JSON.parse(localStorage.getItem('xlpro:companies:v1') || '[]') as Company[]; return [...stored.filter(c => !INITIAL_COMPANIES.some(seed => seed.id === c.id)), ...INITIAL_COMPANIES]; } catch { return INITIAL_COMPANIES; } });
  const [activeCompany, setActiveCompanyState] = useState<Company>(() => { try { const id = localStorage.getItem('xlpro:active-company:v1'); const stored = JSON.parse(localStorage.getItem('xlpro:companies:v1') || '[]') as Company[]; return [...stored, ...INITIAL_COMPANIES].find(c => c.id === id) || INITIAL_COMPANIES[0]; } catch { return INITIAL_COMPANIES[0]; } });
  useEffect(() => { try { localStorage.setItem('xlpro:companies:v1', JSON.stringify(companies.filter(c => !INITIAL_COMPANIES.some(seed => seed.id === c.id)))); } catch {} }, [companies]);
  useEffect(() => { try { localStorage.setItem('xlpro:active-company:v1', activeCompany.id); } catch {} }, [activeCompany.id]);
  const [scenarios] = useState<Scenario[]>(DEFAULT_SCENARIOS);
  const [activeScenarioId, setActiveScenarioId] = useState<ScenarioId>('base');
  const [personaMode, setPersonaMode] = useState<PersonaMode>('professional');

  // Driver overrides state
  const [driverOverrides, setDriverOverrides] = useState<Record<string, number>>({});

  // Slide-in assumption drawer
  const [isDriverDrawerOpen, setIsDriverDrawerOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Audit log of all assumption changes
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Browser persistence is a convenience for local prototyping, NOT secure multi-user storage.
  // Keep overrides scoped by company AND scenario to prevent cross-model leakage.
  const [savedOverrides, setSavedOverrides] = useState<Record<string, Record<string, number>>>(() => {
    try {
      const raw = localStorage.getItem('xlpro:model-overrides:v1');
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });
  const overrideKey = `${activeCompany.id}:${activeScenarioId}`;
  useEffect(() => {
    try { localStorage.setItem('xlpro:model-overrides:v1', JSON.stringify(savedOverrides)); }
    catch { /* Storage may be disabled. */ }
  }, [savedOverrides]);

  // Toast notification state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const triggerToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Each company/scenario restores its own saved assumptions.
  useEffect(() => {
    const defaults = scenarios.find((s) => s.id === activeScenarioId)?.driverOverrides ?? {};
    setDriverOverrides({ ...defaults, ...(savedOverrides[overrideKey] ?? {}) });
  }, [overrideKey, scenarios]);

  const setActiveCompany = (comp: Company) => {
    setActiveCompanyState(comp);
    triggerToast(`Active model switched to ${comp.name}`, 'info');
  };

  const resetDriversToScenario = (scenId: ScenarioId) => {
    const target = scenarios.find((s) => s.id === scenId);
    if (target) {
      setDriverOverrides({ ...target.driverOverrides });
      setSavedOverrides((prev) => { const next = { ...prev }; delete next[`${activeCompany.id}:${scenId}`]; return next; });
      triggerToast(`Driver inputs reset to ${target.name}`, 'info');
    }
  };

  const updateDriver = (driverId: string, newValue: number, reason?: string) => {
    const blueprint = SECTOR_BLUEPRINTS[activeCompany.sectorId] || SECTOR_BLUEPRINTS.general;
    const def = blueprint.drivers.find((d) => d.id === driverId);
    const oldValue = driverOverrides[driverId] ?? def?.defaultValue ?? 0;

    if (!Number.isFinite(newValue)) {
      triggerToast('Enter a valid finite number.', 'error');
      return;
    }
    setDriverOverrides((prev) => ({ ...prev, [driverId]: newValue }));
    setSavedOverrides((prev) => ({
      ...prev,
      [overrideKey]: { ...(prev[overrideKey] ?? {}), [driverId]: newValue },
    }));

    // Record in audit log
    const entry: AuditLogEntry = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      author: `${personaMode.toUpperCase()} User`,
      driverId,
      driverName: def?.name ?? driverId,
      oldValue,
      newValue,
      unit: def?.unit ?? '',
      reason: reason || 'Interactive model assumption calibration.',
      affectedSections: ['Income Statement', 'Free Cash Flow', 'Valuation Bridge'],
    };

    setAuditLogs((prev) => [entry, ...prev]);
    triggerToast(`Updated ${def?.name ?? driverId}: ${oldValue} → ${newValue} ${def?.unit ?? ''}`, 'success');
  };

  const openDriverDrawer = (driverId: string) => {
    setSelectedDriverId(driverId);
    setIsDriverDrawerOpen(true);
  };

  const closeDriverDrawer = () => {
    setIsDriverDrawerOpen(false);
    setSelectedDriverId(null);
  };

  const addNewCompany = (company: Company) => {
    setCompanies((prev) => [company, ...prev]);
    setActiveCompany(company);
    triggerToast(`Created new financial model for ${company.name}`, 'success');
  };

  // Run calculation engine deterministically whenever company, scenario, or drivers change
  const activeHistoricalDataset = useMemo<HistoricalDataset | null>(() => {
    try {
      const versions = JSON.parse(localStorage.getItem(`xlpro:historical-versions:v1:${activeCompany.id}`) ?? '[]') as HistoricalDataset[];
      return versions.at(-1) ?? null;
    } catch { return null; }
  }, [activeCompany.id, historicalRevision]);
  const historicalBase = useMemo(() => activeHistoricalDataset
    ? buildHistoricalBase(activeHistoricalDataset.rows, activeHistoricalDataset.units)
    : getHistoricalBase(activeCompany), [activeCompany, activeHistoricalDataset]);
  const calibratedDrivers = useMemo(() => activeHistoricalDataset
    ? calibrateHistoricalDrivers(activeHistoricalDataset.rows) : {}, [activeHistoricalDataset]);

  const calculationRun = useMemo(() => {
    return calculateFinancialModel({
      company: activeCompany,
      scenarioId: activeScenarioId,
      driverOverrides: { ...Object.fromEntries(Object.entries(calibratedDrivers).filter(([, v]) => Number.isFinite(v)).map(([key, value]) => [({ revenueGrowthPct: 'revenue_growth_pct', grossMarginPct: 'gross_margin_pct', dsoDays: 'dso_days', dioDays: 'dio_days', dpoDays: 'dpo_days' } as Record<string, string>)[key], value as number])), ...driverOverrides },
      historicalBase,
    });
  }, [activeCompany, activeScenarioId, driverOverrides, historicalBase, calibratedDrivers]);

  return (
    <ModelContext.Provider
      value={{
        companies,
        activeCompany,
        setActiveCompany,
        scenarios,
        activeScenarioId,
        setActiveScenarioId,
        personaMode,
        setPersonaMode,
        calculationRun,
        historicalBase,
        activeHistoricalDataset,
        refreshHistoricalDataset,
        calibratedDrivers,
        driverOverrides,
        updateDriver,
        resetDriversToScenario,
        auditLogs,
        toasts,
        triggerToast,
        removeToast,
        isDriverDrawerOpen,
        selectedDriverId,
        openDriverDrawer,
        closeDriverDrawer,
        addNewCompany,
      }}
    >
      {children}
    </ModelContext.Provider>
  );
}

export function useModelContext() {
  const ctx = useContext(ModelContext);
  if (!ctx) {
    throw new Error('useModelContext must be used within ModelProvider');
  }
  return ctx;
}
