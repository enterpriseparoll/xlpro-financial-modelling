import { useState } from 'react';
import { useModelContext } from '@/contexts/ModelContext';
import { SECTOR_BLUEPRINTS } from '@/engine/blueprints';
import type { AccountingBasis, Company, CurrencyCode, SectorId } from '@/types/finance';
import { X, ArrowRight } from 'lucide-react';

interface Props { open: boolean; onClose: () => void; onModelCreated?: () => void; }
export function NewModelWizardModal({ open, onClose, onModelCreated }: Props) {
  const { addNewCompany } = useModelContext();
  const [name, setName] = useState('');
  const [sectorId, setSectorId] = useState<SectorId>('banking');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [domicile, setDomicile] = useState('');
  const [ticker, setTicker] = useState('');
  const [isListed, setIsListed] = useState(false);
  const [accountingBasis, setAccountingBasis] = useState<AccountingBasis>('IFRS');
  const [description, setDescription] = useState('');
  if (!open) return null;
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const company: Company = {
      id: 'company-' + Date.now().toString(36),
      name: name.trim(), sectorId, currency,
      currencySymbol: ({ USD: '$', EUR: '€', GBP: '£', JPY: '¥', CAD: '$', AUD: '$', CHF: 'CHF', GHS: 'GH₵' } as Record<CurrencyCode, string>)[currency],
      domicile: domicile.trim() || 'Not specified',
      fiscalYearEnd: '12-31', accountingBasis, isListed,
      ticker: isListed ? ticker.trim().toUpperCase() || undefined : undefined,
      shareCount: 0, description: description.trim(),
    };
    addNewCompany(company);
    onClose();
    onModelCreated?.();
    setName(''); setTicker(''); setDescription('');
  };
  const field = 'w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary';
  const label = 'block text-xs font-semibold text-foreground mb-1.5';
  return <div className="fixed inset-0 z-50 flex justify-end">
    <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close company setup" onClick={onClose} />
    <section role="dialog" aria-modal="true" aria-label="Create company" className="relative z-10 w-full max-w-xl h-full bg-card shadow-xl flex flex-col">
      <header className="flex items-start justify-between p-6 border-b border-border">
        <div><p className="text-xs uppercase tracking-widest text-primary font-semibold">Step 1 of 8 · Company setup</p><h2 className="text-2xl font-semibold mt-2">Create a company</h2><p className="text-sm text-muted-foreground mt-1">Register the company first. Upload its Excel financials in the next step.</p></div>
        <button type="button" onClick={onClose} aria-label="Close"><X className="h-5 w-5" /></button>
      </header>
      <form id="create-company-form" onSubmit={save} className="flex-1 overflow-y-auto p-6 space-y-5">
        <div><label className={label} htmlFor="company-name">Company name *</label><input id="company-name" className={field} value={name} onChange={e=>setName(e.target.value)} required placeholder="e.g. Standard Chartered Bank Ghana PLC" /></div>
        <div><label className={label} htmlFor="sector">Industry blueprint</label><select id="sector" className={field} value={sectorId} onChange={e=>setSectorId(e.target.value as SectorId)}>{Object.values(SECTOR_BLUEPRINTS).map(bp=><option key={bp.id} value={bp.id}>{bp.name}</option>)}</select><p className="text-xs text-muted-foreground mt-1">{SECTOR_BLUEPRINTS[sectorId]?.description}</p></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={label} htmlFor="country">Country / domicile</label><input id="country" className={field} value={domicile} onChange={e=>setDomicile(e.target.value)} placeholder="e.g. Ghana" /></div>
          <div><label className={label} htmlFor="currency">Reporting currency</label><select id="currency" className={field} value={currency} onChange={e=>setCurrency(e.target.value as CurrencyCode)}>{(['USD','EUR','GBP','JPY','CAD','AUD','CHF','GHS'] as CurrencyCode[]).map(c=><option key={c} value={c}>{c}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={label} htmlFor="accounting">Accounting standard</label><select id="accounting" className={field} value={accountingBasis} onChange={e=>setAccountingBasis(e.target.value as AccountingBasis)}><option value="IFRS">IFRS</option><option value="US_GAAP">US GAAP</option></select></div>
          <div><label className={label} htmlFor="listing">Listing status</label><select id="listing" className={field} value={isListed?'listed':'private'} onChange={e=>setIsListed(e.target.value==='listed')}><option value="private">Private / unlisted</option><option value="listed">Publicly listed</option></select></div>
        </div>
        {isListed && <div><label className={label} htmlFor="ticker">Exchange ticker (optional)</label><input id="ticker" className={field} value={ticker} onChange={e=>setTicker(e.target.value)} placeholder="Enter verified ticker" /></div>}
        <div><label className={label} htmlFor="description">Business description (optional)</label><textarea id="description" className={field} rows={3} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe the company" /></div>
        <p className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900 p-3 text-xs">Creating a company does not validate its financial statements or produce an audited valuation. Historical data must be imported and reviewed separately. Company records are stored in this browser only.</p>
      </form>
      <footer className="border-t border-border p-5 flex justify-end gap-3"><button type="button" onClick={onClose} className="px-4 py-2 rounded-md border border-border text-sm">Cancel</button><button form="create-company-form" type="submit" disabled={!name.trim()} className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 flex items-center gap-2">Create & continue <ArrowRight className="h-4 w-4" /></button></footer>
    </section>
  </div>;
}
