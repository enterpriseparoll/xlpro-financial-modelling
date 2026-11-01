import { useEffect, useState } from 'react';
import { SlideInForm } from '@/components/ui/slide-in-form';
import type { AssumptionVersion } from '../services/valuationAssumptionsRepository';

/** Saved versions for this company and scenario. Loading one puts it in the editor; saving creates a new version. */
export function VersionHistoryDrawer({ open, onOpenChange, loadHistory, onRestore, currentUserId }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadHistory: () => Promise<AssumptionVersion[]>;
  onRestore: (v: AssumptionVersion) => void;
  currentUserId?: string;
}) {
  const [versions, setVersions] = useState<AssumptionVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setVersions(null);
    setError(null);
    loadHistory()
      .then((v) => alive && setVersions(v))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Could not load history.'));
    return () => { alive = false; };
  }, [open, loadHistory]);

  return (
    <SlideInForm open={open} onOpenChange={onOpenChange} title="Saved versions" description="Every save is kept. Loading an older version lets you review it and save it again as the newest version.">
      {error && <p role="alert" className="rounded bg-rose-50 px-3 py-2 text-xs text-rose-800">{error}</p>}
      {!error && versions === null && <p className="text-sm text-muted-foreground">Loading…</p>}
      {versions?.length === 0 && <p className="text-sm text-muted-foreground">No versions saved yet.</p>}
      <ol className="space-y-2">
        {versions?.map((v, i) => (
          <li key={v.id} className="rounded-md border border-border p-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-foreground">Version {v.version}{i === 0 ? ' · latest' : ''}</span>
              <time className="text-[11px] text-muted-foreground" dateTime={v.createdAt}>{new Date(v.createdAt).toLocaleString()}</time>
            </div>
            <p className="text-[11px] text-muted-foreground">Saved by {v.createdBy === currentUserId ? 'you' : 'a workspace member'} · {Object.keys(v.assumptions).length} assumption(s) changed from defaults</p>
            {v.note && <p className="mt-1 text-xs text-foreground">“{v.note}”</p>}
            {i > 0 && (
              <button type="button" onClick={() => { onRestore(v); onOpenChange(false); }} className="mt-2 text-xs font-semibold text-primary hover:underline">
                Load into editor
              </button>
            )}
          </li>
        ))}
      </ol>
    </SlideInForm>
  );
}
