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
- `src/lib/excelWorkbook.ts`: Excel import and branded workbook export adapter.
- `src/engine/historicalImport.ts`: historical data validation and canonical mapping.
- `src/pages/data/HistoricalImportWorkspace.tsx`: first consumer.

## Styled export branding reference
The supplied `export.zip` defines a reusable architecture with `branding.ts`, `sheetBuilder.ts`, `types.ts`, `pdfBuilder.ts` and `index.ts`. Its Excel style implementation uses `xlsx-js-style`, with company title band, primary/accent colors, report metadata, formatted numeric columns, alternate row colors, subtotals and worksheets. Future development should consolidate the reference into a complete shared export library, including multi-section reports and subtotals.

## Safety
- The current financial history workspace saves only to browser localStorage and does **not** feed the forecasting engine.
- Excel worksheets are not trusted input. Validate every field; reject formula injection in generated sheets when exporting untrusted strings; limit workbook size and row counts.
- Do not claim a workbook is audited or a financial model reconciled without supporting evidence.
- Do not report success until server persistence succeeds.
