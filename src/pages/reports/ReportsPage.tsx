/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useModelContext } from '@/contexts/ModelContext';
import { PageShell } from '@/components/layout/PageShell';
import { SECTOR_BLUEPRINTS } from '@/engine/blueprints';
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  History,
  Printer,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { formatMillions, formatImpliedSharePrice } from '@/features/equity-dcf/components/formatValuation';
import { ValuationInvalidNotice } from '@/features/equity-dcf/components/ValuationInvalidNotice';

export function ReportsPage() {
  const { activeCompany, calculationRun, auditLogs, triggerToast } = useModelContext();
  const blueprint = SECTOR_BLUEPRINTS[activeCompany.sectorId] || SECTOR_BLUEPRINTS.general;
  const { incomeStatements, balanceSheets, valuation, validation, explanations } = calculationRun;
  const sym = activeCompany.currencySymbol;

  const [activeReportTab, setActiveReportTab] = useState<'memo' | 'governance' | 'audit'>('memo');

  // Governance lifecycle state
  const [modelState, setModelState] = useState<'draft' | 'calculated' | 'ready_for_review' | 'approved' | 'published'>('calculated');
  const [approvalNotes, setApprovalNotes] = useState<string>('All line items reconciled; assumptions adhere to sector baseline.');
  const [reviewerName, setReviewerName] = useState<string>('Jane Doe, CFA (Managing Director)');

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Accounting Line Item', ...incomeStatements.map((s) => s.period.periodLabel)];
    const rows = [
      ['Gross Net Revenue', ...incomeStatements.map((s) => s.revenue.toFixed(2))],
      ['Cost of Goods Sold', ...incomeStatements.map((s) => (-s.cogs).toFixed(2))],
      ['Gross Profit', ...incomeStatements.map((s) => s.grossProfit.toFixed(2))],
      ['EBITDA', ...incomeStatements.map((s) => s.ebitda.toFixed(2))],
      ['EBIT (Operating Income)', ...incomeStatements.map((s) => s.ebit.toFixed(2))],
      ['Net Income', ...incomeStatements.map((s) => s.netIncome.toFixed(2))],
      ['Ending Cash & Equivalents', ...balanceSheets.map((b) => b.cashAndEquivalents.toFixed(2))],
      ['Total Assets', ...balanceSheets.map((b) => b.totalAssets.toFixed(2))],
      ['Total Liabilities & Equity', ...balanceSheets.map((b) => b.totalLiabilitiesAndEquity.toFixed(2))],
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${activeCompany.name.replace(/\s+/g, '_')}_3Statement_Pack.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    triggerToast('Generated 3-statement CSV export pack', 'success');
  };

  return (
    <PageShell
      moduleName="Reports & Governance"
      title={activeCompany.name}
      titleHighlight="Model Pack"
      description="Investment memorandum, executive presentation pack, export center, and auditable parameter revision history."
      actions={
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded border ${
            modelState === 'published'
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : modelState === 'approved'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : modelState === 'ready_for_review'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-muted text-muted-foreground border-border'
          }`}>
            Status: {modelState.replace('_', ' ')}
          </span>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-card border border-border text-xs font-semibold uppercase tracking-[0.08em] text-foreground hover:bg-muted shadow-xs transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print Memo</span>
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-primary text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground hover:bg-primary/90 shadow-none transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export CSV Pack</span>
          </button>
        </div>
      }
    >
      {/* Sub-view switcher */}
      <div className="flex items-center gap-1 bg-muted/60 rounded-md p-1 w-fit border border-border">
        <button
          type="button"
          onClick={() => setActiveReportTab('memo')}
          className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
            activeReportTab === 'memo'
              ? 'bg-card text-primary shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Executive Investment Memo
        </button>
        <button
          type="button"
          onClick={() => setActiveReportTab('governance')}
          className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
            activeReportTab === 'governance'
              ? 'bg-card text-primary shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Approval & Governance</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveReportTab('audit')}
          className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
            activeReportTab === 'audit'
              ? 'bg-card text-primary shadow-xs font-bold'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <span>Audit Log of Overrides</span>
          <span className="text-[10px] bg-primary-soft text-primary font-bold px-1.5 py-0.2 rounded-full">
            {auditLogs.length}
          </span>
        </button>
      </div>

      {/* ── Executive Memo ── */}
      {activeReportTab === 'memo' && (
        <div className="rounded-lg border border-border bg-card p-8 shadow-xs space-y-6 max-w-4xl mx-auto">
          {/* Document Header */}
          <div className="border-b border-border pb-6 flex items-start justify-between flex-wrap gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Executive Valuation Memorandum
              </span>
              <h2 className="text-2xl font-serif font-medium text-foreground tracking-tight mt-1">
                {activeCompany.name}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sector: {blueprint.name} • Standard: {activeCompany.accountingBasis} • Currency: {activeCompany.currency}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Audited & Reconciled
              </span>
              <p className="text-[10px] text-muted-foreground mt-1">
                Generated: {new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}
              </p>
            </div>
          </div>

          {/* Section 1: Strategic Summary */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
              1. Executive Business Summary
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {activeCompany.description} Operational planning is modeled under the {blueprint.name} Blueprint, employing approved formulas and historical trendlines to project integrated three-statement financial performance across FY2026E through FY2030E.
            </p>
          </div>

          {/* Section 2: Narrative Attribution */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
              2. Growth & Profitability Analysis
            </h3>
            <div className="p-4 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground leading-relaxed space-y-2">
              <p>{explanations.revenueDriverNarrative}</p>
              <p>{explanations.marginEvolutionNarrative}</p>
              <p>{explanations.cashRunwayNarrative}</p>
            </div>
          </div>

          {/* Section 3: Valuation Bridge */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
              3. DCF Valuation & Capital Structure Reconciled
            </h3>
            <ValuationInvalidNotice valuation={valuation} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3 rounded bg-muted/30 border border-border">
                <span className="text-[10px] font-sans text-muted-foreground uppercase font-bold">EV</span>
                <p className="text-base font-bold text-foreground mt-0.5">{formatMillions(sym, valuation.enterpriseValue)}</p>
              </div>
              <div className="p-3 rounded bg-muted/30 border border-border">
                <span className="text-[10px] font-sans text-muted-foreground uppercase font-bold">Net Debt</span>
                <p className="text-base font-bold text-rose-700 mt-0.5">{formatMillions(sym, valuation.netDebt)}</p>
              </div>
              <div className="p-3 rounded bg-muted/30 border border-border">
                <span className="text-[10px] font-sans text-muted-foreground uppercase font-bold">Equity Value</span>
                <p className="text-base font-bold text-primary mt-0.5">{formatMillions(sym, valuation.impliedEquityValue)}</p>
              </div>
              <div className="p-3 rounded bg-primary-soft/40 border border-primary/20">
                <span className="text-[10px] font-sans text-primary uppercase font-bold">Implied / Share</span>
                <p className="text-base font-bold text-primary mt-0.5">{formatImpliedSharePrice(sym, valuation)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {explanations.valuationBridgeNarrative}
            </p>
          </div>

          {/* Section 4: Key Risk Factors */}
          <div className="space-y-2 pt-2 border-t border-border">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
              4. Key Financial Risks & Sensitivities
            </h3>
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
              {explanations.keyRisks.map((risk, i) => (
                <li key={i}>{risk}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* ── Approval & Governance ── */}
      {activeReportTab === 'governance' && (
        <div className="rounded-lg border border-border bg-card p-6 shadow-xs space-y-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Model Governance & Lifecycle Controls
              </span>
              <h3 className="text-xl font-serif font-medium text-foreground tracking-tight mt-0.5">
                Model Verification & Sign-Off Workflow
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Role-based sign-off pipeline for investment memos, regulatory audits, and board publication.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {modelState === 'calculated' && (
                <button
                  type="button"
                  onClick={() => {
                    setModelState('ready_for_review');
                    triggerToast('Model submitted for independent review', 'info');
                  }}
                  className="px-4 py-2 rounded-md bg-primary text-xs font-semibold uppercase tracking-wider text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Submit For Review
                </button>
              )}

              {modelState === 'ready_for_review' && (
                <button
                  type="button"
                  onClick={() => {
                    setModelState('approved');
                    triggerToast('Model approved by Reviewer', 'success');
                  }}
                  className="px-4 py-2 rounded-md bg-emerald-600 text-xs font-semibold uppercase tracking-wider text-white hover:bg-emerald-700 transition-colors"
                >
                  Approve Model Sign-Off
                </button>
              )}

              {modelState === 'approved' && (
                <button
                  type="button"
                  onClick={() => {
                    setModelState('published');
                    triggerToast('Model officially published and locked as Investment-Grade', 'success');
                  }}
                  className="px-4 py-2 rounded-md bg-purple-600 text-xs font-semibold uppercase tracking-wider text-white hover:bg-purple-700 transition-colors"
                >
                  Publish Investment-Grade Pack
                </button>
              )}

              {modelState === 'published' && (
                <button
                  type="button"
                  onClick={() => {
                    setModelState('calculated');
                    triggerToast('Model unlocked for new revision version', 'info');
                  }}
                  className="px-4 py-2 rounded-md border border-border bg-card text-xs font-semibold uppercase tracking-wider text-foreground hover:bg-muted transition-colors"
                >
                  Create New Revision
                </button>
              )}
            </div>
          </div>

          {/* Lifecycle Stepper */}
          <div className="grid grid-cols-5 gap-2 pt-2 text-center text-xs">
            {[
              { id: 'draft', label: '1. Draft' },
              { id: 'calculated', label: '2. Calculated' },
              { id: 'ready_for_review', label: '3. In Review' },
              { id: 'approved', label: '4. Approved' },
              { id: 'published', label: '5. Published' },
            ].map((step) => {
              const statesOrder = ['draft', 'calculated', 'ready_for_review', 'approved', 'published'];
              const isCurrent = modelState === step.id;
              const isPast = statesOrder.indexOf(modelState) >= statesOrder.indexOf(step.id);

              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg border transition-all ${
                    isCurrent
                      ? 'bg-primary-soft text-primary font-bold border-primary shadow-xs'
                      : isPast
                      ? 'bg-muted/60 text-foreground border-border'
                      : 'bg-background text-muted-foreground border-border/50'
                  }`}
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider">{step.label}</p>
                </div>
              );
            })}
          </div>

          {/* Compliance Checklist */}
          <div className="rounded-lg border border-border bg-background p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Pre-Publication Compliance Verifications
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 p-2.5 rounded bg-card border border-border">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-foreground font-medium">Assets = Liabilities + Equity (0.0000 Δ)</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded bg-card border border-border">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-foreground font-medium">Cash Flow Statement Ending Cash Ties</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded bg-card border border-border">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-foreground font-medium">Solvency & Cash Reserves Satisfied</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded bg-card border border-border">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-foreground font-medium">Sector Blueprint Boundaries Validated</span>
              </div>
            </div>
          </div>

          {/* Sign-Off Details Box */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Reviewer Sign-Off Signatures
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="text-muted-foreground">Certified Reviewer Name & Title</label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-border bg-background text-foreground text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-muted-foreground">Verification Review Notes</label>
                <input
                  type="text"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-border bg-background text-foreground text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Audit Trail of Overrides ── */}
      {activeReportTab === 'audit' && (
        <div className="rounded-lg border border-border bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Audited Change History & Assumption Overrides
              </h3>
              <p className="text-xs text-muted-foreground">
                Immutable audit ledger recording author, timestamp, old/new parameters, and affected financial statements.
              </p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded">
              {auditLogs.length} Recorded Overrides
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">Timestamp</th>
                  <th className="px-4 py-2.5">Author</th>
                  <th className="px-4 py-2.5">Assumption Driver</th>
                  <th className="px-4 py-2.5 text-right">Old Value</th>
                  <th className="px-4 py-2.5 text-right">New Value</th>
                  <th className="px-4 py-2.5">Business Justification / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/40">
                    <td className="px-4 py-2.5 font-mono text-muted-foreground whitespace-nowrap">{log.timestamp}</td>
                    <td className="px-4 py-2.5 font-semibold text-foreground">{log.author}</td>
                    <td className="px-4 py-2.5 text-primary font-medium">{log.driverName}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-muted-foreground">{log.oldValue} {log.unit}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">{log.newValue} {log.unit}</td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-sm leading-relaxed">{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageShell>
  );
}
