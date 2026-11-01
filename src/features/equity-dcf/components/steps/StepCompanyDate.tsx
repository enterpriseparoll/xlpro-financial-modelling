import { useEffect, useId, useState } from 'react';
import type { GuidedValuation } from '../../hooks/useGuidedValuation';
import { AssumptionField } from '../AssumptionField';
import { ChoiceToggle } from '../ChoiceToggle';
import { formatMillions } from '../formatValuation';

/** Company figure stored on the company record (shares, market price), not on the scenario. */
function CompanyFigureField({ label, help, value, unit, onCommit }: {
  label: string;
  help: string;
  value: number | undefined;
  unit: string;
  onCommit: (v: number | undefined) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(value ? String(value) : '');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setDraft(value ? String(value) : ''), [value]);
  const commit = () => {
    const t = draft.trim();
    if (t === '') { setError(null); return onCommit(undefined); }
    const n = Number(t);
    if (!Number.isFinite(n) || n <= 0) return setError('Enter a positive number, or leave blank if unknown.');
    setError(null);
    onCommit(n);
  };
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
      <div className={`flex items-center rounded-md border bg-card ${error ? 'border-rose-400' : 'border-border'}`}>
        <input id={id} inputMode="decimal" value={draft} placeholder="Not set" onChange={(e) => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()} aria-invalid={!!error}
          className="w-full bg-transparent px-3 py-2 font-mono text-sm text-sky-800 outline-none placeholder:text-muted-foreground dark:text-sky-300" />
        <span className="pr-3 text-sm text-muted-foreground">{unit}</span>
      </div>
      <p className="text-[11px] text-muted-foreground">{help}</p>
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
    </div>
  );
}

export function StepCompanyDate({ g }: { g: GuidedValuation }) {
  const { activeCompany, assumptions, updateValuationAssumptions, updateCompany, valuation, lastActual, firstForecast, effective } = g;
  const sym = activeCompany.currencySymbol;
  const bridgeKeys = ['leaseLiabilities', 'minorityInterest', 'preferredEquity', 'nonOperatingInvestments'] as const;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm sm:grid-cols-3">
        <div><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Company</p><p className="font-semibold">{activeCompany.name}</p></div>
        <div><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Currency & units</p><p className="font-semibold">{activeCompany.currency} millions</p></div>
        <div><p className="text-[11px] uppercase tracking-wider text-muted-foreground">Financial year ends</p><p className="font-semibold">{activeCompany.fiscalYearEnd} (month-day)</p></div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Valuation date</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="dcf-valuation-date" className="text-sm font-medium text-foreground">Value the business as of</label>
            <input id="dcf-valuation-date" type="date" value={assumptions.valuationDate ?? ''}
              onChange={(e) => updateValuationAssumptions({ valuationDate: e.target.value || undefined })}
              className="w-full rounded-md border border-border bg-card px-3 py-2 font-mono text-sm text-sky-800 dark:text-sky-300" />
            <p className="text-[11px] text-muted-foreground">
              {assumptions.valuationDate
                ? `Only the part of ${firstForecast?.periodLabel ?? 'the first forecast year'} after this date is counted (${Number.isFinite(valuation.firstPeriodFraction) ? `${(valuation.firstPeriodFraction * 100).toFixed(0)}% of the year` : 'date not usable'}).`
                : `Blank = start of ${firstForecast?.periodLabel ?? 'the first forecast year'}; the whole year is counted.`}
            </p>
          </div>
          <ChoiceToggle
            legend="When cash arrives during each year"
            value={assumptions.cashFlowTiming ?? 'mid_year'}
            onChange={(v) => updateValuationAssumptions({ cashFlowTiming: v === 'mid_year' ? undefined : v })}
            options={[
              { value: 'mid_year', label: 'Evenly through the year', hint: 'Mid-year convention (recommended)' },
              { value: 'end_of_year', label: 'At year end', hint: 'More conservative' },
            ]}
          />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Shares</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <CompanyFigureField label="Shares outstanding (diluted)" unit="million" help="Include options and convertibles likely to become shares. Needed for value per share."
            value={activeCompany.shareCount > 0 ? activeCompany.shareCount : undefined}
            onCommit={(v) => updateCompany({ ...activeCompany, shareCount: v ?? 0 })} />
          <CompanyFigureField label="Current share price (optional)" unit={sym} help="Used only to compare with the calculated value. Enter the date you observed it in your notes."
            value={activeCompany.currentSharePrice}
            onCommit={(v) => updateCompany({ ...activeCompany, currentSharePrice: v })} />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Other claims on the business</h3>
          <p className="text-xs text-muted-foreground">
            Cash ({formatMillions(sym, valuation.bridge?.cash)}) and debt ({formatMillions(sym, valuation.bridge?.debt)}) come from the
            {lastActual ? ` ${lastActual.periodLabel}` : ' latest'} balance sheet. Add these if they apply; blank items are flagged, not assumed.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {bridgeKeys.map((k) => (
            <AssumptionField key={k} field={k} value={assumptions[k]} effective={effective[k]} emptyLabel="Not provided" currencySymbol={sym}
              onChange={(v) => updateValuationAssumptions({ [k]: v })} />
          ))}
        </div>
      </section>
    </div>
  );
}
