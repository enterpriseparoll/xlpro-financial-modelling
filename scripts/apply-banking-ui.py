#!/usr/bin/env python3
"""Apply bank mapping UI integration locally. Idempotent; run from repository root."""
from pathlib import Path
p=Path("src/pages/data/HistoricalImportWorkspace.tsx")
s=p.read_text(encoding="utf-8")
def replace(old,new):
    global s
    if old in s: s=s.replace(old,new)
    elif new not in s: raise SystemExit("Expected source not found: "+old[:100])
header="import { activateHistoricalDataset"
replace(header,"import { readBankWorkbook } from '@/engine/bankWorkbook';\nimport { summarizeBankIncome } from '@/engine/bankingModel';\nimport { suggestBankCanonical, bankCanonicalOptions, loadBankMappingOverrides, saveBankMappingOverride, type BankCanonical } from '@/engine/bankingCanonical';\n"+header)
replace("  const issues = useMemo(() => [...parseIssues, ...(draft.length ? validateHistoricalRows(draft) : [])], [draft, parseIssues]);",
"""  const isBank = draft.some(row => row.sourceFormat === 'long_form');
  const bankSummary = useMemo(() => isBank ? summarizeBankIncome(draft) : null, [draft, isBank]);
  const issues = useMemo(() => [...parseIssues, ...(isBank ? bankSummary?.issues ?? [] : draft.length ? validateHistoricalRows(draft) : [])], [draft, parseIssues, isBank, bankSummary]);""")
replace("const activationIssues = useMemo(() => draft.length ? validateForActivation(draft) : [], [draft]);",
"const activationIssues = useMemo(() => isBank ? [] : draft.length ? validateForActivation(draft) : [], [draft, isBank]);")
replace("const calibrated = useMemo(() => calibrateHistoricalDrivers(draft), [draft]);",
"const calibrated = useMemo(() => isBank ? {} : calibrateHistoricalDrivers(draft), [draft, isBank]);")
replace("readHistoricalWorkbook(await file.arrayBuffer())",
"(readBankWorkbook(await file.arrayBuffer()) ?? readHistoricalWorkbook(await file.arrayBuffer()))")
replace("      setDraft(result.rows); setParseIssues(result.issues); setFileName(file.name);",
"""      const overrides = loadBankMappingOverrides();
      setDraft(result.rows.map(row => {
        if (row.sourceFormat !== 'long_form') return row;
        const mapping = suggestBankCanonical(row.sourceAccount, overrides);
        return { ...row, canonical: mapping.needsReview ? '' : mapping.canonical as ImportedRow['canonical'] };
      }));
      setParseIssues(result.issues); setFileName(file.name);""")
replace("  const updateMapping = (id: string, canonical: CanonicalAccount | '') => setDraft(rows => rows.map(row => row.id === id ? { ...row, canonical } : row));",
"""  const updateMapping = (id: string, canonical: CanonicalAccount | '') => setDraft(rows => rows.map(row => {
    if (row.id !== id) return row;
    if (row.sourceFormat === 'long_form' && canonical) saveBankMappingOverride(row.sourceAccount, canonical as BankCanonical);
    return { ...row, canonical };
  }));""")
replace("    if (!draft.length || errors.length) return;","    if (!draft.length || errors.length || (isBank && draft.some(row => !row.canonical))) return;")
replace("  const activate = () => {","  const activate = () => {\n    if (isBank) { triggerToast('Bank statements cannot activate the industrial forecasting engine.', 'error'); return; }")
replace("{CANONICAL_ACCOUNTS.map(account => <option",
"{(isBank ? bankCanonicalOptions().map(account => ({ id: account.id, label: account.label, statement: account.statement })) : [...CANONICAL_ACCOUNTS]).map(account => <option")
replace("disabled={!draft.length || errors.length > 0} onClick={save}",
"disabled={!draft.length || errors.length > 0 || (isBank && draft.some(row => !row.canonical))} onClick={save}")
replace("disabled={!saved || !draft.length || errors.length > 0 || activationErrors.length > 0}",
"disabled={isBank || !saved || !draft.length || errors.length > 0 || activationErrors.length > 0}")
replace("      {draft.length > 0 && <div className=\"rounded-xl border border-border bg-muted/30",
"""      {isBank && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">Banking canonical mapping active · {draft.filter(row => row.canonical).length}/{draft.length} accounts mapped · {bankSummary?.statements.length ?? 0} statement periods. Unrecognized descriptions require manual confirmation. Industrial forecast activation is disabled.</div>}
      {draft.length > 0 && <div className="rounded-xl border border-border bg-muted/30""")
p.write_text(s,encoding="utf-8")
r=Path("src/routes/AppRoutes.tsx"); s=r.read_text(encoding="utf-8")
if "BankValuationPage" not in s:
    s=s.replace("import { ValuationPage } from '@/pages/valuation/ValuationPage';","import { ValuationPage } from '@/pages/valuation/ValuationPage';\nimport { BankValuationPage } from '@/pages/valuation/BankValuationPage';")
    s=s.replace("const { personaMode } = useModelContext();","const { personaMode, activeCompany } = useModelContext();")
    s=s.replace("    case 'valuation':\n      return (","    case 'valuation':\n      if (activeCompany.sectorId === 'banking') return <BankValuationPage />;\n      return (")
    r.write_text(s,encoding="utf-8")
print("Banking import mapping and valuation route patched. Run npm run build and inspect errors.")
