# App Architecture & Routing Global Standard — All Apps

> One layout shell. One route config. One source of truth. No exceptions.

---

## How This Fits the Full Stack

```
Frontend (UI/UX Requirements)
        ↓
Type Definitions       →  src/integrations/supabase/types/[module].ts
        ↓
Database Schema        →  supabase/migrations/
        ↓
Services               →  src/services/[feature]/
        ↓
Hooks                  →  src/hooks/[feature]/
        ↓
Components & Pages     →  src/components/ and src/pages/
        ↓
App Shell & Routing    →  src/App.tsx + src/config/routes.config.ts  ← THIS GUIDE
```

---

## Full Folder Structure

```
src/
├── App.tsx                          ← layout shell, root state
├── main.tsx                         ← providers wrapping App
│
├── config/
│   └── routes.config.ts             ← ONLY place routes are defined
│
├── routes/
│   └── AppRoutes.tsx                ← renders page per active route
│
├── contexts/
│   ├── YearMonthFilterContext.tsx   ← global period selector
│   └── AuthContext.tsx              ← auth state
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx              ← dual sidebar (primary + secondary)
│   │   ├── Header.tsx
│   │   └── PageShell.tsx            ← standard page header wrapper
│   ├── animated/
│   │   ├── AnimatedTable.tsx        ← ALL tables use this
│   │   └── index.ts
│   └── ui/
│       ├── searchable-select.tsx    ← ALL dropdowns use this
│       ├── enhanced-date-picker.tsx ← ALL date inputs use this
│       ├── slide-in-form.tsx        ← ALL forms use this
│       └── confirm-dialog.tsx       ← ALL delete actions use this
│
├── services/
│   ├── settings.service.ts          ← route sync lives here
│   └── [feature]/
│       └── [feature].service.ts
│
├── hooks/
│   └── [feature]/
│       └── use[Feature].ts
│
└── features/
    └── [feature]/
        ├── components/
        ├── hooks/
        ├── services/
        └── types.ts
```

---

## 1. Layout Shell

**File:** `src/App.tsx`

The root layout is a single `flex h-screen overflow-hidden` container. Three children left-to-right: primary sidebar, secondary sidebar, main content area.

```
┌────────────────────────────────────────────────────────────┐
│  Primary  │  Secondary  │  Main Content                    │
│  Sidebar  │  Sidebar    │  (Header + scrollable <main>)    │
│  (80px)   │  (224px)    │                                  │
└────────────────────────────────────────────────────────────┘
```

```tsx
// src/App.tsx
<div className="flex h-screen overflow-hidden bg-background text-foreground">
  <Sidebar />
  <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
    <Header />
    <main className="flex-1 overflow-y-auto p-6 space-y-6">
      <AppRoutes />
    </main>
  </div>
</div>
```

The `<main>` element is the only scrolling region. Sidebars and the header are always fixed in view. Never add `overflow-y-auto` to a page component — scrolling belongs to `<main>` only.

---

## 2. Providers

**File:** `src/main.tsx`

Wrap the app with all global providers in this order:

```tsx
// src/main.tsx
<AuthProvider>
  <YearMonthFilterProvider>
    <App />
  </YearMonthFilterProvider>
</AuthProvider>
```

Add new contexts here only. Never nest providers inside pages or feature components.

---

## 3. Route Config — Single Source of Truth

**File:** `src/config/routes.config.ts`

> This is the only place routes are defined. Never define routes anywhere else.

### RouteConfig shape

```ts
export interface SubRouteConfig {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface RouteConfig {
  id: string;              // unique key, used as tab identifier
  label: string;           // sidebar display name
  icon: LucideIcon;        // lucide-react icon
  group: string;           // sidebar group: 'overview' | 'administration' | 'accounting' | etc.
  sortOrder: number;       // sidebar order; >= 99 = hidden from primary sidebar
  subRoutes?: SubRouteConfig[];
  defaultSubRoute?: string;
}

export const ROUTES: RouteConfig[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    group: 'overview',
    sortOrder: 1,
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    group: 'administration',
    sortOrder: 2,
    subRoutes: [
      { id: 'stock_received',  label: 'Stock Received',  icon: PackagePlus },
      { id: 'stock_transfers', label: 'Stock Transfers', icon: ArrowLeftRight },
    ],
    defaultSubRoute: 'stock_received',
  },
  {
    id: 'my_profile',
    label: 'My Profile',
    icon: User,
    group: 'account',
    sortOrder: 99,   // hidden from sidebar
  },
];
```

