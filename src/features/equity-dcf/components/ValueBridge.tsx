import type { ValuationOutput } from '@/types/finance';
import { formatMillions } from './formatValuation';

interface BridgeLine {
  label: string;
  value: number;
  kind: 'add' | 'subtract' | 'total';
  missing?: boolean;
}

/** Horizontal bars from forecast cash flows to equity value. Display only; all figures come from the model. */
export function ValueBridge({ valuation, sym }: { valuation: ValuationOutput; sym: string }) {
  const b = valuation.bridge;
  if (!b || valuation.dcfStatus !== 'valid') return null;
  const missing = new Set(b.notProvided);
  const lines: BridgeLine[] = [
    { label: 'Value of forecast-year cash', value: valuation.sumPvFCFF, kind: 'add' },
    { label: 'Value of cash after the forecast', value: valuation.pvOfTerminalValue, kind: 'add' },
    { label: 'Business value (EV)', value: valuation.enterpriseValue, kind: 'total' },
    { label: 'Cash', value: b.cash, kind: 'add', missing: missing.has('cash') },
    { label: 'Non-operating investments', value: b.nonOperatingInvestments, kind: 'add', missing: missing.has('nonOperatingInvestments') },
    { label: 'Debt', value: b.debt, kind: 'subtract', missing: missing.has('debt') },
    { label: 'Lease liabilities', value: b.leaseLiabilities, kind: 'subtract', missing: missing.has('leaseLiabilities') },
    { label: 'Minority interest', value: b.minorityInterest, kind: 'subtract', missing: missing.has('minorityInterest') },
    { label: 'Preferred equity', value: b.preferredEquity, kind: 'subtract', missing: missing.has('preferredEquity') },
    { label: 'Value for shareholders', value: valuation.impliedEquityValue, kind: 'total' },
  ];
  const max = Math.max(...lines.map((l) => Math.abs(l.value)), 1);

  return (
    <ol className="space-y-1.5" aria-label="From business value to shareholder value">
      {lines.map((l) => (
        <li key={l.label} className={`grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 text-xs ${l.kind === 'total' ? 'font-bold' : ''}`}>
          <span className="truncate text-foreground">
            {l.kind === 'subtract' ? '− ' : l.kind === 'add' ? '+ ' : '= '}
            {l.label}
          </span>
          <span className="h-3 rounded-sm bg-muted/60" role="presentation">
            {!l.missing && (
              <span
                className={`block h-full rounded-sm ${l.kind === 'total' ? 'bg-primary' : l.kind === 'subtract' ? 'bg-rose-400' : 'bg-emerald-500'}`}
                style={{ width: `${(Math.abs(l.value) / max) * 100}%` }}
              />
            )}
          </span>
          <span className="w-24 text-right font-mono">
            {l.missing ? <span className="font-sans text-amber-700">not provided</span> : formatMillions(sym, l.value)}
          </span>
        </li>
      ))}
    </ol>
  );
}
