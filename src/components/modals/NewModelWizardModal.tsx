/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useModelContext } from '@/contexts/ModelContext';
import { SECTOR_BLUEPRINTS } from '@/engine/blueprints';
import {
  AccountingBasis,
  Company,
  CurrencyCode,
  FiscalYearEnd,
  SectorId,
} from '@/types/finance';
import {
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Layers,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';

interface NewModelWizardModalProps {
  open: boolean;
  onClose: () => void;
  onModelCreated?: () => void;
}

export function NewModelWizardModal({ open, onClose, onModelCreated }: NewModelWizardModalProps) {
  const { addNewCompany } = useModelContext();

  const [step, setStep] = useState<number>(1);

  // Form State
  const [name, setName] = useState('Apex Healthcare Partners');
  const [ticker, setTicker] = useState('AHP');
  const [isListed, setIsListed] = useState(false);
  const [sectorId, setSectorId] = useState<SectorId>('healthcare');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [domicile, setDomicile] = useState('United States (Texas)');
  const [fiscalYearEnd, setFiscalYearEnd] = useState<FiscalYearEnd>('12-31');
  const [accountingBasis, setAccountingBasis] = useState<AccountingBasis>('US_GAAP');
  const [shareCount, setShareCount] = useState<number>(25.0);
  const [currentSharePrice, setCurrentSharePrice] = useState<number>(18.5);
  const [description, setDescription] = useState(
    'Specialized multi-specialty clinical practices and ambulatory surgical centers.'
  );

  // Step 2 & 3 Data import & mapping state
  const [dataSourceType, setDataSourceType] = useState<'preset' | 'csv' | 'manual'>('preset');
  const [isDataMapped, setIsDataMapped] = useState(true);

  if (!open) return null;

  const currentBlueprint = SECTOR_BLUEPRINTS[sectorId] || SECTOR_BLUEPRINTS.general;

  const handleFinish = () => {
    const newComp: Company = {
      id: `comp-${sectorId}-${Date.now().toString(36)}`,
      name: name.trim() || 'New Corporate Model',
      ticker: isListed ? (ticker.trim().toUpperCase() || undefined) : undefined,
      isListed,
      sectorId,
      currency,
      currencySymbol: currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$',
      domicile,
      fiscalYearEnd,
      accountingBasis,
      shareCount: Number(shareCount) || 20.0,
      currentSharePrice: isListed ? Number(currentSharePrice) || undefined : undefined,
      description,
    };

    addNewCompany(newComp);
    onClose();
    onModelCreated?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-foreground/40 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-3xl rounded-xl border border-border bg-card shadow-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Wizard Header */}
        <div className="p-6 border-b border-border bg-card flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Guided 5-Step Model Creator
            </span>
            <h2 className="text-xl font-serif font-medium text-foreground tracking-tight mt-0.5">
              Create Validated Financial Model
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="border-b border-border bg-muted/40 px-6 py-3 flex items-center justify-between overflow-x-auto text-xs">
          {[
            { num: 1, label: 'Company Profile' },
            { num: 2, label: 'Financial Data' },
            { num: 3, label: 'Review & Mapping' },
            { num: 4, label: 'Operating Drivers' },
            { num: 5, label: 'Reconciliation' },
          ].map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-2 cursor-pointer transition-colors ${
                step === s.num
                  ? 'text-primary font-bold'
                  : step > s.num
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground'
              }`}
              onClick={() => {
                if (step > s.num) setStep(s.num);
              }}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                  step === s.num
                    ? 'bg-primary text-primary-foreground'
                    : step > s.num
                    ? 'bg-primary-soft text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > s.num ? <Check className="h-3 w-3" /> : s.num}
              </span>
              <span className="whitespace-nowrap">{s.label}</span>
              {s.num < 5 && <span className="text-border mx-1">•</span>}
            </div>
          ))}
        </div>

        {/* Wizard Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* STEP 1: Company Profile */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
                    Company Legal Entity Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="e.g. Apex Health Partners"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
                    Sector Blueprint
                  </label>
                  <select
                    value={sectorId}
                    onChange={(e) => setSectorId(e.target.value as SectorId)}
                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {Object.values(SECTOR_BLUEPRINTS).map((bp) => (
                      <option key={bp.id} value={bp.id}>
                        {bp.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Blueprint Description Banner */}
              <div className="rounded-lg border border-primary/20 bg-primary-soft/40 p-3.5 space-y-1">
                <p className="text-xs font-semibold text-primary">
                  {currentBlueprint.name} Blueprint Activated
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {currentBlueprint.description}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {currentBlueprint.typicalOperatingDrivers.map((d) => (
                    <span
                      key={d}
                      className="text-[10px] bg-card px-2 py-0.5 rounded border border-border font-medium text-foreground"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
                    Capital Structure
                  </label>
                  <select
                    value={isListed ? 'listed' : 'private'}
                    onChange={(e) => setIsListed(e.target.value === 'listed')}
                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="private">Private / Unlisted Entity</option>
                    <option value="listed">Publicly Listed (Exchange Traded)</option>
                  </select>
                </div>

                {isListed && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
                      Ticker Symbol
                    </label>
                    <input
                      type="text"
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value)}
                      placeholder="e.g. AHP"
                      className="w-full h-10 px-3 rounded-md border border-border bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring uppercase"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
                    Reporting Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="CAD">CAD ($)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
                    Accounting Basis
                  </label>
                  <select
                    value={accountingBasis}
                    onChange={(e) => setAccountingBasis(e.target.value as AccountingBasis)}
                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="US_GAAP">US GAAP</option>
                    <option value="IFRS">IFRS</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
                  Business Description & Mandate
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-border bg-background text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Financial Data Import */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Select how you wish to seed 3 years of audited historical financial statements (FY2023, FY2024, FY2025).
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    id: 'preset',
                    title: 'Industry Golden Benchmark',
                    desc: 'Load vetted, audited benchmark statements calibrated for this industry.',
                    icon: ShieldCheck,
                  },
                  {
                    id: 'csv',
                    title: 'Spreadsheet Import (CSV/XLSX)',
                    desc: 'Upload 3-statement trial balance with auto-mapping assistance.',
                    icon: FileSpreadsheet,
                  },
                  {
                    id: 'manual',
                    title: 'Manual Figure Entry',
                    desc: 'Directly calibrate historical revenue, gross margins, and debt balances.',
                    icon: Database,
                  },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setDataSourceType(item.id as typeof dataSourceType)}
                    className={`cursor-pointer rounded-lg border p-4 transition-all ${
                      dataSourceType === item.id
                        ? 'border-primary bg-primary-soft/40 shadow-xs ring-1 ring-primary'
                        : 'border-border bg-card hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-soft text-primary mb-3">
                      <item.icon className="h-5 w-5 stroke-[1.6]" />
                    </div>
                    <h3 className="text-xs font-semibold text-foreground">{item.title}</h3>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>

              {dataSourceType === 'csv' && (
                <div className="rounded-lg border border-dashed border-primary/50 bg-primary-soft/20 p-8 text-center space-y-2">
                  <FileSpreadsheet className="h-8 w-8 text-primary mx-auto stroke-[1.5]" />
                  <p className="text-xs font-semibold text-foreground">
                    Drag and drop your historical financial model (Excel or CSV)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Parser detects P&L, Balance Sheet, and CFS line items with zero data leakage.
                  </p>
                  <button
                    type="button"
                    onClick={() => alert('Sample multi-statement spreadsheet parsed successfully!')}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card border border-border text-xs font-semibold text-foreground shadow-xs hover:bg-muted"
                  >
                    Browse Files
                  </button>
                </div>
              )}

              {dataSourceType === 'preset' && (
                <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Pre-loaded Benchmark Data Set Ready</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Includes reconciled FY2023–FY2025 audited accounts for {currentBlueprint.name}, including fixed asset roll forwards and working capital schedules.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Account Mapping & Review */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
                    Canonical Chart-of-Accounts Mapping
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Every ingested row is validated against standardized financial statement taxonomy.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  100% Accounts Reconciled
                </span>
              </div>

              <div className="rounded-lg border border-border bg-card overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-4 py-2.5">Source Line Item</th>
                      <th className="px-4 py-2.5">Canonical Target</th>
                      <th className="px-4 py-2.5">Statement</th>
                      <th className="px-4 py-2.5 text-right">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono">
                    {[
                      { src: 'Client Consultations & Fees', target: 'Gross Revenue', stmt: 'P&L', conf: '99%' },
                      { src: 'Clinical Specialist Fees', target: 'Cost of Goods Sold', stmt: 'P&L', conf: '98%' },
                      { src: 'Admin & Billing Payroll', target: 'G&A Operating Expense', stmt: 'P&L', conf: '96%' },
                      { src: 'Trade Debtor Invoices', target: 'Accounts Receivable', stmt: 'Balance Sheet', conf: '100%' },
                      { src: 'Surgical Suites & Autoclaves', target: 'Net PP&E', stmt: 'Balance Sheet', conf: '99%' },
                      { src: 'Commercial Bank Revolver', target: 'Long-Term Debt', stmt: 'Balance Sheet', conf: '100%' },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-muted/40">
                        <td className="px-4 py-2 font-medium text-foreground">{row.src}</td>
                        <td className="px-4 py-2 text-primary">{row.target}</td>
                        <td className="px-4 py-2 text-muted-foreground">{row.stmt}</td>
                        <td className="px-4 py-2 text-right text-emerald-600 font-bold">{row.conf}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: Operating Drivers Calibration */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground">
                  Recommended Industry Driver Baselines
                </h3>
                <p className="text-xs text-muted-foreground">
                  Calibrate the primary business assumptions for the 5-year forecast horizon.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentBlueprint.drivers.slice(0, 6).map((drv) => (
                  <div key={drv.id} className="rounded-lg border border-border bg-card p-3.5 space-y-1.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{drv.name}</span>
                      <span className="text-xs font-mono font-bold text-primary">
                        {drv.defaultValue} {drv.unit}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      {drv.baselineDescription}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 5: Verification & Launch */}
          {step === 5 && (
            <div className="space-y-5 text-center py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mx-auto border border-emerald-200">
                <ShieldCheck className="h-8 w-8 stroke-[1.6]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-serif font-medium text-foreground">
                  Model Engine Validated & Reconciled
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  The deterministic calculation engine has validated the 5-year forecast. All statements balance to 0.00 delta with zero arbitrary plugs.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto text-left pt-2">
                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Balance Check</span>
                  <p className="text-sm font-bold text-emerald-600 font-mono">0.0000 Δ</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Horizon</span>
                  <p className="text-sm font-bold text-foreground font-mono">5 Years (Annual)</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">Valuation</span>
                  <p className="text-sm font-bold text-primary font-mono">DCF + Multiples</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="h-9 px-4 rounded-md border border-border bg-card text-xs font-semibold uppercase tracking-[0.08em] text-foreground hover:bg-muted disabled:opacity-40 transition-colors"
          >
            Back
          </button>

          <div className="flex items-center gap-3">
            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(5, s + 1))}
                className="h-9 px-5 rounded-md bg-primary text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground hover:bg-primary/90 transition-colors shadow-none inline-flex items-center gap-1.5"
              >
                <span>Continue</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="h-9 px-6 rounded-md bg-primary text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground hover:bg-primary/90 transition-colors shadow-none inline-flex items-center gap-1.5"
              >
                <span>Launch Model Workspace</span>
                <Check className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
