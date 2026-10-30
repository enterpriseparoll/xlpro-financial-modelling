/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Building2,
  Calculator,
  Database,
  FileText,
  FolderKanban,
  GitCompare,
  Layers,
  LayoutDashboard,
  LucideIcon,
  ShieldCheck,
  Sliders,
  TrendingUp,
  User,
} from 'lucide-react';

export interface SubRouteConfig {
  id: string;
  label: string;
  icon?: LucideIcon;
}

export interface RouteConfig {
  id: string;              // unique key, used as tab identifier
  label: string;           // sidebar display name
  icon: LucideIcon;        // lucide-react icon
  group: string;           // sidebar group: 'overview' | 'modeling' | 'analysis' | 'governance'
  sortOrder: number;       // sidebar order; >= 99 = hidden from primary sidebar
  subRoutes?: SubRouteConfig[];
  defaultSubRoute?: string;
}

export const ROUTES: RouteConfig[] = [
  {
    id: 'dashboard',
    label: 'Overview',
    icon: LayoutDashboard,
    group: 'overview',
    sortOrder: 9,
    subRoutes: [
      { id: 'overview', label: 'Executive Overview', icon: LayoutDashboard },
      { id: 'health', label: 'Model Health & Checks', icon: ShieldCheck },
    ],
    defaultSubRoute: 'overview',
  },
  {
    id: 'models',
    label: '3. Model Workspace',
    icon: FolderKanban,
    group: 'modeling',
    sortOrder: 3,
    subRoutes: [
      { id: 'workspace', label: 'Model Workspace', icon: Sliders },
      { id: 'statements', label: 'Integrated 3-Statements', icon: FileText },
      { id: 'new_wizard', label: 'New Model Wizard', icon: TrendingUp },
    ],
    defaultSubRoute: 'workspace',
  },
  {
    id: 'forecasts',
    label: '4. Forecast',
    icon: TrendingUp,
    group: 'modeling',
    sortOrder: 4,
    subRoutes: [
      { id: 'drivers', label: 'Operating Drivers', icon: Sliders },
      { id: 'schedules', label: 'Debt & CAPEX Schedules', icon: Layers },
      { id: 'working_capital', label: 'Working Capital', icon: Database },
    ],
    defaultSubRoute: 'drivers',
  },
  {
    id: 'valuation',
    label: '6. Valuation',
    icon: Calculator,
    group: 'analysis',
    sortOrder: 6,
    subRoutes: [
      { id: 'dcf', label: 'DCF & WACC Engine', icon: Calculator },
      { id: 'comps', label: 'Trading Comparables', icon: Layers },
      { id: 'sensitivity', label: '2D Sensitivity Matrix', icon: GitCompare },
      { id: 'tornado', label: 'Tornado Attribution Chart', icon: TrendingUp },
    ],
    defaultSubRoute: 'dcf',
  },
  {
    id: 'scenarios',
    label: '5. Scenarios',
    icon: GitCompare,
    group: 'analysis',
    sortOrder: 5,
    subRoutes: [
      { id: 'comparison', label: 'Base / Bull / Bear', icon: GitCompare },
      { id: 'stress_test', label: 'Stress Testing', icon: ShieldCheck },
    ],
    defaultSubRoute: 'comparison',
  },
  {
    id: 'investments',
    label: '7. Investment Returns',
    icon: Layers,
    group: 'analysis',
    sortOrder: 7,
    subRoutes: [
      { id: 'captable', label: 'Cap Table & Dilution', icon: Layers },
      { id: 'returns', label: 'Returns & Exit (MOIC/IRR)', icon: Calculator },
    ],
    defaultSubRoute: 'captable',
  },
  {
    id: 'companies',
    label: '1. Company Setup',
    icon: Building2,
    group: 'overview',
    sortOrder: 1,
    subRoutes: [
      { id: 'directory', label: 'Company Directory', icon: Building2 },
      { id: 'create', label: 'Create New Company', icon: Building2 },
      { id: 'entities', label: 'Capital Structure', icon: Layers },
    ],
    defaultSubRoute: 'directory',
  },
  {
    id: 'data',
    label: '2. Import & Map',
    icon: Database,
    group: 'governance',
    sortOrder: 2,
    subRoutes: [
      { id: 'historical', label: 'Historical Statements', icon: Database },
      { id: 'mapping', label: 'Account Mapping Studio', icon: Layers },
      { id: 'quality', label: 'Data Quality & Provenance', icon: ShieldCheck },
    ],
    defaultSubRoute: 'historical',
  },
  {
    id: 'blueprints',
    label: 'Blueprints',
    icon: Layers,
    group: 'governance',
    sortOrder: 10,
    subRoutes: [
      { id: 'registry', label: 'Sector Registry', icon: Layers },
      { id: 'rules', label: 'Validation Rules', icon: ShieldCheck },
    ],
    defaultSubRoute: 'registry',
  },
  {
    id: 'reports',
    label: '8. Reports',
    icon: FileText,
    group: 'governance',
    sortOrder: 8,
    subRoutes: [
      { id: 'pack', label: 'Model Executive Pack', icon: FileText },
      { id: 'governance', label: 'Approval & Governance', icon: ShieldCheck },
      { id: 'audit', label: 'Audit Trail & Overrides', icon: ShieldCheck },
    ],
    defaultSubRoute: 'pack',
  },
  {
    id: 'my_profile',
    label: 'My Profile',
    icon: User,
    group: 'account',
    sortOrder: 99, // hidden from primary sidebar
  },
];

export const getRouteById = (id: string) => ROUTES.find((r) => r.id === id);
export const getSubRoutes = (primaryId: string) => getRouteById(primaryId)?.subRoutes ?? [];
export const getDefaultSubRoute = (primaryId: string) => getRouteById(primaryId)?.defaultSubRoute;
export const getRoutesByGroup = (group: string) => ROUTES.filter((r) => r.group === group);
export const getFlatRoutes = () => ROUTES.filter((r) => r.sortOrder < 99);
export const isValidRoute = (id: string) => ROUTES.some((r) => r.id === id);
export const getRouteLabel = (id: string) => getRouteById(id)?.label ?? id;
