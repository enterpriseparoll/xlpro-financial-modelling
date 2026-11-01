import type { GuidedValuation } from '../hooks/useGuidedValuation';
import { formatImpliedSharePrice, formatMillions } from './formatValuation';

/** Always-visible summary that updates as assumptions change. */
export function LiveResultPanel({ g }: { g: GuidedValuation }) {
  const { valuation, activeCompany, terminalMethod } = g;
  const sym = activeCompany.currencySymbol;
  const invalid = valuation.dcfStatus === 'invalid';
  const warnings = valuation.dcfChecks.filter((c) => c.status !== 'pass').length;

  return (
    <aside aria-live="polite" className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-xs xl:sticky xl:top-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Live result</p>
      {invalid ? (
        <p className="text-sm text-amber-900">No value yet — {valuation.dcfErrors[0]}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start sm:gap-x-8 xl:grid-cols-1">
          <div>
            <p className="text-xs text-muted-foreground">Value per share</p>
            <p className="font-mono text-2xl font-bold text-primary">{formatImpliedSharePrice(sym, valuation)}</p>
          </div>
          <dl className="grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2 xl:grid-cols-1">
            <div className="flex justify-between"><dt className="text-muted-foreground">Value for shareholders</dt><dd className="font-mono font-semibold">{formatMillions(sym, valuation.impliedEquityValue)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Business value (EV)</dt><dd className="font-mono">{formatMillions(sym, valuation.enterpriseValue)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Required return</dt><dd className="font-mono">{valuation.waccInputs.wacc.toFixed(2)}%</dd></div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{terminalMethod === 'gordon_growth' ? 'Long-term growth' : 'Exit multiple'}</dt>
              <dd className="font-mono">{terminalMethod === 'gordon_growth' ? `${valuation.terminalGrowthRatePct.toFixed(2)}%` : `${valuation.exitMultipleEVtoEBITDA.toFixed(1)}x`}</dd>
            </div>
          </dl>
          <p className={`w-fit rounded px-2 py-1 text-xs sm:col-span-2 xl:col-span-1 ${warnings ? 'bg-amber-50 text-amber-900' : 'bg-emerald-50 text-emerald-800'}`}>
            {warnings ? `${warnings} item${warnings > 1 ? 's' : ''} to review` : 'All checks pass'}
          </p>
        </div>
      )}
    </aside>
  );
}
