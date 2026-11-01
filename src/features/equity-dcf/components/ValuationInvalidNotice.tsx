import type { ValuationOutput } from '@/types/finance';

/** Explains why valuation figures are blank. Renders nothing when the valuation is valid. */
export function ValuationInvalidNotice({ valuation }: { valuation: Pick<ValuationOutput, 'dcfStatus' | 'dcfErrors'> }) {
  if (valuation.dcfStatus !== 'invalid') return null;
  return (
    <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
      <p className="font-semibold">No valuation shown — the current assumptions can't produce a value.</p>
      <p className="mt-1">{valuation.dcfErrors.join(' ')} Adjust the valuation assumptions and the figures will reappear.</p>
    </div>
  );
}
