# Excel Upload System — Repository Adaptation

Source: user-supplied `EXCEL_UPLOAD_SYSTEM_GUIDE.md` (1,285 lines), provided 30 October 2026.

## Mandatory reusable pattern
1. Download **branded .xlsx** template with headers and sample rows.
2. Upload **.xlsx/.xls**; CSV only as an optional compatibility format.
3. Parse first worksheet, normalize headers, preserve original Excel row numbers.
4. Validate fields, types, financial periods, account mapping and reconciliations.
5. Preview records with statuses **valid / error / uploaded**, counts and progress.
6. Present row-specific errors with actionable correction instructions.
7. Export problematic rows and reasons as **branded .xlsx**.
8. Only commit after review; use idempotent persistence when backend is available.
9. Support slide-in drawer workflow; use shared upload components.
10. Retain company/tenant context, provenance and accounting units.

## Shared architecture
- `src/lib/export/`: branded workbook export (adapted from the supplied `export.zip`). Describe sheets as `ReportExportDocument`s (or `tableDocument(...)` for one table), then `downloadWorkbook(buildWorkbook(docs), name)`. Missing numbers render as "Not available", never 0; no formulas are written.
- `src/lib/excel-upload/`: upload engine. A feature supplies an `UploadSchema` (columns, instructions, sample rows, optional reference sheet, `validateRow` / `validateAll`); the engine builds the template, finds the header row under title rows, keeps original Excel row numbers (and sheet names for multi-sheet uploads), reads percent-formatted cells as shown, and builds the rows-to-fix workbook.
- `src/components/excel-upload/ExcelUploadDrawer.tsx`: shared slide-in upload flow (template → upload → preview with counts → fix and retry → review → explicit apply).
- `src/lib/xlsx.ts`: import `xlsx-js-style` through this so Vite and Node tests get the same module.

Current consumers:
- Valuation assumptions — `src/features/equity-dcf` (drawer, report export, round-trip tests).
- Historical financial statements — `src/features/historical-import` (standard and bank statement schemas, review and issue exports), used by `src/pages/data/HistoricalImportWorkspace.tsx` and the bank valuation page. Statement-level validation stays in `src/engine/historicalImport.ts` and the bank engines.
- Bank exports — `src/features/bank-export` (Excel pack and valuation workbook) and the account mapping review.

## Styled export branding reference
The supplied `export.zip` defines a reusable architecture with `branding.ts`, `sheetBuilder.ts`, `types.ts`, `pdfBuilder.ts` and `index.ts`. Its Excel style implementation uses `xlsx-js-style`, with company title band, primary/accent colors, report metadata, formatted numeric columns, alternate row colors, subtotals and worksheets. Future development should consolidate the reference into a complete shared export library, including multi-section reports and subtotals.

## Safety
- The current financial history workspace saves only to browser localStorage and does **not** feed the forecasting engine.
- Excel worksheets are not trusted input. Validate every field; reject formula injection in generated sheets when exporting untrusted strings; limit workbook size and row counts.
- Do not claim a workbook is audited or a financial model reconciled without supporting evidence.
- Do not report success until server persistence succeeds.
