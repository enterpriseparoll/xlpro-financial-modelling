interface Option<T extends string> {
  value: T;
  label: string;
  hint?: string;
}

/** Accessible segmented choice (radio group) for small sets of mutually exclusive options. */
export function ChoiceToggle<T extends string>({ legend, options, value, onChange }: {
  legend: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm font-medium text-foreground">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`cursor-pointer rounded-md border p-3 text-sm transition-colors ${
              value === o.value ? 'border-primary bg-primary-soft/40' : 'border-border bg-card hover:bg-muted/40'
            }`}
          >
            <input type="radio" className="sr-only" checked={value === o.value} onChange={() => onChange(o.value)} />
            <span className="font-semibold text-foreground">{o.label}</span>
            {o.hint && <span className="mt-0.5 block text-xs text-muted-foreground">{o.hint}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
