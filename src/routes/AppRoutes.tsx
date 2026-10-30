/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { PremiumModelWorkspace } from '@/pages/models/PremiumModelWorkspace';
import { ForecastsPage } from '@/pages/forecasts/ForecastsPage';
import { ValuationPage } from '@/pages/valuation/ValuationPage';
import { BankValuationPage } from '@/pages/valuation/BankValuationPage';
import { ScenariosPage } from '@/pages/scenarios/ScenariosPage';
import { CompaniesPage } from '@/pages/companies/CompaniesPage';
import { HistoricalImportWorkspace } from '@/pages/data/HistoricalImportWorkspace';
import { AccountMappingStudio } from '@/pages/data/AccountMappingStudio';
import { BlueprintsPage } from '@/pages/blueprints/BlueprintsPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { InvestmentsPage } from '@/pages/investments/InvestmentsPage';
import { useModelContext } from '@/contexts/ModelContext';

interface AppRoutesProps {
  activeTab: string;
  activeSubTab: string;
  onNavigateTab: (tabId: string, subTabId?: string) => void;
  onOpenWizard: () => void;
}

export function AppRoutes({
  activeTab,
  activeSubTab,
  onNavigateTab,
  onOpenWizard,
}: AppRoutesProps) {
  const { personaMode, activeCompany } = useModelContext();

  switch (activeTab) {
    case 'dashboard':
      return <DashboardPage onNavigateTab={onNavigateTab} />;

    case 'models':
      if (activeSubTab === 'new_wizard') {
        // Trigger wizard and render workspace
        return <PremiumModelWorkspace defaultView="overview" />;
      }
      return (
        <PremiumModelWorkspace
          defaultView={
            activeSubTab === 'statements'
              ? 'statements'
              : activeSubTab === 'health'
              ? 'health'
              : 'overview'
          }
        />
      );

    case 'forecasts':
      return (
        <ForecastsPage
          subTab={
            activeSubTab === 'schedules'
              ? 'schedules'
              : activeSubTab === 'working_capital'
              ? 'working_capital'
              : 'drivers'
          }
        />
      );

    case 'valuation':
      if (activeCompany.sectorId === 'banking') return <BankValuationPage />;
      return (
        <ValuationPage
          subTab={
            activeSubTab === 'comps'
              ? 'comps'
              : activeSubTab === 'sensitivity'
              ? 'sensitivity'
              : 'dcf'
          }
        />
      );

    case 'scenarios':
      return <ScenariosPage />;

    case 'investments':
      return (
        <InvestmentsPage
          subTab={activeSubTab === 'returns' ? 'returns' : 'captable'}
        />
      );

    case 'companies':
      return <CompaniesPage onOpenWizard={onOpenWizard} onNavigateTab={onNavigateTab} />;

    case 'data':
      return activeSubTab === 'mapping' ? <AccountMappingStudio /> : <HistoricalImportWorkspace />;

    case 'blueprints':
      return <BlueprintsPage onNavigateTab={onNavigateTab} />;

    case 'reports':
      return <ReportsPage />;

    case 'my_profile':
      return (
        <div className="p-8 max-w-2xl mx-auto rounded-lg border border-border bg-card shadow-xs space-y-4">
          <h2 className="text-xl font-serif font-medium text-foreground">User Profile & Access Role</h2>
          <p className="text-xs text-muted-foreground">
            Current active persona: <strong className="text-primary uppercase font-bold">{personaMode}</strong>
          </p>
          <div className="p-4 rounded bg-muted/40 text-xs space-y-2">
            <p><strong>Guided Mode:</strong> Curated recommendations, simplified assumptions, high-level impact analysis.</p>
            <p><strong>Professional Mode:</strong> Integrated 3-statement tables, schedules, DCF sensitivity, and line-item drilldowns.</p>
            <p><strong>Advanced Mode:</strong> Granular WACC capital structures, terminal multiples, and full scenario stress testing.</p>
            <p><strong>Reviewer Mode:</strong> Audit trail inspection, mathematical reconciliation verification, and report generation.</p>
          </div>
        </div>
      );

    default:
      return <DashboardPage onNavigateTab={onNavigateTab} />;
  }
}
