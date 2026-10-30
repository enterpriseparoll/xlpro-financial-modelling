# Repository-wide agent instructions — xlPro Financial Modelling

These rules apply to **every future feature, page, module, import, export and report** in this repository.

## Excel-first policy (mandatory)
- Use **Excel (.xlsx)** as the primary format for all bulk uploads, downloadable templates, reports, reconciliations, data corrections and exports. CSV may be optional compatibility input but must never be the sole supported format. Do not substitute JSON exports for user-facing spreadsheets.
- All import workflows must follow the supplied `docs/EXCEL_UPLOAD_SYSTEM_GUIDE.md`: download an Excel template; select/upload workbook; preview rows; map columns/accounts; validate each record with actionable row/field errors; show total/valid/error/uploaded counts; allow correction and retry; export problematic rows as a **formatted Excel workbook**.
- Use a shared reusable upload engine and components; do not create one-off upload experiences. Prefer slide-in drawers over modal dialogs and use consistent animated tables where available.
- All Excel exports must use the **branded, reusable export infrastructure** under `src/lib/export/`, adapted from the supplied reference package. Respect company name, currency, primary/accent colors, report title, reporting period, and appropriate number/date formats. Do not invent audit opinions or approvals.
- Reuse `xlsx-js-style` for styled exports and workbook reads where practical; review dependencies and security updates before release.
- Upload templates must be **actual .xlsx files** with labeled columns, instructions, sample data, and validations where practical.
- Never auto-commit imported financial data to the forecasting engine. Validate, reconcile, obtain user confirmation, record source/provenance, and only then activate a reviewed dataset.
- Keep data tenant/company scoped; prevent cross-company leakage. Never represent browser localStorage as secure server persistence.

## Engineering and product
- React + TypeScript; preserve current routing, financial engine, design tokens and existing permissions.
- Use reusable, accessible components and responsive layouts. Prefer deterministic financial calculations and explicit validation over invented metrics.
- For every change: check type errors, build, import/export round trips, malformed workbooks, negative/zero values, multiple periods, and tenant isolation.
- Clearly label prototype-only behavior and missing backend functionality. No fake success messages.

## Source references
- `docs/EXCEL_UPLOAD_SYSTEM_GUIDE.md` — user-provided modular upload pattern, preview, validation, problematic record export.
- `src/lib/export/` — user-provided styled export architecture and branding utilities.
