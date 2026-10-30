#!/usr/bin/env python3
"""One-time idempotent wiring for the banking mapping studio and SCB account aliases."""
from pathlib import Path
p=Path("src/routes/AppRoutes.tsx")
s=p.read_text(encoding="utf-8")
needle="import { HistoricalImportWorkspace } from '@/pages/data/HistoricalImportWorkspace';"
if "AccountMappingStudio" not in s:
    assert needle in s, "Routes import changed: inspect manually"
    s=s.replace(needle,needle+"\nimport { AccountMappingStudio } from '@/pages/data/AccountMappingStudio';")
    old="    case 'data':\n      return <HistoricalImportWorkspace />;"
    assert old in s, "Data route changed: inspect manually"
    s=s.replace(old,"    case 'data':\n      return activeSubTab === 'mapping' ? <AccountMappingStudio /> : <HistoricalImportWorkspace />;")
    p.write_text(s,encoding="utf-8")
p=Path("src/engine/bankingCanonical.ts")
s=p.read_text(encoding="utf-8")
anchor="  ['impairment_losses','Credit impairment losses','income','detail'],"
new="""  ['impairment_investment_securities','Impairment on investment securities','income','detail'],
  ['impairment_loans_advances','Impairment on loans and advances','income','detail'],
  ['impairment_leases','Lease impairment','income','detail'],
  ['total_impairment','Total impairment reversal/(charge)','income','subtotal'],
  ['operating_income_after_impairment','Operating income net of impairment','income','subtotal'],
  ['depreciation','Depreciation','income','detail'],
"""
if "'impairment_investment_securities'" not in s:
    assert anchor in s
    s=s.replace(anchor,anchor+"\n"+new.rstrip())
    aliases_anchor="  'impairment losses on financial assets':'impairment_losses'"
    aliases="""  'impairment charge reversal on investment securities':'impairment_investment_securities',
  'impairment reversal charge on loans and advances':'impairment_loans_advances',
  'lease impairment reversal charge':'impairment_leases',
  'total impairment reversal charge':'total_impairment',
  'operating income net of impairment charges':'operating_income_after_impairment',
  'depreciation':'depreciation',
"""
    assert aliases_anchor in s
    s=s.replace(aliases_anchor,aliases+aliases_anchor)
    p.write_text(s,encoding="utf-8")
print("Account Mapping Studio route and SCB impairment aliases applied.")
