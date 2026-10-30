import { useMemo, useState } from 'react';
import { Activity, ArrowRight, BarChart3, CheckCircle2, CircleAlert, Download, Gauge, Layers3, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { useModelContext } from '@/contexts/ModelContext';
import { SECTOR_BLUEPRINTS } from '@/engine/blueprints';
import { PageShell } from '@/components/layout/PageShell';
import { ModelsWorkspacePage } from './ModelsWorkspacePage';
import { readBankActivation } from '@/engine/bankHistoricalActivation';
import { BankMetricsSummary } from '@/features/bank-metrics/components/BankMetricsSummary';

type WorkspaceTab = 'overview' | 'statements' | 'drivers' | 'valuation' | 'health' | 'explain';
const tabs: { id: WorkspaceTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'statements', label: 'Financial statements' },
  { id: 'drivers', label: 'Assumptions' },
  { id: 'valuation', label: 'Valuation' },
  { id: 'health', label: 'Model health' },
  { id: 'explain', label: 'Insights' },
];

export function PremiumModelWorkspace({ defaultView = 'overview', onNavigateTab }: { defaultView?: WorkspaceTab; onNavigateTab?: (tabId: string, subTabId?: string) => void }) {
  const [tab, setTab] = useState<WorkspaceTab>(defaultView);
  const { activeCompany, activeScenarioId, calculationRun, openDriverDrawer, triggerToast } = useModelContext();
  const blueprint = SECTOR_BLUEPRINTS[activeCompany.sectorId] ?? SECTOR_BLUEPRINTS.general;
  const isBank = activeCompany.sectorId === 'banking';
  const bankData = isBank ? readBankActivation(activeCompany.id) : null;
  const bankPeriods = bankData?.periods ?? [];
  const bankLatest = bankPeriods[bankPeriods.length - 1];
  const bankUnit = bankData?.units ?? 'Units';
  const bankAmount = (n: number | undefined) => n === undefined ? '—' : new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n / 1_000_000);
  const forecast = calculationRun.incomeStatements.filter(row => row.period.type === 'forecast');
  const latest = forecast.at(-1);
  const first = forecast[0];
  const valuation = calculationRun.valuation;
  const validation = calculationRun.validation;
  const format = (value: number | undefined) => value === undefined || !Number.isFinite(value) ? '—' : new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
  const money = (value: number | undefined) => `${activeCompany.currencySymbol}${format(value)}M`;
  const growth = useMemo(() => first && latest && first.revenue > 0 && forecast.length > 1
    ? (Math.pow(latest.revenue / first.revenue, 1 / (forecast.length - 1)) - 1) * 100
    : undefined, [first, latest, forecast.length]);
  const exportModel = () => {
    const blob = new Blob([JSON.stringify(calculationRun, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `xlpro-model-${activeCompany.id}-${activeScenarioId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    triggerToast('Model exported', 'success');
  };
  const healthLabel = validation.errorCount > 0 ? 'Requires attention' : validation.warningCount > 0 ? 'Review warnings' : 'Checks passed';
  const healthColor = validation.errorCount > 0 ? 'text-rose-700 bg-rose-50 border-rose-200' : validation.warningCount > 0 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (isBank) {
    const items = [
      { label: 'Net interest income', key: 'net_interest_income' },
      { label: 'Operating income', key: 'operating_income' },
      { label: 'Profit before tax', key: 'profit_before_tax' },
      { label: 'Net profit', key: 'net_profit' },
      { label: 'Total equity', key: 'total_equity' },
      { label: 'Total assets', key: 'total_assets' },
    ] as const;
    const hasEquity = bankPeriods.some(period => period.accounts.total_equity !== undefined);
    return (
      <div className="mx-auto w-full max-w-7xl space-y-5 px-5 py-6 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-2xl font-semibold tracking-tight">Financial analysis</h1>
            <p className="mt-1 text-sm text-muted-foreground">{activeCompany.name} · {bankData ? `${bankPeriods.length} historical periods · ${bankData.ticker}` : 'No activated history'}</p></div>
          <button onClick={() => onNavigateTab?.('data')} className="rounded-xl border border-border px-4 py-2 text-xs font-semibold">Review Excel data</button>
        </div>
        {bankData && <BankMetricsSummary companyId={activeCompany.id} ticker={bankData.ticker} />}
        {!bankData ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-semibold">Activate banking statements to begin</h2>
            <p className="mt-1 text-sm">Upload and validate the bank Excel workbook in Step 2.</p>
            <button onClick={() => onNavigateTab?.('data')} className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Go to Excel & Mapping →</button>
          </section>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <span>✓ Activated source: {bankData.fileName} · Version {bankData.version}</span>
              <span>{bankPeriods.map(p => p.year).join(' · ')}</span>
            </div>
            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4">
                <h2 className="font-semibold">Reported financials</h2>
                <span className="text-xs text-muted-foreground">Actuals · {activeCompany.currency} millions</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-5 py-3 text-left">Metric</th>{bankPeriods.map(p => <th key={p.year} className="px-5 py-3 text-right">FY{p.year}A</th>)}</tr></thead>
                  <tbody>{items.map(item => <tr key={item.key} className="border-t border-border"><td className="px-5 py-3 font-medium">{item.label}</td>{bankPeriods.map(p => <td key={p.year} className="px-5 py-3 text-right tabular-nums">{bankAmount(p.accounts[item.key])}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </section>
            {!hasEquity && <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Equity is missing from the uploaded income statements. Add verified equity and shares outstanding in Step 6 for a defensible per-share valuation.</p>}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
              <div><h2 className="font-semibold">Next: Build the bank forecast</h2><p className="mt-1 text-sm text-muted-foreground">Continue to Step 4 to review banking assumptions and projections.</p></div>
              <button onClick={() => onNavigateTab?.('forecasts')} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Continue to Forecast <ArrowRight size={16}/></button>
            </div>
          </>
        )}
      </div>
    );
  }
  return (
    <PageShell moduleName="XLPRO / FINANCIAL MODELLING" title={activeCompany.name} titleHighlight="Model workspace"
      description={`${blueprint.name} · ${activeScenarioId.toUpperCase()} scenario · ${activeCompany.currency} · ${activeCompany.accountingBasis}`}
      showPeriodBadge={false}
      actions={<div className="flex flex-wrap items-center gap-2">
        <button onClick={exportModel} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted"><Download size={15}/> Export</button>
        <button onClick={() => openDriverDrawer(blueprint.drivers[0]?.id)} disabled={!blueprint.drivers.length} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"><SlidersHorizontal size={15}/> Edit assumptions</button>
      </div>}>
      <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
        <div role="tablist" aria-label="Model workspace sections" className="flex gap-1 overflow-x-auto">
          {tabs.map(item => <button key={item.id} role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors ${tab === item.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>{item.label}</button>)}
        </div>
      </div>
      {tab !== 'overview' ? <ModelsWorkspacePage key={tab} defaultView={tab} /> : (
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8 shadow-sm">
            <div className="absolute -right-20 -top-28 h-72 w-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
            <div className="relative flex flex-wrap items-start justify-between gap-5">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><Layers3 size={12}/> Financial intelligence workspace</div>
                <h2 className="font-serif text-2xl md:text-3xl text-foreground">Understand the business behind the numbers.</h2>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Explore the forecast, test the assumptions and trace the valuation. </p>
              </div>
              <button onClick={() => setTab('health')} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold ${healthColor}`}>
                {validation.errorCount ? <CircleAlert size={15}/> : <CheckCircle2 size={15}/>} {healthLabel} · {validation.errorCount} errors / {validation.warningCount} warnings
              </button>
            </div>
            <div className="relative mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Final-year revenue', value: money(latest?.revenue), icon: BarChart3, detail: latest?.period.periodLabel ?? 'Forecast' },
                { label: 'Forecast revenue CAGR', value: growth === undefined ? '—' : `${format(growth)}%`, icon: TrendingUp, detail: 'First to last forecast year' },
                { label: 'Final-year EBITDA margin', value: latest ? `${format(latest.ebitdaMarginPct)}%` : '—', icon: Gauge, detail: 'Operating profitability' },
                { label: 'Implied equity value', value: money(valuation.impliedEquityValue), icon: Activity, detail: 'Illustrative DCF output' },
              ].map(metric => <div key={metric.label} className="rounded-2xl border border-border bg-background/70 p-5">
                <div className="flex items-center justify-between text-xs text-muted-foreground"><span>{metric.label}</span><metric.icon size={17} className="text-primary"/></div>
                <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{metric.value}</div>
                <div className="mt-2 text-[11px] text-muted-foreground">{metric.detail}</div>
              </div>)}
            </div>
          </section>
          <div className="grid gap-5 xl:grid-cols-3">
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm xl:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-semibold">Forecast trajectory</h3><p className="mt-1 text-xs text-muted-foreground">Revenue and EBITDA across the forecast horizon · {activeCompany.currencySymbol}M</p></div><button onClick={() => setTab('statements')} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">View statements <ArrowRight size={14}/></button></div>
              <div className="mt-8 grid grid-cols-5 items-end gap-3" style={{ minHeight: 200 }}>
                {forecast.map(row => {
                  const max = Math.max(1, ...forecast.map(item => Math.max(0, item.revenue)));
                  const revHeight = Math.max(4, (Math.max(0, row.revenue) / max) * 150);
                  const ebitdaHeight = Math.max(0, (Math.max(0, row.ebitda) / max) * 150);
                  return <div key={row.period.year} className="flex min-w-0 flex-col items-center gap-2">
                    <span className="text-[10px] font-semibold text-muted-foreground">{format(row.revenue)}</span>
                    <div className="relative flex w-full max-w-20 items-end justify-center gap-1" style={{ height: 155 }}>
                      <div title={`Revenue ${money(row.revenue)}`} className="w-2/5 rounded-t-lg bg-primary/80 transition-all" style={{ height: revHeight }}/>
                      <div title={`EBITDA ${money(row.ebitda)}`} className="w-2/5 rounded-t-lg bg-emerald-500/75 transition-all" style={{ height: ebitdaHeight }}/>
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground">{row.period.year}</span>
                  </div>;
                })}
              </div>
              <div className="mt-5 flex gap-5 border-t border-border pt-4 text-xs text-muted-foreground"><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-primary/80"/>Revenue</span><span><i className="mr-2 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500/75"/>EBITDA</span></div>
            </section>
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-base font-semibold">Your next move</h3><p className="mt-1 text-xs text-muted-foreground">A guided workflow without spreadsheet complexity.</p>
              <div className="mt-6 space-y-3">
                {[
                  { step: '01', title: 'Review financial statements', detail: 'Inspect actuals and forecast periods.', next: 'statements' as const },
                  { step: '02', title: 'Fine-tune key assumptions', detail: 'Adjust sector drivers and instantly recalculate.', next: 'drivers' as const },
                  { step: '03', title: 'Review valuation & risks', detail: 'Understand the DCF and model warnings.', next: 'valuation' as const },
                ].map(item => <button key={item.step} onClick={() => setTab(item.next)} className="group flex w-full items-start gap-3 rounded-xl border border-border p-3 text-left hover:border-primary/40 hover:bg-muted/40">
                  <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-bold text-primary">{item.step}</span><span className="flex-1"><span className="block text-xs font-semibold">{item.title}</span><span className="mt-1 block text-[11px] leading-5 text-muted-foreground">{item.detail}</span></span><ArrowRight size={15} className="mt-1 text-muted-foreground group-hover:text-primary"/>
                </button>)}
              </div>
              
            </section>
          </div>
        </div>
      )}
    </PageShell>
  );
}
