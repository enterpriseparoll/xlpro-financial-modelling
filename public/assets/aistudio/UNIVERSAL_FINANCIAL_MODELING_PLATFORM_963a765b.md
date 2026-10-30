# Universal Corporate Financial Modeling Platform
## Product Requirements, Architecture & Implementation Blueprint

**Version:** 1.0 | **Date:** 30 October 2026 | **Target:** React application

## 1. Vision
Build a universal corporate financial modeling platform that makes sophisticated financial planning, forecasting, analysis and valuation understandable to non-specialists while remaining transparent, auditable and powerful for financial professionals. Support listed and unlisted companies globally.

**Product rule:** The user changes business assumptions, not formulas. The system explains the calculation, validates inputs, and shows the impact.

### Design principles
1. Design for actual financial decisions, not every conceivable switch.
2. Separate user interface, configuration/control logic, calculation engine, and outputs.
3. Progressive disclosure: Guided, Professional and Advanced modes share the same engine.
4. Constrain choices and prevent invalid configurations.
5. Always show scenario, model version, overrides, data freshness, warnings and validation state.
6. Never silently fabricate missing financial inputs or market data.
7. Ensure reproducibility: identical versioned inputs and engine produce identical results.

These principles adapt *Keeping Models Usable While Making Them Flexible* (Sloka Balasubramanyan, supplied presentation, especially pages 13–20). The architecture and implementation details below are proposed product design, not claims from the presentation.

## 2. Users and modes
| Persona | Primary need | Default experience |
|---|---|---|
| Business owner / CFO | Budget, cash, runway, funding | Guided |
| FP&A analyst | Integrated forecast and scenarios | Professional |
| Equity analyst | Listed equity research and valuation | Professional |
| Private equity / investment banker | Private valuation, transactions, LBO | Advanced |
| Reviewer / auditor | Explain, trace and approve models | Read-only review |

**Guided:** simple company setup, imports, recommended assumptions, visual projections, plain-English explanations.
**Professional:** schedules, assumptions tables, sensitivity analysis, traceable line items.
**Advanced:** model blueprint configuration, detailed valuation assumptions, complex capital structures and transaction modules.

## 3. Universal core and sector extensions
### Universal services
- Company, entity, fiscal calendar, reporting currency, ownership and securities metadata.
- Historical income statement, balance sheet, cash flow and supporting schedules.
- Canonical chart-of-accounts mapping, data provenance, units and accounting standards.
- Time-series forecasts, scenarios, assumptions, model versions and approvals.
- Financial statement integration, reconciliation, cash/debt schedules, taxes and financing.
- Valuation, sensitivities, investment returns, reporting and audit logs.

### Sector blueprints
| Sector | Typical operating drivers | Important distinction |
|---|---|---|
| Manufacturing | Units, capacity, price, materials, labor | Inventory and production economics |
| Retail | Stores, same-store sales, baskets, inventory | Store cohorts and inventory turnover |
| SaaS / technology | Subscribers, churn, ARPU, CAC | Deferred revenue and cohort dynamics |
| Hospitality | Rooms, occupancy, ADR, RevPAR | Property/management fee economics |
| Real estate | Area, occupancy, rent, NOI | Property-level cash flow and NAV |
| Telecom | Subscribers, ARPU, churn, network CAPEX | Spectrum and infrastructure |
| Energy / mining | Production, reserves, commodity prices | Depletion, project life and closure costs |
| Healthcare | Patients, utilization, payer mix | Reimbursement and service mix |
| Agriculture | Acreage, yield, harvest price | Seasonality and biological assets |
| Construction | Backlog, contract progress, collections | Contract assets and project cash flows |
| Transportation | Fleet, trips, utilization, fuel | Maintenance and asset replacement |
| Banking | Loans, deposits, yields, losses | Specialized financial-institution engine; equity/capital-based valuation |
| Insurance | Premiums, claims, reserves, investments | Specialized actuarial/solvency engine |
| Asset management | AUM, inflows, performance, fees | Fee revenue and regulatory capital |

**Do not** force banks and insurers into industrial working-capital/FCFF conventions. A sector blueprint can select a distinct approved calculation pipeline and statement taxonomy.

### Blueprint specification
A blueprint defines: sector, business model, permitted revenue/cost drivers, statement taxonomy, schedules, valid forecast methods, relevant ratios, eligible valuation methods, input bounds, dependencies, documentation and validation rules. Blueprints reference **versioned, approved calculation functions**; do not execute arbitrary user-defined code.

