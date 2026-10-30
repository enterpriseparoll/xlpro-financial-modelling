#!/usr/bin/env python3
"""Wire bank imports to the separate bank validation/activation engine. Idempotent."""
from pathlib import Path
p=Path('src/pages/data/HistoricalImportWorkspace.tsx')
s=p.read_text(encoding='utf-8')
def replace(old,new):
    global s
    if new in s: return
    if old not in s: raise SystemExit('Expected code missing: '+old[:110])
    s=s.replace(old,new)
replace("import { activateHistoricalDataset", "import { readBankWorkbook } from '@/engine/bankWorkbook';\nimport { validateBankHistorical, activateBankHistorical } from '@/engine/bankHistoricalActivation';\nimport { suggestBankCanonical, loadBankMappingOverrides, saveBankMappingOverride, bankCanonicalOptions, type BankCanonical } from '@/engine/bankingCanonical';\nimport { activateHistoricalDataset")
replace("  const issues = useMemo(() => [...parseIssues, ...(draft.length ? validateHistoricalRows(draft) : [])], [draft, parseIssues]);", """  const isBank = draft.some(row => row.sourceFormat === 'long_form');
  const bankValidation = useMemo(() => isBank ? validateBankHistorical(draft, activeCompany.ticker) : null, [draft, isBank, activeCompany.ticker]);
  const issues = useMemo(() => [...parseIssues, ...(isBank ? bankValidation?.issues ?? [] : draft.length ? validateHistoricalRows(draft) : [])], [draft, parseIssues, isBank, bankValidation]);""")
replace("  const activationIssues = useMemo(() => draft.length ? validateForActivation(draft) : [], [draft]);","  const activationIssues = useMemo(() => isBank ? bankValidation?.issues ?? [] : draft.length ? validateForActivation(draft) : [], [draft, isBank, bankValidation]);")
replace("  const calibrated = useMemo(() => calibrateHistoricalDrivers(draft), [draft]);","  const calibrated = useMemo(() => isBank ? {} : calibrateHistoricalDrivers(draft), [draft, isBank]);")
replace("readHistoricalWorkbook(await file.arrayBuffer())","(readBankWorkbook(await file.arrayBuffer()) ?? readHistoricalWorkbook(await file.arrayBuffer()))")
replace("      setDraft(result.rows); setParseIssues(result.issues); setFileName(file.name);", """      const overrides = loadBankMappingOverrides();
      const mapped = result.rows.map(row => {
        if (row.sourceFormat !== 'long_form') return row;
        const match = suggestBankCanonical(row.sourceAccount, overrides);
        return { ...row, canonical: match.needsReview ? '' : match.canonical as typeof row.canonical };
      });
      setDraft(mapped); setParseIssues(result.issues); setFileName(file.name);""")
replace("  const updateMapping = (id: string, canonical: CanonicalAccount | '') => setDraft(rows => rows.map(row => row.id === id ? { ...row, canonical } : row));", """  const updateMapping = (id: string, canonical: CanonicalAccount | '') => {
    setDraft(rows => rows.map(row => row.id === id ? { ...row, canonical } : row));
    const row = draft.find(r => r.id === id);
    if (row?.sourceFormat === 'long_form' && canonical) saveBankMappingOverride(row.sourceAccount, canonical as BankCanonical);
  };""")
replace("      activateHistoricalDataset({ id:", """      if (isBank) {
        activateBankHistorical(activeCompany.id, fileName, draft, units as 'Units' | 'Thousands' | 'Millions', activeCompany.ticker ?? '');
        triggerToast('Bank history activated for bank valuation. Industrial forecasting remains unchanged.', 'success');
        return;
      }
      activateHistoricalDataset({ id:""")
replace("      triggerToast('Reviewed historical data saved in this browser. It is not yet connected to forecasting.', 'success');", "      triggerToast(isBank ? 'Reviewed bank history saved. Activate to use in banking valuation.' : 'Reviewed industrial history saved. Activate to recalculate forecasts.', 'success');")
replace("  const exportReviewed = () => reviewedRowsToExcel(draft, brand);", "  const exportReviewed = () => reviewedRowsToExcel(draft, brand);")
replace("{CANONICAL_ACCOUNTS.map(account => <option key={account.id} value={account.id}>{account.label} · {account.statement}</option>)}","{(isBank ? bankCanonicalOptions() : CANONICAL_ACCOUNTS).map(account => <option key={account.id} value={account.id}>{account.label} · {account.statement}</option>)}")
replace("  const downloadTemplate = () => downloadBrandedWorkbook(", "  const downloadTemplate = () => downloadBrandedWorkbook(")
p.write_text(s,encoding='utf-8')
p=Path('src/pages/valuation/BankValuationPage.tsx')
s=p.read_text(encoding='utf-8')
if 'Load activated bank history' not in s:
    anchor="  const exportExcel = () => {"
    assert anchor in s
    insert="""  const loadActivated = () => {
    try {
      const raw = localStorage.getItem('xlpro:bank-activated:v1:' + activeCompany.id);
      if (!raw) { setIssues([{ severity: 'warning', message: 'No activated banking dataset for this company. Import, review and activate one in Historical Statements.' }]); return; }
      const dataset = JSON.parse(raw) as { ticker: string; rows: ImportedRow[]; fileName: string; units: 'Units'|'Thousands'|'Millions' };
      if (activeCompany.ticker && dataset.ticker !== activeCompany.ticker.toUpperCase()) throw new Error('Activated bank ticker does not match selected company.');
      setRows(dataset.rows); setTicker(dataset.ticker); setFileName(dataset.fileName); setUnits(dataset.units); setIssues([]);
    } catch (error) { setIssues([{ severity: 'error', message: error instanceof Error ? error.message : 'Cannot load activated bank history' }]); }
  };
"""
    s=s.replace(anchor,insert+anchor)
    s=s.replace('<h2 className="font-semibold">1. Import bank financial statements</h2>', '<h2 className="font-semibold">1. Import bank financial statements</h2><button type="button" onClick={loadActivated} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold">Load activated bank history</button>')
    p.write_text(s,encoding='utf-8')
print('Bank import and valuation handoff wired. Run npm run build; review validation findings before activation.')
