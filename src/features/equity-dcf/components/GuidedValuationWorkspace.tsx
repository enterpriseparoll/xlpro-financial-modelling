import { AlertCircle, Check, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { GUIDED_STEPS, useGuidedValuation } from '../hooks/useGuidedValuation';
import { LiveResultPanel } from './LiveResultPanel';
import { ValuationSaveBar } from './ValuationSaveBar';
import { StepCompanyDate } from './steps/StepCompanyDate';
import { StepForecast } from './steps/StepForecast';
import { StepLongTerm } from './steps/StepLongTerm';
import { StepRequiredReturn } from './steps/StepRequiredReturn';
import { StepResult } from './steps/StepResult';

/** Five-step guided DCF for non-specialists. Results recalculate live; there is no "run" button. */
export function GuidedValuationWorkspace({ onOpenAnalystView }: { onOpenAnalystView?: () => void }) {
  const g = useGuidedValuation();
  const current = GUIDED_STEPS[g.stepIndex];
  const isLast = g.stepIndex === GUIDED_STEPS.length - 1;
  const hasOverrides = Object.keys(g.assumptions).length > 0;

  return (
    <div className="space-y-4">
      <ValuationSaveBar g={g} />
      <nav aria-label="Valuation steps" className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <ol className="flex flex-1 gap-2 overflow-x-auto pb-1">
          {GUIDED_STEPS.map((s, i) => {
            const active = s.id === g.step;
            const attention = g.stepStatus[s.id] === 'attention';
            return (
              <li key={s.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => g.goTo(s.id)}
                  aria-current={active ? 'step' : undefined}
                  className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                    active ? 'border-primary bg-primary-soft/40 text-primary' : 'border-border bg-card text-foreground hover:bg-muted/40'
                  }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {i + 1}
                  </span>
                  <span className="font-semibold">{s.title}</span>
                  {attention ? (
                    <AlertCircle className="ml-auto h-3.5 w-3.5 text-amber-600" aria-label="needs review" />
                  ) : (
                    <Check className="ml-auto h-3.5 w-3.5 text-emerald-600" aria-label="ok" />
                  )}
                </button>
              </li>
            );
          })}
        </ol>
        {hasOverrides && (
          <button type="button" onClick={g.resetValuationAssumptions} className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
            <RotateCcw className="h-3 w-3" /> Reset valuation assumptions
          </button>
        )}
      </nav>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="xl:order-2">
          <LiveResultPanel g={g} />
        </div>
        <section aria-labelledby="guided-step-title" className="min-w-0 space-y-5 rounded-lg border border-border bg-card p-5 shadow-xs xl:order-1">
          <header>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Step {g.stepIndex + 1} of {GUIDED_STEPS.length}</p>
            <h2 id="guided-step-title" className="text-lg font-semibold text-foreground">{current.question}</h2>
          </header>

          {g.step === 'company' && <StepCompanyDate g={g} />}
          {g.step === 'forecast' && <StepForecast g={g} />}
          {g.step === 'return' && <StepRequiredReturn g={g} />}
          {g.step === 'longterm' && <StepLongTerm g={g} />}
          {g.step === 'result' && <StepResult g={g} onOpenAnalystView={onOpenAnalystView} />}

          <footer className="flex items-center justify-between border-t border-border pt-4">
            <button type="button" onClick={g.back} disabled={g.stepIndex === 0}
              className="flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs font-semibold disabled:opacity-40">
              <ChevronLeft className="h-3.5 w-3.5" /> Back
            </button>
            {!isLast && (
              <button type="button" onClick={g.next} className="flex items-center gap-1 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
                Next: {GUIDED_STEPS[g.stepIndex + 1].title} <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </footer>
        </section>
      </div>
    </div>
  );
}