## 4. Product navigation
| Primary sidebar | Secondary pages |
|---|---|
| Dashboard | Overview, Model Health, Recent Work |
| Companies | Directory, Listed, Private, Entities & Ownership |
| Financial Data | Imports, Mapping, Historical Statements, Adjustments, Data Quality |
| Models | Model Library, New Model Wizard, Workspace, Versions |
| Forecasts | Drivers, Revenue, Costs, Working Capital, CAPEX, Tax, Debt, Statements |
| Valuation | DCF, Trading Comparables, Transactions, NAV, Valuation Bridge |
| Investment Analysis | Listed Equity, Private Equity, Cap Table, Returns, Exit |
| Scenarios | Base/Bull/Bear, Sensitivity, Stress Tests |
| Portfolio | Holdings, Exposure, Valuation History (later phase) |
| Reports | Model Pack, Valuation Report, Investment Memo, Exports |
| Administration | Users, Roles, Access, Blueprints, Providers, Settings, Audit |

Show only applicable pages and controls for the current company type, blueprint, permission and user mode. Preserve a consistent primary/secondary sidebar.

## 5. Guided user journeys
### A. Create model (5-step wizard)
1. **Company:** name, domicile, sector, listed/private, currency, fiscal year-end, accounting basis.
2. **Data:** import XLSX/CSV or enter figures; optional PDF extraction with mandatory review; listed data provider integration when licensed.
3. **Review:** map accounts, detect missing periods, reconcile history, show confidence and provenance.
4. **Forecast:** choose horizon, scenario, recommended driver assumptions; advanced assumptions collapsed by default.
5. **Results:** run validation, view statements, cash requirements, valuation if relevant, export report.

Allow save/resume; autosave drafts; show progress, inline help and sample data; no formula editing in Guided mode.

### B. Daily model workspace
- **Sticky header:** company, industry, currency, forecast period, active scenario, version, last calculation, model status.
- **Overview:** revenue, EBITDA/operating earnings where applicable, cash, debt, free cash flow, equity value where relevant.
- **Assumptions:** grouped driver controls with units, source, baseline, bounds and explanations.
- **Projections:** integrated financial statement tables with historical vs forecast shading and drill-down.
- **Insights:** value drivers, changes versus baseline, sensitivity charts and narrative explanations.
- **Health panel:** reconciliation errors, missing data, unusual inputs, manual overrides and impacted outputs.
- **Review:** comments, change history, comparison, approval and export.

Use animated tables, consistent enhanced date pickers, and a reusable **slide-over drawer** for create/edit/details rather than modal forms. Make tables keyboard-accessible, responsive and exportable.

## 6. Financial data and mapping
- Imports: CSV/XLSX first; PDF only as an assisted extraction workflow; provider APIs by licensed integration.
- Store raw source files separately from normalized financial records.
- Each figure stores entity, period, period type, account code, amount, currency, scale, accounting standard, source, extraction/mapping status, timestamp and reviewer.
- Canonical account mapping is editable with validation; allow company-specific account extensions.
- Historical restatements, audited/unaudited flags, trailing twelve months and fiscal-year alignment.
- Do not merge currencies or mix units (thousands/millions) silently.
- Flag missing statement lines, duplicate periods, inconsistent signs, gaps and unmatched accounts.
- All inferred mappings require review before a model is marked validated.

## 7. Financial calculation engine
### Core schedules
1. Revenue (top-down, bottom-up, driver, contractual, cohort where applicable).
2. COGS and operating expenses.
3. Payroll and headcount (optional).
4. Working capital (AR, inventory, AP, other operating assets/liabilities).
5. CAPEX, fixed assets, depreciation/amortization and disposals.
6. Debt, repayment, interest, cash sweeps and financing.
7. Taxes, losses carried forward and deferred taxes where supported.
8. Integrated P&L, balance sheet and cash flow statement.
9. Free cash flow, liquidity, covenants and ratios.

### Calculation contracts
- Explicit time granularity (monthly/quarterly/annual), opening/closing balances, sign conventions, units and rounding.
- Dependency graph with topological execution; explicitly defined iterative solver for permitted circular cases with convergence limits and failure warnings.
- Deterministic calculations, immutable model runs and versioned formulas.
- Balance sheet: Assets = Liabilities + Equity; cash flow ending cash reconciles to balance sheet cash; debt and fixed-asset roll-forwards reconcile.
- Financial institutions use specialized statements and solvency/capital tests.

### Example hotel driver
`room_revenue = available_rooms × days × occupancy_rate × average_daily_rate`.
For 150 rooms, 365 days, 75% occupancy and $180 ADR: **$7,391,250** annual room revenue, before other revenue streams.

## 8. Listed and unlisted equity
### Listed equity
Ticker/exchange identification, historical market data, share count and dilution, market cap, enterprise-value bridge, peer screening, earnings estimates (where sourced), DCF, trading multiples, implied value per share, upside/downside, dividends and total-return scenarios. Track price and financial-data timestamps. Market data requires provider licensing and corporate-action adjustments.

