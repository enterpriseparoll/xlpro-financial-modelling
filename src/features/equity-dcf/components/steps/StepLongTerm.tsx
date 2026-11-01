import type { GuidedValuation } from '../../hooks/useGuidedValuation';
import { AssumptionField } from '../AssumptionField';
import { ChoiceToggle } from '../ChoiceToggle';

export function StepLongTerm({ g }: { g: GuidedValuation }) {
  const { assumptions, updateValuationAssumptions, effective, noteFor, terminalMethod, valuation } = g;
  const share = valuation.terminalShareOfEv;
  const lastYear = valuation.fcffSchedule.at(-1)?.period.periodLabel ?? 'the final forecast year';

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        The business keeps going after {lastYear}. Choose how to value everything beyond the forecast.
      </p>

      <ChoiceToggle
        legend="Value after the forecast using"
        value={terminalMethod}
        onChange={(v) => updateValuationAssumptions({ terminalValueMethod: v === 'gordon_growth' ? undefined : v })}
        options={[
          { value: 'gordon_growth', label: 'Steady growth forever', hint: 'Perpetuity growth (Gordon) — the standard choice' },
          { value: 'exit_multiple', label: 'A sale price', hint: 'Exit multiple of final-year EBITDA' },
        ]}
      />

      <div className="max-w-md">
        {terminalMethod === 'gordon_growth' ? (
          <AssumptionField field="terminalGrowthRate" value={assumptions.terminalGrowthRate} effective={effective.terminalGrowthRate}
            note={noteFor('terminalGrowthRate')?.message} onChange={(v) => updateValuationAssumptions({ terminalGrowthRate: v })} />
        ) : (
          <AssumptionField field="exitMultiple" value={assumptions.exitMultiple} effective={effective.exitMultiple}
            note={noteFor('exitMultiple')?.message} onChange={(v) => updateValuationAssumptions({ exitMultiple: v })} />
        )}
      </div>

      {terminalMethod === 'gordon_growth' && Number.isFinite(valuation.waccInputs.wacc) && (
        <p className="text-xs text-muted-foreground">Must stay below the required return ({valuation.waccInputs.wacc.toFixed(2)}%), otherwise the value has no limit.</p>
      )}

      {Number.isFinite(share) && (
        <section aria-label="Reliance on long-term value" className="space-y-2 rounded-lg border border-border p-4">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-medium text-foreground">Share of today’s value from after the forecast</span>
            <span className="font-mono font-bold">{(share * 100).toFixed(0)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
            <div className={`h-full ${share > 0.75 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${Math.min(100, Math.max(0, share * 100))}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">
            {share > 0.75
              ? 'Most of the value rests on this one long-term assumption — test it on the Result step.'
              : 'A healthy share of value comes from the forecast years themselves.'}
          </p>
        </section>
      )}
    </div>
  );
}
