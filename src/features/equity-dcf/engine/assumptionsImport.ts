import type { ValuationOverrides } from '../../../types/finance';
import type { RowError, UploadSchema } from '../../../lib/excel-upload/types';
import { ASSUMPTION_GUIDE, type NumericAssumptionKey } from './assumptions';

/**
 * Valuation assumptions in Excel: one row per assumption (Assumption | Value | Unit | Note).
 * The same layout is used by the export's Assumptions sheet, so an exported report can be re-imported.
 * Values are applied to the active company + scenario only after the user reviews them.
 */

type ChoiceKey = 'waccMode' | 'terminalValueMethod' | 'cashFlowTiming';
export type ImportableKey = NumericAssumptionKey | ChoiceKey | 'valuationDate';

const CHOICES: Record<ChoiceKey, { label: string; options: { value: string; aliases: string[] }[] }> = {
  waccMode: { label: 'Required return method', options: [
    { value: 'build_up', aliases: ['build_up', 'build up', 'build it up', 'capm'] },
    { value: 'direct', aliases: ['direct', 'enter one rate', 'one rate'] },
  ] },
  terminalValueMethod: { label: 'After-forecast method', options: [
    { value: 'gordon_growth', aliases: ['gordon_growth', 'gordon', 'steady growth forever', 'perpetuity growth', 'growth'] },
    { value: 'exit_multiple', aliases: ['exit_multiple', 'exit multiple', 'a sale price', 'sale price', 'multiple'] },
  ] },
  cashFlowTiming: { label: 'Cash-flow timing', options: [
    { value: 'mid_year', aliases: ['mid_year', 'mid-year', 'mid year', 'evenly through the year'] },
    { value: 'end_of_year', aliases: ['end_of_year', 'end-of-year', 'end of year', 'at year end'] },
  ] },
};

export interface AssumptionCatalogEntry {
  key: ImportableKey;
  label: string;
  unit: string;
  accepted: string;
}

const UNIT_TEXT: Record<string, string> = { '%': '%', x: 'x', M: 'millions' };

export const ASSUMPTION_CATALOG: AssumptionCatalogEntry[] = [
  { key: 'valuationDate', label: 'Valuation date', unit: 'date', accepted: 'YYYY-MM-DD, inside the first forecast year' },
  { key: 'cashFlowTiming', label: CHOICES.cashFlowTiming.label, unit: '', accepted: 'mid_year or end_of_year' },
  { key: 'waccMode', label: CHOICES.waccMode.label, unit: '', accepted: 'build_up or direct' },
  ...(Object.keys(ASSUMPTION_GUIDE) as NumericAssumptionKey[]).map((key) => {
    const g = ASSUMPTION_GUIDE[key];
    return { key, label: g.term, unit: UNIT_TEXT[g.unit], accepted: `${g.limits.min} to ${g.limits.max}${g.typical ? ` (typical ${g.typical.min}–${g.typical.max})` : ''}` };
  }),
  { key: 'terminalValueMethod', label: CHOICES.terminalValueMethod.label, unit: '', accepted: 'gordon_growth or exit_multiple' },
];

const norm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/[^a-z0-9%]/g, '');
const LOOKUP = new Map<string, ImportableKey>();
for (const entry of ASSUMPTION_CATALOG) {
  LOOKUP.set(norm(entry.key), entry.key);
  LOOKUP.set(norm(entry.label), entry.key);
  if (entry.key in ASSUMPTION_GUIDE) LOOKUP.set(norm(ASSUMPTION_GUIDE[entry.key as NumericAssumptionKey].label), entry.key);
}

export function resolveAssumptionName(name: string): ImportableKey | undefined {
  return LOOKUP.get(norm(name));
}

/** Excel stores typed dates as serial days since 1899-12-30 (1900 date system). */
function excelSerialToIso(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2958465) return null;
  const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export interface ImportedAssumption {
  key: ImportableKey;
  /** undefined = "default": remove the override so the model default applies. */
  value: ValuationOverrides[ImportableKey] | undefined;
  note: string;
}

export function parseAssumptionValue(key: ImportableKey, rawValue: string): { value?: ImportedAssumption['value']; clear?: boolean; error?: string } {
  const text = rawValue.trim();
  if (/^(default|model default)$/i.test(text)) return { clear: true };
  if (key === 'valuationDate') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return { value: text };
    if (/^\d+(\.\d+)?$/.test(text)) {
      const iso = excelSerialToIso(Number(text));
      if (iso) return { value: iso };
    }
    return { error: 'Valuation date must be a date (YYYY-MM-DD).' };
  }
  if (key in CHOICES) {
    const c = CHOICES[key as ChoiceKey];
    const hit = c.options.find((o) => o.aliases.some((a) => norm(a) === norm(text)));
    return hit ? { value: hit.value as ImportedAssumption['value'] } : { error: `${c.label} must be ${c.options.map((o) => o.value).join(' or ')}.` };
  }
  const guide = ASSUMPTION_GUIDE[key as NumericAssumptionKey];
  const n = Number(text.replace(/,/g, '').replace(/[%x]$/i, ''));
  if (text === '' || !Number.isFinite(n)) return { error: `${guide.term} must be a number${guide.unit === '%' ? ' in percent (e.g. 4.5 for 4.5%)' : ''}.` };
  if (n < guide.limits.min || n > guide.limits.max) return { error: `${guide.term} must be between ${guide.limits.min} and ${guide.limits.max}.` };
  return { value: n };
}

