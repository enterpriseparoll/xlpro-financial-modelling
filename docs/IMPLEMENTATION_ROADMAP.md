# xlPro — Implementation Roadmap and Audit Notes

## Current code audit (30 October 2026)

Existing React/Vite application includes dashboard, companies, financial data, models, forecasts, valuation, scenarios, investments, reports and blueprint pages. There is a TypeScript calculation engine, sector blueprints, driver editing and model checks. These are a useful UI prototype, **not yet evidence of a production-grade financial platform**.

### Changes in this revision
- Renamed package to `xlpro-financial-modelling`.
- Removed fabricated sample audit history from live state.
- Isolated assumption overrides by company and scenario; persist them in local browser storage.
- Added finite-number validation for driver updates.
- Removed hard-coded `Δ 0.00` from the model-health header.
- Added an explicit illustrative-data/prototype banner to prevent mistaken reliance on demo valuations.
- Replaced generated AI Studio README with local setup and risk disclosure.

### Critical unresolved gaps
1. **Data provenance**: `getHistoricalBase()` supplies generated histories; introduce real statement imports with mapping, review, accounting basis, currency, source, period and audit provenance.
2. **Model correctness**: independently verify balance sheet, cash flow, working capital, debt, tax, terminal value, EV-to-equity bridge, share count and valuation methodology; build golden-case regression fixtures.
3. **Sector suitability**: banks and insurers need separate specialized financial and valuation engines, not just different revenue drivers.
4. **Durable backend**: Supabase schema, tenant-aware RLS, role permissions, company membership, versioned assumptions, calculation snapshots, approvals and immutable audit events.
5. **UI integrity**: replace prototype controls with real saved workflows; never present calculated model status as verified financial truth without source and reconciliation checks.
6. **Security**: no API secrets in browser bundles, no client-authoritative permission checks, validated file uploads and controlled model execution.
7. **Quality**: CI for typecheck, unit/integration tests, accessible UI, end-to-end workflows and financial calculation benchmarks.

## Recommended delivery sequence

### Milestone 1 — trustworthy data
- Multi-tenant companies and financial periods.
- CSV/XLSX ingestion, mapping to standardized chart of accounts, validation and approval.
- Historical income statement, balance sheet and cash flow with provenance.
- Explicit missing-data states; no silent fabricated actuals.

### Milestone 2 — audited core model
- Deterministic versioned calculation engine, canonical units and currency.
- Reconciled three statements, capex/depreciation, working capital and financing schedules.
- Test suite including zero/negative values, timing changes and circular financing cases.
- Model-health gate before publication.

### Milestone 3 — guided experience
- Simple guided model wizard, contextual assumptions, inline explanations and slide-in editing drawers.
- Saved model versions, scenario comparison, audit trail and review workflow.
- Responsive dashboard with clear actual vs forecast vs scenario distinctions.

### Milestone 4 — valuation
- Corporate DCF with explicit FCFF/WACC consistency, trading comparables and private-company adjustments.
- Listed/unlisted workflows, ownership and share counts, net debt and equity bridge.
- Sensitivities, method suitability warnings and reproducible valuation reports.

### Milestone 5 — industry blueprints
- Manufacturing, retail, SaaS, hospitality and real estate pilot blueprints.
- Separate banking and insurance engines with domain-specific validations.
- Blueprint compatibility tests and versioned template publication.

## Design principles
- Guided by default; expert controls progressively disclosed.
- Never require users to edit formulas.
- Show active company, scenario, source freshness, overrides and failed checks.
- Use approved reusable formulas, not user-executed arbitrary expressions.
- Prefer one consistent animated table, date picker and slide-in drawer system.
- Keep presentation separate from control logic and financial calculations.
