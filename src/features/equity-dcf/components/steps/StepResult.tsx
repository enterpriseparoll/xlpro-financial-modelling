import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import type { GuidedValuation } from '../../hooks/useGuidedValuation';
import { formatImpliedSharePrice, formatMillions } from '../formatValuation';
import { SensitivityHeatmap } from '../SensitivityHeatmap';
import { ValuationInvalidNotice } from '../ValuationInvalidNotice';
import { ValueBridge } from '../ValueBridge';

const ICON = { pass: CheckCircle2, warning: AlertTriangle, fail: XCircle } as const;
const TONE = { pass: 'text-emerald-700', warning: 'text-amber-700', fail: 'text-rose-700' } as const;

export function StepResult({ g, onOpenAnalystView }: { g: GuidedValuation; onOpenAnalystView?: () => void }) {
  const { valuation, activeCompany, scenarios, activeScenarioId } = g;
  const sym = activeCompany.currencySymbol;
  const scenarioName = scenarios.find((s) => s.id === activeScenarioId)?.name ?? activeScenarioId;

  if (valuation.dcfStatus === 'invalid') return <ValuationInvalidNotice valuation={valuation} />;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-primary/30 bg-primary-soft/30 p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Value per share</p>
          <p className="mt-1 font-mono text-2xl font-bold text-primary">{formatImpliedSharePrice(sym, valuation)}</p>
          {valuation.upsideDownsidePct !== undefined && valuation.currentSharePrice !== undefined && (
            <p className={`text-xs ${valuation.upsideDownsidePct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {valuation.upsideDownsidePct >= 0 ? '+' : ''}{valuation.upsideDownsidePct.toFixed(1)}% vs entered price {sym}{valuation.currentSharePrice.toFixed(2)}
            </p>
          )}
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Value for shareholders</p>
          <p className="mt-1 font-mono text-2xl font-bold">{formatMillions(sym, valuation.impliedEquityValue)}</p>
        </div>
        <div className="rounded-lg border border-border p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Business value (EV)</p>
          <p className="mt-1 font-mono text-2xl font-bold">{formatMillions(sym, valuation.enterpriseValue)}</p>
        </div>
      </section>
      <p className="text-[11px] text-muted-foreground">
        {scenarioName} scenario · Estimate based on forecast assumptions, not an investment recommendation or audited value.
      </p>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">How we get there</h3>
        <ValueBridge valuation={valuation} sym={sym} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">How sensitive is the answer?</h3>
        <SensitivityHeatmap valuation={valuation} sym={sym} />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Checks</h3>
        <ul className="space-y-1.5">
          {valuation.dcfChecks.map((c) => {
            const Icon = ICON[c.status];
            return (
              <li key={c.id} className="flex gap-2 text-xs">
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${TONE[c.status]}`} aria-label={c.status} />
                <span><span className="font-semibold text-foreground">{c.title}.</span> <span className="text-muted-foreground">{c.detail}</span></span>
              </li>
            );
          })}
        </ul>
      </section>

      {onOpenAnalystView && (
        <button type="button" onClick={onOpenAnalystView} className="text-xs font-semibold text-primary hover:underline">
          See the full analyst detail (cash-flow schedule, comparables, tornado) →
        </button>
      )}
    </div>
  );
}