export const ASSUMPTIONS_UPLOAD_SCHEMA: UploadSchema<ImportedAssumption> = {
  id: 'valuation-assumptions',
  title: 'Valuation assumptions',
  description: 'One row per assumption for the selected company and scenario.',
  columns: [
    { key: 'assumption', label: 'Assumption', type: 'text', required: true, help: 'Name from the Reference sheet (plain name or technical term).', width: 34 },
    { key: 'value', label: 'Value', type: 'text', required: true, help: 'Percent values as numbers (4.5 = 4.5%). Write "default" to use the model default.', width: 16 },
    { key: 'unit', label: 'Unit', type: 'text', help: 'For reference only; ignored on upload.', width: 10 },
    { key: 'note', label: 'Note', type: 'text', help: 'Optional source or reason, kept with the review.', width: 40 },
  ],
  instructions: [
    'Fill in the Data sheet: one row per assumption you want to set. Leave out anything you want to keep as it is.',
    'Use the names on the Reference sheet. Percentages are plain numbers: write 4.5 for 4.5%.',
    'Write "default" as the value to remove your own figure and use the model default again.',
    'Money amounts (lease liabilities, minority interest, preferred equity, non-operating investments) are in millions of the company currency.',
    'Upload the file from the Valuation page. You will see every change before anything is applied, and nothing is saved until you choose to save.',
  ],
  sampleRows: [
    { assumption: 'Risk-free rate', value: 4.25, unit: '%', note: 'Illustrative — replace with your source' },
    { assumption: 'Equity beta', value: 1.1, unit: 'x', note: 'Illustrative' },
    { assumption: 'Terminal growth (g)', value: 2.5, unit: '%', note: 'Illustrative' },
    { assumption: 'Required return method', value: 'build_up', unit: '', note: '' },
  ],
  reference: {
    title: 'Assumptions you can set',
    columns: [{ key: 'label', label: 'Assumption' }, { key: 'unit', label: 'Unit' }, { key: 'accepted', label: 'Accepted values' }, { key: 'key', label: 'Technical key' }],
    rows: ASSUMPTION_CATALOG.map((e) => ({ label: e.label, unit: e.unit, accepted: e.accepted, key: e.key })),
  },
  maxRows: 200,
  validateRow: (cells) => {
    const name = String(cells.assumption ?? '');
    const key = resolveAssumptionName(name);
    if (!key) return { errors: [{ field: 'assumption', message: `"${name}" is not a recognised assumption. Use a name from the Reference sheet.` }] };
    const parsed = parseAssumptionValue(key, String(cells.value ?? ''));
    if (parsed.error) return { errors: [{ field: 'value', message: parsed.error }] };
    return { value: { key, value: parsed.clear ? undefined : parsed.value, note: String(cells.note ?? '') }, errors: [] };
  },
  validateAll: (rows) => {
    const seen = new Map<ImportableKey, number>();
    const out = new Map<number, RowError[]>();
    for (const { rowNumber, value } of rows) {
      const first = seen.get(value.key);
      if (first !== undefined) out.set(rowNumber, [{ field: 'assumption', message: `This assumption already appears on row ${first}. Keep one row per assumption.` }]);
      else seen.set(value.key, rowNumber);
    }
    return out;
  },
};

export interface AssumptionChange {
  key: ImportableKey;
  label: string;
  from: string;
  to: string;
  kind: 'change' | 'clear' | 'same';
}

const isBridgeItem = (key: ImportableKey) => key in ASSUMPTION_GUIDE && ASSUMPTION_GUIDE[key as NumericAssumptionKey].unit === 'M';
const show = (key: ImportableKey, v: unknown) => (v === undefined || v === null ? (isBridgeItem(key) ? 'Not provided' : 'Model default') : String(v));

/** What applying the imported rows would change, compared with the current working copy. */
export function diffImportedAssumptions(current: ValuationOverrides, imported: ImportedAssumption[]): AssumptionChange[] {
  return imported.map(({ key, value }) => {
    const before = (current as Record<string, unknown>)[key];
    const label = ASSUMPTION_CATALOG.find((e) => e.key === key)?.label ?? key;
    const kind: AssumptionChange['kind'] = before === value ? 'same' : value === undefined ? 'clear' : 'change';
    return { key, label, from: show(key, before), to: show(key, value), kind };
  });
}

export function importedToPatch(imported: ImportedAssumption[]): Partial<ValuationOverrides> {
  return Object.fromEntries(imported.map((i) => [i.key, i.value])) as Partial<ValuationOverrides>;
}
