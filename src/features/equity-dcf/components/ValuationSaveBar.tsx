import { useCallback, useState } from 'react';
import { Cloud, HardDrive, History } from 'lucide-react';
import { useSession } from '@/features/auth';
import type { GuidedValuation } from '../hooks/useGuidedValuation';
import { VersionHistoryDrawer } from './VersionHistoryDrawer';

/** Shows where assumptions are stored and offers save / discard / history. Never claims a save that did not happen. */
/** `note` is lifted so an Excel import can pre-fill its provenance for the next saved version. */
export function ValuationSaveBar({ g, note, onNoteChange }: { g: GuidedValuation; note: string; onNoteChange: (note: string) => void }) {
  const { valuationPersistence: p, calculationRun, driverOverrides, activeCompany, activeHistoricalDataset } = g;
  const session = useSession();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [justSaved, setJustSaved] = useState<number | null>(null);
  const loadHistory = useCallback(() => p.loadHistory(), [p.workspace?.id, activeCompany.id, g.activeScenarioId]);

  const save = async () => {
    const ok = await p.saveVersion(note, {
      valuation: calculationRun.valuation,
      inputs: {
        assumptions: g.assumptions,
        driverOverrides,
        company: {
          shareCount: activeCompany.shareCount,
          currentSharePrice: activeCompany.currentSharePrice,
          currency: activeCompany.currency,
          fiscalYearEnd: activeCompany.fiscalYearEnd,
        },
        historicalSource: activeHistoricalDataset ? `dataset:${activeHistoricalDataset.id}:v${activeHistoricalDataset.version}` : 'illustrative-sample',
      },
    });
    if (ok) {
      onNoteChange('');
      setJustSaved((p.latest?.version ?? 0) + 1);
    }
  };

  if (p.mode === 'browser') {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-muted/30 px-4 py-2.5 text-xs">
        <HardDrive className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="text-foreground">Saved in this browser only — not shared and not backed up.</span>
        {session.status === 'signed_out' && (
          <button type="button" onClick={session.openAuth} className="font-semibold text-primary hover:underline">Sign in to save versions to your workspace</button>
        )}
        {session.status === 'signed_in' && !session.activeWorkspace && (
          <span className="text-amber-800">{session.workspaceError ?? 'Setting up your workspace…'}</span>
        )}
        {session.status === 'not_configured' && <span className="text-muted-foreground">Workspace saving is not set up for this app yet.</span>}
      </div>
    );
  }

  const latestLabel = p.latest
    ? `Version ${p.latest.version} saved ${new Date(p.latest.createdAt).toLocaleString()}`
    : 'No version saved yet';

  return (
    <div className="space-y-2 rounded-lg border border-border bg-card px-4 py-3 text-xs shadow-xs">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Cloud className="h-4 w-4 text-primary" aria-hidden />
        <span className="font-semibold text-foreground">{p.workspace?.name}</span>
        <span className="text-muted-foreground">{p.status === 'loading' ? 'Loading saved assumptions…' : latestLabel}</span>
        {p.dirty && <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-900">Unsaved changes</span>}
        {!p.dirty && justSaved && p.latest?.version === justSaved && <span role="status" className="rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-800">Saved</span>}
        <button type="button" onClick={() => setHistoryOpen(true)} className="ml-auto inline-flex items-center gap-1 font-semibold text-primary hover:underline">
          <History className="h-3.5 w-3.5" /> History
        </button>
      </div>

      {p.dirty && p.canSave && (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="dcf-version-note" className="sr-only">What changed (optional)</label>
          <input id="dcf-version-note" value={note} maxLength={500} onChange={(e) => onNoteChange(e.target.value)} placeholder="What changed? (optional)"
            className="min-w-[12rem] flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs" />
          <button type="button" onClick={() => void save()} disabled={p.status !== 'ready'}
            className="rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground disabled:opacity-50">
            {p.status === 'saving' ? 'Saving…' : `Save as version ${(p.latest?.version ?? 0) + 1}`}
          </button>
          <button type="button" onClick={p.discardChanges} disabled={p.status !== 'ready'} className="rounded-md border border-border px-3 py-1.5 font-semibold disabled:opacity-50">
            Discard changes
          </button>
        </div>
      )}
      {p.dirty && !p.canSave && <p className="text-amber-800">You have view-only access to this workspace, so changes here are not saved.</p>}

      {p.staleDraft && (
        <div className="flex flex-wrap items-center gap-2 rounded bg-amber-50 px-3 py-2 text-amber-900">
          <span>You have unsaved edits based on version {p.staleDraft.baseVersion}, but version {p.latest?.version ?? 0} is now the latest.</span>
          <button type="button" onClick={p.useStaleDraft} className="font-semibold underline">Continue with my edits</button>
          <button type="button" onClick={p.dismissStaleDraft} className="font-semibold underline">Use the latest version</button>
        </div>
      )}
      {p.error && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded bg-rose-50 px-3 py-2 text-rose-800">
          <span>{p.error}</span>
          {p.conflict && <button type="button" onClick={p.reloadLatest} className="font-semibold underline">Reload latest version</button>}
        </div>
      )}

      <VersionHistoryDrawer open={historyOpen} onOpenChange={setHistoryOpen} loadHistory={loadHistory} onRestore={p.restoreVersion} currentUserId={session.user?.id} />
    </div>
  );
}
