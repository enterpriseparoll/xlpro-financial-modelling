import { useEffect, useId, useState } from 'react';
import { ASSUMPTION_GUIDE, type NumericAssumptionKey } from '../engine/assumptions';

interface Props {
  field: NumericAssumptionKey;
  /** The user's override; undefined means the model default is in use. */
  value: number | undefined;
  /** What the model is currently using (shown when no override is set). */
  effective?: number;
  onChange: (value: number | undefined) => void;
  note?: string;
  /** Text shown when the field is blank and has no default, e.g. "Not provided". */
  emptyLabel?: string;
  currencySymbol?: string;
}

/** Labelled numeric input: plain-language label first, technical term second, inline help and validation. */
export function AssumptionField({ field, value, effective, onChange, note, emptyLabel, currencySymbol = '' }: Props) {
  const guide = ASSUMPTION_GUIDE[field];
  const id = useId();
  const [draft, setDraft] = useState(value === undefined ? '' : String(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(value === undefined ? '' : String(value));
    setError(null);
  }, [value]);

  const commit = () => {
    const text = draft.trim();
    if (text === '') {
      setError(null);
      if (value !== undefined) onChange(undefined);
      return;
    }
    const n = Number(text);
    if (!Number.isFinite(n)) return setError('Enter a number.');
    if (n < guide.limits.min || n > guide.limits.max) return setError(`Enter a value between ${guide.limits.min} and ${guide.limits.max}.`);
    setError(null);
    if (n !== value) onChange(n);
  };

  const suffix = guide.unit === 'M' ? 'M' : guide.unit;
  const prefix = guide.unit === 'M' ? currencySymbol : '';
  const placeholder = effective !== undefined && Number.isFinite(effective) ? String(Number(effective.toFixed(4))) : emptyLabel ?? '';

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
        <span className="text-sm font-medium text-foreground">{guide.label}</span>
        <span className="text-[11px] text-muted-foreground">{guide.term}</span>
      </label>
      <div className={`flex items-center rounded-md border bg-card focus-within:ring-2 focus-within:ring-primary/30 ${error ? 'border-rose-400' : 'border-border'}`}>
        {prefix && <span className="pl-3 text-sm text-muted-foreground">{prefix}</span>}
        <input
          id={id}
          inputMode="decimal"
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          aria-invalid={!!error}
          aria-describedby={`${id}-help`}
          className="w-full bg-transparent px-3 py-2 font-mono text-sm text-sky-800 outline-none placeholder:text-muted-foreground dark:text-sky-300"
        />
        <span className="pr-3 text-sm text-muted-foreground">{suffix}</span>
      </div>
      <div id={`${id}-help`} className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="text-muted-foreground">{guide.help}</span>
        {value === undefined ? (
          effective !== undefined && Number.isFinite(effective) && <span className="rounded bg-muted px-1.5 py-0.5 font-semibold text-muted-foreground">Model default</span>
        ) : (
          <button type="button" onClick={() => onChange(undefined)} className="font-semibold text-primary hover:underline">
            {effective === undefined || guide.unit === 'M' ? 'Clear' : 'Reset to default'}
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-xs text-rose-700">{error}</p>}
      {!error && note && <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">{note}</p>}
    </div>
  );
}
