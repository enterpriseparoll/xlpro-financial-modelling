import type { ForecastRow } from '@/engine/bankForecast';
const format=(value:number)=>new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
export function BankValuationForecastBridge({name,rows,source}:{name:string;rows:ForecastRow[];source:string}) {
  return <section className="rounded-xl border border-border bg-card p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Selected forecast: {name}</h2><p className="mt-1 text-sm text-muted-foreground">Source: {source} · GHS millions · Estimates</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Five-year forecast</span></div>
    <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="bg-muted/50"><tr><th className="px-3 py-3 text-left">Metric</th>{rows.map(r=><th key={r.year} className="px-3 py-3 text-right">FY{r.year}E</th>)}</tr></thead><tbody>{([['Net interest income',(r:ForecastRow)=>r.interest],['Operating income',(r:ForecastRow)=>r.revenue],['Profit before tax',(r:ForecastRow)=>r.beforeTax],['Net profit',(r:ForecastRow)=>r.afterTax]] as const).map(([label,get])=><tr key={label} className="border-t border-border"><th className="px-3 py-3 text-left font-medium">{label}</th>{rows.map(r=><td key={r.year} className="px-3 py-3 text-right tabular-nums">{format(get(r))}</td>)}</tr>)}</tbody></table></div>
    <p className="mt-3 text-xs text-muted-foreground">These forecasts provide earnings context. Residual-income valuation requires projected book equity and capital distributions; until available, the existing sustainable-ROE model remains a separately identified steady-state estimate.</p>
  </section>;
}
