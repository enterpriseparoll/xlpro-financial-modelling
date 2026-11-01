import { useMemo, useState } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { useModelContext } from '@/contexts/ModelContext';
import { BANK_CANONICAL, bankCanonicalOptions, loadBankMappingOverrides, saveBankMappingOverride, suggestBankCanonical, type BankCanonical } from '@/engine/bankingCanonical';
import type { ImportedRow } from '@/engine/historicalImport';
import { buildWorkbook, downloadWorkbook, tableDocument } from '@/lib/export';

type SavedImport = { companyId: string; fileName: string; importedAt: string; rows: ImportedRow[]; units: string };
const key = (id: string) => 'xlpro:historical-import:v1:' + id;
const normalized = (s: string) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
export function AccountMappingStudio() {
  const { activeCompany, triggerToast } = useModelContext();
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState('');
  const [onlyUnmapped, setOnlyUnmapped] = useState(false);
  const [overrides, setOverrides] = useState(loadBankMappingOverrides);
  const saved = useMemo(() => {
    try {
      const value = JSON.parse(localStorage.getItem(key(activeCompany.id)) || 'null') as SavedImport | null;
      return value?.companyId === activeCompany.id && Array.isArray(value.rows) ? value : null;
    } catch { return null; }
  }, [activeCompany.id, revision]);
  const bankRows = saved?.rows.filter(row => row.sourceFormat === 'long_form') ?? [];
  const unique = useMemo(() => {
    const map = new Map<string, ImportedRow>();
    for (const row of bankRows) if (!map.has(normalized(row.sourceAccount))) map.set(normalized(row.sourceAccount), row);
    return [...map.values()].map(row => ({ row, match: suggestBankCanonical(row.sourceAccount, overrides) }));
  }, [saved, overrides]);
  const unresolved = unique.filter(item => item.match.needsReview);
  const visible = unique.filter(item => (!onlyUnmapped || item.match.needsReview) && item.row.sourceAccount.toLowerCase().includes(query.toLowerCase()));
  const update = (account: string, canonical: string) => {
    if (!canonical) return;
    saveBankMappingOverride(account, canonical as BankCanonical);
    setOverrides(loadBankMappingOverrides());
    triggerToast('Mapping saved for future banking imports.', 'success');
  };
  const exportMappings = () => downloadWorkbook(buildWorkbook([tableDocument({
    sheetName: 'Mappings', title: 'Bank account mapping review', subtitle: 'Saved in this browser only',
    branding: { companyName: activeCompany.name }, currency: activeCompany.currency,
    columns: [{ header: 'Source account', width: 40 }, { header: 'Canonical ID', width: 24 }, { header: 'Confidence' }, { header: 'Mapping source' }, { header: 'Needs review' }],
    rows: unique.map(({ row, match }) => [row.sourceAccount, match.canonical, match.confidence, match.source, match.needsReview ? 'Yes' : 'No']),
  })]), 'xlpro-bank-account-mappings');
  return <PageShell moduleName="FINANCIAL DATA / GOVERNANCE" title="Account Mapping" titleHighlight="Studio"
    description="Reusable banking taxonomy, saved overrides and transparent review. Exact and approved aliases are mapped automatically; fuzzy suggestions require confirmation.">
    <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-base font-semibold">Banking mapping dictionary</h2><p className="text-xs text-muted-foreground">{BANK_CANONICAL.length} canonical definitions · {Object.keys(overrides).length} saved overrides · browser-local</p></div><div className="flex gap-2"><button className="rounded-lg border border-border px-3 py-2 text-xs" onClick={() => setRevision(n => n + 1)}>Refresh saved data</button><button className="rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground disabled:opacity-50" disabled={!unique.length} onClick={exportMappings}>Export Excel review</button></div></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{[['Unique accounts', unique.length], ['Mapped automatically / confirmed', unique.length - unresolved.length], ['Require review', unresolved.length], ['Reporting periods', new Set(bankRows.map(r => r.period)).size]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-muted/50 p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div></div>)}</div>
      {!bankRows.length ? <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No saved banking statements for {activeCompany.name}. Upload and save the SCB workbook under Historical Statements, then return here. Select the correct company first.</div> : <>
        <p className="text-xs text-muted-foreground">Source: {saved?.fileName} · {saved?.rows.length} imported rows. Confirmed overrides apply to subsequent uploads; this screen does not silently rewrite previously saved source data.</p>
        <div className="flex flex-wrap items-center gap-4"><input aria-label="Search source accounts" placeholder="Search account descriptions..." value={query} onChange={e => setQuery(e.target.value)} className="min-w-56 flex-1 rounded-xl border border-border bg-background p-3 text-sm"/><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={onlyUnmapped} onChange={e => setOnlyUnmapped(e.target.checked)}/>Needs review only</label></div>
        <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-xs"><thead className="bg-muted"><tr><th className="p-3 text-left">Source description</th><th className="p-3 text-left">Canonical account</th><th className="p-3 text-left">Match</th></tr></thead><tbody>{visible.map(({row,match}) => <tr key={normalized(row.sourceAccount)} className="border-t border-border"><td className="p-3 font-medium">{row.sourceAccount}</td><td className="p-3"><select aria-label={'Map '+row.sourceAccount} value={match.needsReview ? '' : match.canonical} onChange={e => update(row.sourceAccount, e.target.value)} className={'w-full min-w-52 rounded-lg border p-2 '+(match.needsReview ? 'border-amber-300 bg-amber-50' : 'border-border bg-background')}><option value="">Select banking account...</option>{bankCanonicalOptions().map(option => <option key={option.id} value={option.id}>{option.label} · {option.statement} · {option.kind}</option>)}</select>{match.needsReview && match.canonical && <p className="mt-1 text-amber-700">Suggested: {match.canonical} — confirm manually</p>}</td><td className="p-3"><span className={match.needsReview ? 'text-amber-700' : 'text-emerald-700'}>{match.source} · {Math.round(match.confidence * 100)}%</span></td></tr>)}</tbody></table></div>
      </>}
    </section>
  </PageShell>;
}