### Unlisted equity
Financial normalization (owner compensation, nonrecurring items), DCF, public-company comparables with justified adjustments, precedent transactions, adjusted net assets, cap table, preference rights, dilution, investment rounds, exit values, MOIC and IRR. Include minority/control and liquidity considerations where relevant; do not apply generic discounts automatically.

### Valuation methods
- Nonfinancial companies: FCFF/WACC DCF, FCFE/cost-of-equity where appropriate, EV/EBITDA, EV/Revenue, P/E, precedent transactions, adjusted NAV.
- Financial institutions: dividend discount, residual income, P/B and sector-specific approaches as appropriate.
- Real estate and asset-heavy entities: property-level cash flows and NAV when applicable.
- Display valuation **ranges**, method applicability, input provenance, dates and a reconciled enterprise-to-equity bridge.
- Never mechanically average incompatible valuations without rationale.

## 9. Scenarios, sensitivities and explanations
- Base, Upside, Downside and user-created scenarios, each with inherited assumptions and explicit overrides.
- Compare forecast statements, cash runway, funding gaps and valuations side by side.
- One-variable and two-variable sensitivities (e.g., WACC vs terminal growth), tornado charts, break-even analysis.
- Later: Monte Carlo with declared probability distributions, correlations and reproducible seeds.
- **Explain My Model:** deterministic attribution of result changes first; optional AI translates verified calculations into plain language. AI must not invent figures, assumptions or investment recommendations.

## 10. Model governance and validation
- States: Draft → Calculated → Validation Failed / Ready for Review → Approved → Published.
- Validation categories: completeness, compatibility, boundary conditions, statement reconciliations, override disclosure, regression tests.
- Severity: blocking error, warning, informational.
- Store all model inputs, data-source snapshots, selected blueprint, formula-engine version, scenario, output hash, calculation timestamp and actor.
- Every override records old/new values, reason, author, time and affected calculations.
- Role separation: Owner/Admin, Model Builder, Analyst, Reviewer/Approver, Viewer; tenant and company scoped permissions.
- Enforce Supabase RLS and server-side authorization; UI hiding alone is insufficient.
- Require independent review for published investment-grade outputs where organizational policy requires it.

## 11. Technical architecture
**Frontend:** React + TypeScript + Vite, Tailwind CSS, shadcn/ui, TanStack Table, React Hook Form + Zod, Apache ECharts, TanStack Query.

**Backend:** Supabase Auth, PostgreSQL, RLS, Storage; FastAPI for financial modeling APIs; Python calculation workers for larger model runs. Use a job queue and durable status records for asynchronous calculations.

```text
React UI (Guided / Professional / Advanced)
        |
API gateway / FastAPI (authz, validation, orchestration)
        |                         |
Supabase Postgres + Storage    Versioned Python Model Engine
        |                         |
Company data, assumptions     Blueprint registry, dependency graph
scenarios, audit, results     Forecasts, statements, valuation, checks
        \_________________________/
                    |
        Versioned results / reports / explanations
```

**Security:** user/org membership, tenant isolation, company-level access, encrypted secrets, signed uploads, malware scanning, rate limits, background job isolation, audit events and least-privilege service credentials. Never expose privileged database keys in React.

**Reliability:** idempotent calculation requests, retries, timeouts, model run status, monitoring, error tracing, backups, reproducible snapshots and migration discipline.

## 12. Proposed database domains
| Domain | Example tables |
|---|---|
| Tenancy | organizations, memberships, roles, permissions |
| Companies | companies, legal_entities, securities, ownership_positions |
| Financial data | source_documents, import_jobs, accounts, account_mappings, financial_facts, reporting_periods |
| Blueprints | sector_blueprints, blueprint_versions, driver_definitions, formula_registry, validation_rules |
| Modeling | models, model_versions, scenarios, assumption_values, overrides, calculation_runs, calculation_outputs |
| Valuation | valuation_runs, valuation_methods, comparable_sets, comparable_observations, valuation_results |
| Investments | cap_tables, security_classes, investment_cases, return_scenarios |
| Governance | model_checks, approvals, comments, audit_events |
| Reporting | report_templates, generated_reports, export_jobs |

Use UUID keys, organization_id on tenant-owned records, foreign keys, immutable version/run records, and effective dates where relevant. Avoid duplicating all financial results as unstructured JSON; use typed fact/result tables for queries plus versioned snapshots for reproducibility.

## 13. API surface (illustrative)
```http
POST   /companies
POST   /imports
GET    /imports/{id}/mapping
POST   /imports/{id}/confirm
POST   /models
POST   /models/{id}/versions
GET    /models/{id}/workspace
PUT    /models/{id}/scenarios/{scenarioId}/assumptions
POST   /models/{id}/calculate
GET    /calculation-runs/{runId}
GET    /calculation-runs/{runId}/checks
GET    /calculation-runs/{runId}/statements
POST   /models/{id}/valuations
GET    /valuations/{valuationId}
POST   /models/{id}/compare-scenarios
POST   /models/{id}/submit-review
POST   /models/{id}/approve
POST   /reports/generate
```
Define OpenAPI contracts, pagination, idempotency keys, errors and authorization rules before implementation.