### Utility functions

Always use these — never traverse `ROUTES` directly in components.

```ts
export const getRouteById       = (id: string) => ROUTES.find(r => r.id === id);
export const getSubRoutes       = (primaryId: string) => getRouteById(primaryId)?.subRoutes ?? [];
export const getDefaultSubRoute = (primaryId: string) => getRouteById(primaryId)?.defaultSubRoute;
export const getRoutesByGroup   = (group: string) => ROUTES.filter(r => r.group === group);
export const getFlatRoutes      = () => ROUTES.filter(r => r.sortOrder < 99);
export const isValidRoute       = (id: string) => ROUTES.some(r => r.id === id);
export const getRouteLabel      = (id: string) => getRouteById(id)?.label ?? id;
```

### Adding a new module — checklist

1. Add a `RouteConfig` entry to `ROUTES` in `routes.config.ts`
2. Add `subRoutes` array if the module has sub-pages
3. Set `defaultSubRoute` to the first sub-route id
4. Add a `case` in `src/routes/AppRoutes.tsx`
5. Add the route definition to `syncRoutes()` in `settings.service.ts`
6. Click **Sync Routes** in Settings → System to push to the database

The sidebar, permission system, and route sync all pick it up automatically from step 1.

---

## 4. Route Renderer

**File:** `src/routes/AppRoutes.tsx`

Renders the correct page component based on the active route from app state.

```tsx
// src/routes/AppRoutes.tsx
export function AppRoutes({ activeTab, activeSubTab }: AppRoutesProps) {
  switch (activeTab) {
    case 'dashboard':    return <DashboardPage />;
    case 'inventory':    return <InventoryRoutes activeSubTab={activeSubTab} />;
    case 'sales':        return <SalesRoutes activeSubTab={activeSubTab} />;
    case 'settings':     return <SettingsRoutes activeSubTab={activeSubTab} />;
    default:             return <DashboardPage />;
  }
}
```

Sub-route renderer pattern:

```tsx
function InventoryRoutes({ activeSubTab }: { activeSubTab: string }) {
  switch (activeSubTab) {
    case 'stock_received':  return <StockReceivedPage />;
    case 'stock_transfers': return <StockTransfersPage />;
    default:                return <StockReceivedPage />;
  }
}
```

---

## 5. Dual Sidebar

**File:** `src/components/layout/Sidebar.tsx`

### Primary sidebar (80px, dark)

- Renders one icon button per route from `ROUTES` where `sortOrder < 99`
- Active route gets highlighted (`bg-indigo-600`)
- Bottom section: user avatar → navigates to My Profile; logout button

```tsx
const primaryItems = ROUTES
  .filter(r => r.sortOrder < 99)
  .sort((a, b) => a.sortOrder - b.sortOrder);
```

### Secondary sidebar (224px, white)

- Visible when secondary panel is open; collapses to a 16px restore handle
- Reads sub-routes for the active primary route from `getSubRoutes(activeTab)`
- Active sub-route gets `bg-indigo-50 border-l-2 border-indigo-600` highlight
- Bottom: shows current user role badge

```tsx
const subItems = getSubRoutes(activeTab);
```

### Visibility filtering

Both sidebars filter items through `isRouteVisible(routeId, role)` which reads the `role_permissions` table. Default is visible when no explicit entry exists.

---

## 6. Route Sync System (RBAC)

Routes in code must stay in sync with the `role_permissions` table in the database. This is how the sidebar knows what each role can see.

### How it works

```
ROUTES array in routes.config.ts
        ↓
syncRoutes() in settings.service.ts     ← reads ROUTES, writes to DB
        ↓
role_permissions table in Supabase      ← one row per role per route
        ↓
Sidebar reads allowed routes for user's role
```

### Database schema

```sql
-- supabase/migrations/TIMESTAMP_create_role_permissions.sql

CREATE TABLE IF NOT EXISTS public.role_permissions (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  role        TEXT    NOT NULL,
  route_path  TEXT    NOT NULL,
  route_label TEXT    NOT NULL,
  route_group TEXT    NOT NULL DEFAULT 'general',
  is_allowed  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_role_permissions_unique
ON public.role_permissions (role, route_path);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own role permissions"
ON public.role_permissions FOR SELECT TO authenticated
USING (role = (SELECT role FROM public.profiles WHERE id = auth.uid()));
```

