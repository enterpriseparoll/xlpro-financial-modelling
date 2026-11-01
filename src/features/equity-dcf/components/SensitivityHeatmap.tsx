import type { ValuationOutput } from '@/types/finance';

/** WACC × growth (or exit multiple) grid. Cells are full recalculations from the engine; colour shows distance from base. */
export function SensitivityHeatmap({ valuation, sym }: { valuation: ValuationOutput; sym: string }) {
  const { waccValues, growthValues, matrix, metric, secondAxis } = valuation.sensitivityMatrix;
  if (!matrix.length) return null;
  const mid = Math.floor(waccValues.length / 2);
  const midCol = Math.floor(growthValues.length / 2);
  const base = matrix[mid]?.[midCol];
  const isMultiple = secondAxis === 'exit_multiple';
  const fmt = (v: number) => (metric === 'value_per_share' ? `${sym}${v.toFixed(2)}` : `${sym}${v.toFixed(0)}M`);
  const tone = (v: number | null) => {
    if (v === null || base == null || base === 0) return 'bg-muted/40 text-muted-foreground';
    const d = (v - base) / Math.abs(base);
    if (d > 0.15) return 'bg-emerald-200 text-emerald-950';
    if (d > 0.05) return 'bg-emerald-100 text-emerald-900';
    if (d < -0.15) return 'bg-rose-200 text-rose-950';
    if (d < -0.05) return 'bg-rose-100 text-rose-900';
    return 'bg-card text-foreground';
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-separate border-spacing-1 text-center text-xs">
        <caption className="mb-2 text-left text-[11px] text-muted-foreground">
          {metric === 'value_per_share' ? 'Value per share' : 'Value for shareholders'} — rows: required return (WACC); columns: {isMultiple ? 'exit multiple' : 'long-term growth'}. “n/a” = no finite value.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="text-left font-semibold text-muted-foreground">WACC</th>
            {growthValues.map((g) => (
              <th key={g} scope="col" className="font-semibold text-muted-foreground">{isMultiple ? `${g.toFixed(1)}x` : `${g.toFixed(1)}%`}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {waccValues.map((w, r) => (
            <tr key={w}>
              <th scope="row" className="text-left font-mono font-semibold">{w.toFixed(2)}%</th>
              {growthValues.map((g, c) => {
                const v = matrix[r]?.[c] ?? null;
                const isBase = r === mid && c === midCol;
                return (
                  <td key={g} className={`rounded px-2 py-1.5 font-mono ${tone(v)} ${isBase ? 'ring-2 ring-primary font-bold' : ''}`}>
                    {v === null ? 'n/a' : fmt(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
