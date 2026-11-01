import type { GuidedValuation } from '../../hooks/useGuidedValuation';
import { ChoiceToggle } from '../ChoiceToggle';

const fmt = (v: number | undefined) => (v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(1));

/** Shows the single model forecast feeding the DCF; edits go through the shared driver drawer. */
export function StepForecast({ g }: { g: GuidedValuation }) {
  const { calculationRun, valuation, scenarios, activeScenarioId, setActiveScenarioId, blueprint, openDriverDrawer, driverOverrides, activeCompany } = g;
  const actuals = calculationRun.incomeStatements.filter((r) => r.period.type === 'historical').slice(-2);
  const forecasts = calculationRun.incomeStatements.filter((r) => r.period.type === 'forecast');
  const fcffByYear = new Map(valuation.fcffSchedule.map((r) => [r.period.year, r]));
  const columns = [...actuals, ...forecasts];

  const rows: { label: string; value: (year: number, i: number) => number | undefined; strong?: boolean }[] = [
    { label: 'Revenue', value: (_, i) => columns[i].revenue },
    { label: 'Operating profit (EBIT)', value: (_, i) => columns[i].ebit },
    { label: 'Tax on operating profit', value: (y) => fcffByYear.get(y)?.taxOnEbit },
    { label: '+ Depreciation & amortisation', value: (_, i) => columns[i].depreciationAmortization },
    { label: '− Investment in assets (CapEx)', value: (y) => fcffByYear.get(y)?.capex },
    { label: '− Increase in working capital', value: (y) => fcffByYear.get(y)?.deltaNWC },
    { label: '= Free cash flow', value: (y) => fcffByYear.get(y)?.fcff, strong: true },
  ];

  return (
    <div className="space-y-6">
      <ChoiceToggle
        legend="Which outlook are you valuing?"
        value={activeScenarioId}
        onChange={setActiveScenarioId}
        options={scenarios.map((s) => ({ value: s.id, label: s.name, hint: s.description }))}
      />

      <section className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">Cash the business is expected to generate ({activeCompany.currency} millions)</h3>
          <span className="text-[11px] text-muted-foreground">One forecast feeds every page — edit it in the Forecast step or below.</span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-xs">
            <thead className="bg-muted/60">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-semibold text-muted-foreground"> </th>
                {columns.map((c) => (
                  <th key={c.period.year} scope="col" className="px-3 py-2 text-right font-semibold">
                    <span className="block text-foreground">{c.period.periodLabel}</span>
                    <span className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] ${c.period.type === 'historical' ? 'bg-slate-200 text-slate-700' : 'bg-sky-100 text-sky-800'}`}>
                      {c.period.type === 'historical' ? 'Actual' : 'Estimate'}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {rows.map((row) => (
                <tr key={row.label} className={row.strong ? 'bg-primary-soft/30 font-bold' : ''}>
                  <th scope="row" className="px-3 py-2 text-left font-sans font-medium text-foreground">{row.label}</th>
                  {columns.map((c, i) => (
                    <td key={c.period.year} className="px-3 py-2 text-right">{fmt(row.value(c.period.year, i))}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-muted-foreground">Free cash flow is shown for forecast years only; actual years are context.</p>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">What drives the forecast</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {blueprint.drivers.filter((d) => !d.isAdvanced).slice(0, 8).map((d) => {
            const overridden = driverOverrides[d.id] !== undefined;
            const value = driverOverrides[d.id] ?? d.defaultValue;
            return (
              <li key={d.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{d.name}</p>
                  <p className="text-[11px] text-muted-foreground">{overridden ? 'Your assumption' : 'Scenario default'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-sky-800 dark:text-sky-300">{value}{d.unit === '%' ? '%' : d.unit === 'days' ? 'd' : ''}</span>
                  <button type="button" onClick={() => openDriverDrawer(d.id)} className="rounded border border-border px-2 py-1 text-xs font-semibold text-primary hover:bg-primary-soft/40">
                    Edit
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