### Sync service

**File:** `src/services/settings.service.ts`

```ts
const routeDefinitions = getFlatRoutes().map(r => ({
  route_path:  r.id,
  route_label: r.label,
  route_group: r.group,
}));

const roles = ['admin', 'manager', 'staff']; // adjust per app

export async function syncRoutes(): Promise<{
  inserted: number;
  skipped: number;
  error: Error | null;
}> {
  let inserted = 0;
  let skipped = 0;

  for (const role of roles) {
    for (const route of routeDefinitions) {
      const { data: existing } = await supabase
        .from('role_permissions')
        .select('id')
        .eq('role', role)
        .eq('route_path', route.route_path)
        .single();

      if (!existing) {
        const { error } = await supabase
          .from('role_permissions')
          .insert({
            role,
            route_path:  route.route_path,
            route_label: route.route_label,
            route_group: route.route_group,
            is_allowed:  role === 'admin', // admin gets all by default
          });

        if (!error) inserted++;
      } else {
        skipped++;
      }
    }
  }

  return { inserted, skipped, error: null };
}
```

Key rules:
- `getFlatRoutes()` from `routes.config.ts` is always the source — never hardcode route paths in the sync function
- Admin role gets `is_allowed: true` by default; all other roles get `false`
- The function is idempotent — safe to run multiple times

### Sync UI

**File:** `src/pages/settings/SystemTab.tsx`

An admin-only button in Settings → System triggers the sync:

```tsx
const handleSyncRoutes = async () => {
  setSyncing(true);
  const { inserted, skipped, error } = await syncRoutes();
  setSyncing(false);

  if (error) {
    triggerToast('Route sync failed: ' + error.message, 'error');
  } else {
    triggerToast(`Sync complete: ${inserted} added, ${skipped} already existed`, 'success');
  }
};
```

### Granting permissions to roles

After syncing, grant access per role in the database:

```sql
UPDATE public.role_permissions
SET is_allowed = true
WHERE role = 'manager'
  AND route_path IN ('inventory', 'sales');
```

Or build a Permission Matrix UI in Settings for admin management.

---

## 7. App State

**File:** `src/hooks/useAppState.ts`

All application state lives in one hook, called once at the `App` level and passed down via `AppRoutes`. Do not call `useAppState` in child components.

Key state slices:

| Slice | Description |
|---|---|
| `activeTab` | Current primary route id |
| `activeSubTab` | Current sub-route id |
| `pageVisibility` | DB-backed role permission matrix |
| `isSecondaryOpen` | Secondary sidebar open/closed state |

Navigation from code — always use `handleNavigateTab`:

```ts
// Sets primary tab and default sub-route automatically
handleNavigateTab('inventory');
```

---

## 8. Global Period Context

**File:** `src/contexts/YearMonthFilterContext.tsx`

The single global period selector. Every form, table, report, and service that needs a date period reads from this context. Never pass year/month as ad-hoc props between components.

```tsx
// Wrap at root in main.tsx
<YearMonthFilterProvider>
  <App />
</YearMonthFilterProvider>
```

```tsx
// Use in any component
const { year, month, setPeriod } = useYearMonthFilterContext();

// Derive period string
const payPeriod = month === 0
  ? `${year}-All`
  : `${year}-${String(month).padStart(2, '0')}`;
```

| Value | Type | Description |
|---|---|---|
| `year` | `number` | Full year e.g. `2026` |
| `month` | `number` | 1–12; `0` = all year |
| `setPeriod(y, m)` | function | Updates the global period |

---

## 9. Mandatory UI Components

These components must be used everywhere their use case applies. No one-off replacements.

### AnimatedTable — every data table

```tsx
import { AnimatedTable } from '@/components/animated';

<AnimatedTable
  data={data}
  columns={columns}
  emptyMessage="No records found"
/>
```

Never use raw `<table>` elements in feature components.

---

### SlideInForm — every add, edit, and detail form

```tsx
import { SlideInForm } from '@/components/ui/slide-in-form';

<SlideInForm
  open={open}
  onOpenChange={setOpen}
  title="Add Record"
  description="Fill in the details below"
>
  <FeatureFormFields form={form} />
</SlideInForm>
```

