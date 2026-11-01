import type { GuidedValuation } from '../../hooks/useGuidedValuation';
import { AssumptionField } from '../AssumptionField';
import { ChoiceToggle } from '../ChoiceToggle';

const pct = (v: number) => (Number.isFinite(v) ? `${v.toFixed(2)}%` : '—');

export function StepRequiredReturn({ g }: { g: GuidedValuation }) {
  const { assumptions, updateValuationAssumptions, effective, noteFor, waccMode, valuation } = g;
  const w = valuation.waccInputs;
  const field = (k: 'riskFreeRate' | 'equityBeta' | 'equityRiskPremium' | 'preTaxCostOfDebt' | 'targetDebtRatio' | 'directWacc') => (
    <AssumptionField key={k} field={k} value={assumptions[k]} effective={effective[k]} note={noteFor(k)?.message}
      onChange={(v) => updateValuationAssumptions({ [k]: v })} />
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Future cash is worth less than cash today. The <strong className="text-foreground">required return</strong> (WACC) is the yearly
        return investors need to fund this business, and it is used to convert future cash into today’s money.
      </p>

      <ChoiceToggle
        legend="How do you want to set it?"
        value={waccMode}
        onChange={(v) => updateValuationAssumptions({ waccMode: v === 'build_up' ? undefined : v })}
        options={[
          { value: 'build_up', label: 'Build it up', hint: 'From market rates, risk and funding mix (CAPM)' },
          { value: 'direct', label: 'Enter one rate', hint: 'If you already have an approved discount rate' },
        ]}
      />

      {waccMode === 'direct' ? (
        <div className="max-w-md">{field('directWacc')}</div>
      ) : (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            {field('riskFreeRate')}
            {field('equityBeta')}
            {field('equityRiskPremium')}
            {field('preTaxCostOfDebt')}
            {field('targetDebtRatio')}
          </div>
          <section aria-label="How the required return is built" className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <dl className="grid gap-2 font-mono sm:grid-cols-2">
              <div className="flex justify-between gap-2"><dt className="font-sans text-muted-foreground">Return shareholders need</dt><dd>{pct(w.costOfEquity)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="font-sans text-muted-foreground">Borrowing cost after tax ({pct(w.taxRate)} tax)</dt><dd>{pct(w.afterTaxCostOfDebt)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="font-sans text-muted-foreground">Funding mix (equity / debt)</dt><dd>{w.targetEquityRatio.toFixed(0)}% / {w.targetDebtRatio.toFixed(0)}%</dd></div>
              <div className="flex justify-between gap-2 font-bold"><dt className="font-sans text-foreground">Required return (WACC)</dt><dd className="text-primary">{pct(w.wacc)}</dd></div>
            </dl>
          </section>
        </>
      )}
      <p className="text-[11px] text-muted-foreground">Typical ranges shown in review notes are illustrative rules of thumb, not market data.</p>
    </div>
  );
}