## 14. Delivery phases
### Phase 0 — Foundations
- Confirm personas, supported currencies/accounting bases, design system, modeling conventions, taxonomy and blueprint schema.
- Implement auth/RLS, company registry, versioned model structure and calculation contracts.

### Phase 1 — End-to-end MVP
- Guided wizard, XLSX/CSV import and reviewed mapping.
- General corporate blueprint with driver-based revenue/cost forecasts.
- Integrated three statements, cash/debt/CAPEX schedules, validation dashboard.
- Base/Upside/Downside scenarios, FCFF DCF, simple sensitivity, PDF/Excel exports.
- Clear, accessible model workspace and deterministic test fixtures.

**MVP acceptance:** user can import 3 historical years, forecast 5 years, adjust key drivers, reconcile statements, run DCF, compare scenarios and export a reproducible report without touching formulas.

### Phase 2 — Listed/private equity
- Listed data-provider adapter, trading comps, price/share analytics.
- Private financial normalization, cap tables, NAV and investment returns.
- Peer selection, provenance, valuation ranges and approvals.

### Phase 3 — Sector proof
- Manufacturing, SaaS, hospitality and real estate blueprints.
- Banking and insurance specialized engines with separate acceptance criteria.
- Multi-entity and multi-currency consolidation where required.

### Phase 4 — Advanced analytics
- LBO, M&A, project finance, portfolio analytics, Monte Carlo, AI explanations, provider integrations and collaborative review.

## 15. Test and acceptance framework
### Financial tests
- Golden/reference models for each blueprint and valuation method.
- Balance sheet, cash flow, fixed asset, debt and equity reconciliations.
- Zero revenue, negative growth, loss years, negative working capital, refinancing, leap years, currency scaling, fractional share counts.
- Sensitivity monotonicity where economically expected, terminal value bounds, WACC/growth compatibility.
- Explicit handling of circular debt-interest calculations and convergence failures.

### UX tests
- Guided user can create a working model without understanding spreadsheet formulas.
- All assumptions show units, definitions, provenance and affected outputs.
- No hidden override, scenario or stale-data state.
- Tables are usable with keyboard and screen readers; responsive desktop-first design.

### Security and performance tests
- Cross-tenant access denial, company permission checks, malicious import handling, race conditions, concurrent version edits.
- Target baseline: common five-year model recalculation completes interactively; larger jobs run asynchronously with progress. Set numeric SLAs after benchmarking real fixtures.

## 16. Initial development backlog
1. Create app shell, navigation, design tokens, authentication and organization context.
2. Implement company directory, listed/private metadata and sector selection.
3. Define canonical account taxonomy, periods, units and source provenance.
4. Build import pipeline, mapping review and historical statement viewer.
5. Implement blueprint registry and versioned assumption schemas.
6. Build general corporate revenue, cost, working-capital, CAPEX, debt and tax schedules.
7. Integrate P&L, balance sheet, cash flow and reconciliation checks.
8. Add scenario engine and calculation run snapshots.
9. Implement FCFF DCF, WACC inputs, terminal value and equity bridge.
10. Create guided model workspace, assumption drawers, tables and visualizations.
11. Build model health, override history and approval flow.
12. Generate downloadable Excel/PDF model reports.
13. Add regression tests, permission tests and documentation.

## 17. Non-negotiable implementation rules
- No placeholder calculations presented as actual financial results.
- No silent plug values solely to force the balance sheet to balance.
- No user-visible financial figure without period, unit, currency and provenance.
- No direct arbitrary formula execution from imported files or user-supplied blueprints.
- No investment-grade publication with blocking model errors.
- No hardcoded sector logic in React UI; use versioned blueprint metadata.
- No assumption change without an auditable model version or change record.
- Never treat AI-generated explanations as a source of financial truth.

## 18. Decisions to finalize during implementation planning
- Product name and branding.
- MVP jurisdictions, currencies, accounting standards and fiscal calendars.
- Initial sector reference cases and licensed data-provider selection.
- Exact RLS role matrix, organization/workspace behavior and review requirements.
- Whether Excel round-trip editing is required or export-only in MVP.
- Forecast granularity: annual first; monthly/quarterly capability in engine.
- Pricing, deployment topology and compute limits.

---

### Reference
Sloka Balasubramanyan, *Keeping Models Usable While Making Them Flexible* (user-supplied presentation, 23 pages). Core inspiration: governed flexibility, separation of interface from engine, visible model state and systematic validation. This document extends those principles into an original proposed React product specification.