Forms with employee selection use a left-dock employee panel inside the slide-in form. The form footer is sticky with Cancel and Save buttons.

Never use standalone modals or inline forms unless there is a documented exception.

---

### SearchableSelect — every dropdown

```tsx
import { SearchableSelect } from '@/components/ui/searchable-select';

<SearchableSelect
  value={form.watch('category_id')}
  onValueChange={(value) => form.setValue('category_id', value)}
  options={categoryOptions}
  placeholder="Select category"
/>
```

Never use raw `<select>` elements in feature forms.

---

### EnhancedDatePicker — every date input

```tsx
import { EnhancedDatePicker } from '@/components/ui/enhanced-date-picker';

<EnhancedDatePicker
  value={form.watch('transaction_date')}
  onChange={(date) => form.setValue('transaction_date', date)}
  placeholder="Select date"
/>
```

Never use raw `<input type="date" />` in feature forms.

---

### ConfirmDialog — every delete action

Every delete action must show a confirmation dialog before executing. Never delete directly on button click.

```tsx
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const [confirmOpen, setConfirmOpen] = useState(false);
const [targetId, setTargetId] = useState<string | null>(null);

const handleDeleteClick = (id: string) => {
  setTargetId(id);
  setConfirmOpen(true);
};

const handleConfirmDelete = async () => {
  if (!targetId) return;
  await deleteRecord(targetId);
  setConfirmOpen(false);
  setTargetId(null);
  triggerToast('Record deleted successfully.', 'success');
};

<ConfirmDialog
  open={confirmOpen}
  onOpenChange={setConfirmOpen}
  title="Delete Record"
  description="This action cannot be undone. Are you sure you want to delete this record?"
  confirmLabel="Delete"
  onConfirm={handleConfirmDelete}
  destructive
/>
```

Never skip this. Every delete button → ConfirmDialog → then execute.

---

## 10. Toast Notifications

Always use `triggerToast` from app state. Never import a third-party toast library directly into feature components.

```ts
triggerToast('Record saved successfully.', 'success');
triggerToast('No data found for this period.', 'info');
triggerToast('Failed to save record.', 'error');
```

---

## 11. Data Fetching

Use React Query for all Supabase calls.

```tsx
// Use isLoading — not isFetching — as the gate for spinners
const { data = [], isLoading } = useProducts();

if (isLoading) return <LoadingSpinner />;
```

`isFetching` stays `true` during background refetches and will permanently block render when `placeholderData` is set. Always use `isLoading`.

Query key pattern:

```ts
['feature', 'subtype', companyId, year, month]
```

Loading spinner:

```tsx
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-16 gap-2 text-slate-400">
      <div className="h-5 w-5 rounded-full border-2 border-indigo-200 border-t-indigo-600 animate-spin" />
      <span className="text-xs font-bold">Loading…</span>
    </div>
  );
}
```

---

## 12. Page Header Pattern

Every page should open with a consistent header block:

```tsx
<div className="flex items-start justify-between flex-wrap gap-4">
  <div>
    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-600">
      Module Name
    </span>
    <h2 className="text-3xl font-display font-black tracking-tight text-slate-900 leading-none mt-1">
      Page <span className="text-indigo-600">Title</span>
    </h2>
    <p className="text-slate-500 text-sm mt-1.5 font-bold">Short description.</p>
  </div>
  <div className="flex items-center gap-2 shrink-0">
    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400
                     bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
      {periodLabel}
    </span>
    <button className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600
                       hover:bg-indigo-700 text-white text-xs font-black uppercase
                       rounded-xl shadow-sm transition-all">
      + Add Record
    </button>
  </div>
</div>
<div className="w-16 h-1 bg-indigo-500 rounded-full" />
```

---

## 13. In-Page View Switcher (Sub-Tabs)

When a page has multiple views, use this tab switcher — not secondary sidebar navigation:

