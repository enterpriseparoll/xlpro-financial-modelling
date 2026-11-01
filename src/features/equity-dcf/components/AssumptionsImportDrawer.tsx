import { ExcelUploadDrawer } from '@/components/excel-upload/ExcelUploadDrawer';
import { ASSUMPTIONS_UPLOAD_SCHEMA, diffImportedAssumptions, importedToPatch, type ImportedAssumption } from '../engine/assumptionsImport';
import type { GuidedValuation } from '../hooks/useGuidedValuation';

const KIND_STYLE = { change: 'bg-sky-100 text-sky-800', clear: 'bg-amber-100 text-amber-900', same: 'bg-muted text-muted-foreground' } as const;
const KIND_TEXT = { change: 'Change', clear: 'Back to default', same: 'No change' } as const;

/** Imports assumptions for the active company + scenario into the working copy, after review. */
export function AssumptionsImportDrawer({ g, open, onOpenChange, onImported }: {
  g: GuidedValuation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Provenance text for the next saved version, e.g. "Imported 4 assumptions from x.xlsx (rows 6–9)". */
  onImported: (provenance: string) => void;
}) {
  const { activeCompany, scenarios, activeScenarioId, assumptions, updateValuationAssumptions, valuationPersistence: p } = g;
  const scenarioName = scenarios.find((s) => s.id === activeScenarioId)?.name ?? activeScenarioId;

  return (
    <ExcelUploadDrawer<ImportedAssumption>
      open={open}
      onOpenChange={onOpenChange}
      schema={ASSUMPTIONS_UPLOAD_SCHEMA}
      targetLabel={`${activeCompany.name} · ${scenarioName}`}
      branding={{ companyName: activeCompany.name }}
      currency={activeCompany.currency}
      applyLabel="Apply to this valuation"
      renderReview={(rows) => {
        const changes = diffImportedAssumptions(assumptions, rows);
        return (
          <table className="w-full text-xs">
            <thead className="bg-muted/60 text-left text-[11px] text-muted-foreground">
              <tr><th className="px-2 py-1.5">Assumption</th><th className="px-2 py-1.5">Now</th><th className="px-2 py-1.5">After import</th><th className="px-2 py-1.5"> </th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {changes.map((c) => (
                <tr key={c.key}>
                  <td className="px-2 py-1.5 font-medium text-foreground">{c.label}</td>
                  <td className="px-2 py-1.5 font-mono">{c.from}</td>
                  <td className="px-2 py-1.5 font-mono text-sky-800">{c.to}</td>
                  <td className="px-2 py-1.5"><span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${KIND_STYLE[c.kind]}`}>{KIND_TEXT[c.kind]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      }}
      onApply={(rows, { fileName, rowNumbers }) => {
        updateValuationAssumptions(importedToPatch(rows));
        const span = rowNumbers.length > 1 ? `rows ${Math.min(...rowNumbers)}–${Math.max(...rowNumbers)}` : `row ${rowNumbers[0]}`;
        onImported(`Imported ${rows.length} assumption(s) from ${fileName} (${span})`);
        return {
          ok: true,
          message: p.mode === 'workspace'
            ? `Applied ${rows.length} assumption(s) to your working copy. They are not saved yet — use "Save as version" to keep them.`
            : `Applied ${rows.length} assumption(s). They are saved in this browser only.`,
        };
      }}
    />
  );
}
