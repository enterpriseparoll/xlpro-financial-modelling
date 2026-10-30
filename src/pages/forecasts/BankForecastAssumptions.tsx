import { growthFields, driverFields, type ForecastSettings, type GrowthKey, type BankDrivers, type BankForecastMode } from '@/engine/bankForecast';

const modes: { id: BankForecastMode; name: string; description: string }[] = [
  { id: 'constant', name: 'Constant Growth', description: 'One rate for all five years' },
  { id: 'yearly', name: 'Year-by-Year', description: 'Set each year independently' },
  { id: 'drivers', name: 'Driver-Based', description: 'Loan, deposit, yield and credit assumptions' },
];
export function BankForecastAssumptions({ settings, years, onChange, onReset, disabledDrivers }: {
  settings: ForecastSettings; years: number[]; onChange: (value: ForecastSettings) => void; onReset: () => void; disabledDrivers: boolean;
}) {
  const input = (value: number, label: string, set: (n: number) => void) => <div className="flex items-center gap-1"><input aria-label={label} type="number" step="0.1" value={value} onChange={e => { if (e.target.value !== '') set(Number(e.target.value)); }} className="w-24 rounded-md border border-border bg-background px-2 py-2 text-right text-sm tabular-nums"/><span className="text-xs text-muted-foreground">%</span></div>;
  return <section className="rounded-xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">2. Forecast assumptions</h2><p className="mt-1 text-sm text-muted-foreground">Choose how to build the five-year forecast. Changes recalculate immediately.</p></div><button type="button" onClick={onReset} className="text-sm text-primary hover:underline">Reset assumptions</button></div>
    <div role="group" aria-label="Forecast method" className="mt-5 grid gap-2 sm:grid-cols-3">{modes.map(mode => <button type="button" key={mode.id} aria-pressed={settings.mode === mode.id} onClick={() => onChange({ ...settings, mode: mode.id })} className={`rounded-lg border p-3 text-left transition-colors ${settings.mode === mode.id ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-border hover:bg-muted/40'}`}><span className="block text-sm font-semibold">{mode.name}</span><span className="mt-1 block text-xs text-muted-foreground">{mode.description}</span></button>)}</div>
    {settings.mode === 'drivers' && disabledDrivers && <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Driver-based forecasting needs verified loans and customer deposits. Import the balance sheet in Step 2. No substitute values will be used.</p>}
    <div className="mt-5 overflow-x-auto">
      {settings.mode === 'constant' ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{growthFields.map(f => <label key={f.key} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"><span className="text-sm">{f.label}</span>{input(settings.constant[f.key],f.label,n=>onChange({ ...settings,constant:{...settings.constant,[f.key]:n} }))}</label>)}</div> :
      <table className="w-full min-w-[850px] text-sm"><thead className="bg-muted/50"><tr><th className="px-3 py-3 text-left">Assumption</th>{years.map(year=><th key={year} className="px-3 py-3 text-right">FY{year}E</th>)}</tr></thead><tbody>{settings.mode === 'yearly' ? growthFields.map(f => <tr key={f.key} className="border-t border-border"><th className="px-3 py-3 text-left font-medium">{f.label}</th>{years.map((year,i)=><td key={year} className="px-2 py-2">{input(settings.yearly[i][f.key],f.label+' '+year,n=>onChange({...settings,yearly:settings.yearly.map((row,j)=>i===j?{...row,[f.key]:n}:row)}))}</td>)}</tr>) : driverFields.map(f=><tr key={f.key} className="border-t border-border"><th className="px-3 py-3 text-left font-medium">{f.label}</th>{years.map((year,i)=><td key={year} className="px-2 py-2">{input(settings.drivers[i][f.key],f.label+' '+year,n=>onChange({...settings,drivers:settings.drivers.map((row,j)=>i===j?{...row,[f.key]:n}:row)}))}</td>)}</tr>)}</tbody></table>}
    </div>
  </section>;
}