```tsx
const [viewTab, setViewTab] = useState<'list' | 'summary' | 'breakdown'>('list');

<div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
  {[
    { key: 'list',      label: 'List View' },
    { key: 'summary',   label: 'Summary' },
    { key: 'breakdown', label: 'Breakdown' },
  ].map(tab => (
    <button
      key={tab.key}
      type="button"
      onClick={() => setViewTab(tab.key as typeof viewTab)}
      className={`px-4 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wide transition-all ${
        viewTab === tab.key
          ? 'bg-white text-indigo-700 shadow-sm'
          : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>
```

---

## 14. Feature Folder Structure

Each feature lives under `src/features/[feature]/`:

```
src/features/overtime/
├── components/
│   ├── OvertimePage.tsx       ← thin page, composes below
│   ├── OvertimeTable.tsx      ← uses AnimatedTable
│   ├── AddOvertimeForm.tsx    ← uses SlideInForm
│   └── OvertimeFormFields.tsx ← reusable fields
├── hooks/
│   ├── useOvertime.ts
│   ├── useCreateOvertime.ts
│   └── index.ts
├── services/
│   ├── overtime.service.ts
│   └── index.ts
└── types.ts                   ← Row, Insert, Update or import from integrations/supabase/types
```

Types in `types.ts` should import from `src/integrations/supabase/types/` when possible rather than redefining locally.

---

## 15. Shared Component Reference

| Component | Import Path | Required for |
|---|---|---|
| `AnimatedTable` | `@/components/animated` | All data tables |
| `SlideInForm` | `@/components/ui/slide-in-form` | All add/edit forms |
| `SearchableSelect` | `@/components/ui/searchable-select` | All dropdowns |
| `EnhancedDatePicker` | `@/components/ui/enhanced-date-picker` | All date inputs |
| `ConfirmDialog` | `@/components/ui/confirm-dialog` | All delete actions |
| `PageShell` | `@/components/layout/PageShell` | All page headers |
| `LoadingSpinner` | `@/components/ui/loading-spinner` | All loading states |

---

## 16. New Module Checklist

Use this every time a new feature is added:

**Routing**
- [ ] Route added to `ROUTES` in `src/config/routes.config.ts` only
- [ ] `subRoutes` and `defaultSubRoute` defined if module has sub-pages
- [ ] `case` added in `src/routes/AppRoutes.tsx`
- [ ] Route definition added to `routeDefinitions` in `settings.service.ts`
- [ ] **Sync Routes** clicked in Settings → System after deployment

**Data**
- [ ] Type file exists at `src/integrations/supabase/types/[module].ts`
- [ ] `Row`, `Insert`, `Update` and aliases defined
- [ ] Migration written and matches the type file exactly
- [ ] Service file at `src/services/[feature]/[feature].service.ts`
- [ ] Hooks at `src/hooks/[feature]/`

**UI**
- [ ] Page is thin — composes components, loads one main hook
- [ ] All tables use `AnimatedTable`
- [ ] All forms use `SlideInForm`
- [ ] All dropdowns use `SearchableSelect`
- [ ] All date inputs use `EnhancedDatePicker`
- [ ] All delete actions use `ConfirmDialog`
- [ ] Period reads from `useYearMonthFilterContext()` — not passed as props
- [ ] Loading state uses `isLoading` — not `isFetching`
- [ ] Toasts use `triggerToast` — not third-party toast imports
- [ ] All imports use `@/` alias paths
- [ ] All folders have `index.ts` barrel exports

---

## LLM Prompt

Use this when directing an AI to build a new module:

```
Build a new feature module following the project architecture standard.

Project structure:
- Routes: src/config/routes.config.ts (only place routes are defined)
- Route renderer: src/routes/AppRoutes.tsx
- Types: src/integrations/supabase/types/[module].ts
- Services: src/services/[feature]/[feature].service.ts
- Hooks: src/hooks/[feature]/
- Feature: src/features/[feature]/components/, hooks/, services/

Rules:
1. Add the route to ROUTES in routes.config.ts only. Nowhere else.
2. Add a case in AppRoutes.tsx for the new route.
3. Add the route to routeDefinitions in settings.service.ts for DB sync.
4. Types come from src/integrations/supabase/types/ — never redefine locally.
5. All tables use AnimatedTable from @/components/animated.
6. All forms use SlideInForm from @/components/ui/slide-in-form.
7. All dropdowns use SearchableSelect from @/components/ui/searchable-select.
8. All date inputs use EnhancedDatePicker from @/components/ui/enhanced-date-picker.
9. All delete actions show ConfirmDialog before executing.
10. Toast notifications use triggerToast — never import toast libraries in features.
11. Period (year/month) comes from useYearMonthFilterContext() — not passed as props.
12. Data loading uses isLoading — not isFetching.
13. Pages are thin — they compose components and load one main hook.
14. All imports use @/ alias paths.
15. Every folder has an index.ts barrel export.
```
