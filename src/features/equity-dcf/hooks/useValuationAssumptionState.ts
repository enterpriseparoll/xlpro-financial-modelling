import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ValuationOutput, ValuationOverrides } from '@/types/finance';
import { canEdit, useSession, type Workspace } from '@/features/auth';
import { applyAssumptionPatch } from '../engine/assumptions';
import { DCF_ENGINE_VERSION } from '../engine/runDcf';
import { sameAssumptions, type RunInputs } from '../engine/runSnapshot';
import * as repo from '../services/valuationAssumptionsRepository';
import type { AssumptionScope, AssumptionVersion } from '../services/valuationAssumptionsRepository';
import { clearDraft, loadDraft, saveDraft, type ValuationDraft } from '../services/valuationDraftStore';
import { loadValuationAssumptions, saveValuationAssumptions } from '../services/valuationAssumptionsStore';

export type PersistenceMode = 'browser' | 'workspace';

export interface ValuationPersistence {
  mode: PersistenceMode;
  workspace: Workspace | null;
  canSave: boolean;
  status: 'loading' | 'ready' | 'saving';
  error: string | null;
  conflict: boolean;
  dirty: boolean;
  latest: AssumptionVersion | null;
  /** A local draft based on an older version than the latest saved one. */
  staleDraft: ValuationDraft | null;
  saveVersion: (note: string, snapshot: { valuation: ValuationOutput; inputs: RunInputs }) => Promise<boolean>;
  discardChanges: () => void;
  reloadLatest: () => void;
  useStaleDraft: () => void;
  dismissStaleDraft: () => void;
  loadHistory: () => Promise<AssumptionVersion[]>;
  restoreVersion: (v: AssumptionVersion) => void;
}

/**
 * Owns the working copy of valuation assumptions for one company + scenario.
 * Signed in → versions live in the Supabase workspace and edits are a draft until saved.
 * Otherwise → browser-only prototype storage, saved on every edit.
 */
export function useValuationAssumptionState(companyId: string, scenarioId: string, scenarioIds: string[]) {
  const session = useSession();
  const workspace = session.status === 'signed_in' ? session.activeWorkspace : null;
  const mode: PersistenceMode = workspace ? 'workspace' : 'browser';
  const scope = useMemo<AssumptionScope | null>(
    () => (workspace ? { tenantId: workspace.id, companyKey: companyId, scenarioId } : null),
    [workspace?.id, companyId, scenarioId],
  );
  const scenarioKey = scenarioIds.join('|');

  const [draft, setDraft] = useState<ValuationOverrides>(() => loadValuationAssumptions(companyId, scenarioId));
  const [latestByScenario, setLatestByScenario] = useState<Record<string, AssumptionVersion | null>>({});
  const [status, setStatus] = useState<ValuationPersistence['status']>('ready');
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [staleDraft, setStaleDraft] = useState<ValuationDraft | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestId = useRef(0);

  const latest = latestByScenario[scenarioId] ?? null;
  const baseVersion = latest?.version ?? 0;

  useEffect(() => {
    const id = ++requestId.current;
    setError(null);
    setConflict(false);
    setStaleDraft(null);
    if (!scope) {
      setLatestByScenario({});
      setDraft(loadValuationAssumptions(companyId, scenarioId));
      setStatus('ready');
      return;
    }
    setStatus('loading');
    repo.fetchLatestByScenario(scope.tenantId, scope.companyKey, scenarioIds)
      .then((byScenario) => {
        if (id !== requestId.current) return;
        setLatestByScenario(byScenario);
        const saved = byScenario[scope.scenarioId] ?? null;
        const savedAssumptions = saved?.assumptions ?? {};
        const local = loadDraft(scope);
        if (local && local.baseVersion === (saved?.version ?? 0)) {
          setDraft(local.assumptions);
        } else {
          setDraft(savedAssumptions);
          if (local && !sameAssumptions(local.assumptions, savedAssumptions)) setStaleDraft(local);
          else if (local) clearDraft(scope);
        }
        setStatus('ready');
      })
      .catch((e) => {
        if (id !== requestId.current) return;
        // Never fall back to other data silently: show the error and keep an empty working copy.
        setLatestByScenario({});
        setDraft({});
        setError(`Could not load saved assumptions from your workspace: ${e instanceof Error ? e.message : String(e)}`);
        setStatus('ready');
      });
  }, [scope, companyId, scenarioId, scenarioKey, reloadToken]);

  const writeDraft = useCallback((next: ValuationOverrides) => {
    if (!scope) {
      saveValuationAssumptions(companyId, scenarioId, next);
    } else if (sameAssumptions(next, latest?.assumptions ?? {})) {
      clearDraft(scope);
    } else {
      saveDraft(scope, { baseVersion, assumptions: next });
    }
  }, [scope, companyId, scenarioId, latest, baseVersion]);

  const update = useCallback((patch: Partial<ValuationOverrides>) => {
    setDraft((prev) => {
      const next = applyAssumptionPatch(prev, patch);
      writeDraft(next);
      return next;
    });
  }, [writeDraft]);

  const reset = useCallback(() => {
    setDraft({});
    writeDraft({});
  }, [writeDraft]);

  const dirty = mode === 'workspace' && !sameAssumptions(draft, latest?.assumptions ?? {});

  const saveVersion: ValuationPersistence['saveVersion'] = async (note, snapshot) => {
    if (!scope) return false;
    setStatus('saving');
    setError(null);
    try {
      const saved = await repo.saveVersion(scope, draft, baseVersion, note.trim() || null);
      setLatestByScenario((prev) => ({ ...prev, [scope.scenarioId]: saved }));
      clearDraft(scope);
      setConflict(false);
      try {
        await repo.recordRun(scope, saved.id, DCF_ENGINE_VERSION, snapshot.inputs, snapshot.valuation);
      } catch (e) {
        setError(`Version ${saved.version} was saved, but its result snapshot was not: ${e instanceof Error ? e.message : String(e)}`);
      }
      return true;
    } catch (e) {
      if (e instanceof repo.VersionConflictError) {
        setConflict(true);
        setError('Someone else saved a newer version while you were editing. Your changes are still here — reload the latest version to compare, or keep editing.');
      } else {
        setError(`Could not save: ${e instanceof Error ? e.message : String(e)}`);
      }
      return false;
    } finally {
      setStatus('ready');
    }
  };

  const persistence: ValuationPersistence = {
    mode,
    workspace,
    canSave: mode === 'workspace' && canEdit(workspace),
    status,
    error,
    conflict,
    dirty,
    latest,
    staleDraft,
    saveVersion,
    discardChanges: () => {
      if (scope) clearDraft(scope);
      setDraft(latest?.assumptions ?? {});
    },
    reloadLatest: () => {
      // Keep the user's edits as a draft based on the old version; the reload offers them back.
      setReloadToken((n) => n + 1);
    },
    useStaleDraft: () => {
      if (!staleDraft || !scope) return;
      setDraft(staleDraft.assumptions);
      saveDraft(scope, { baseVersion, assumptions: staleDraft.assumptions });
      setStaleDraft(null);
    },
    dismissStaleDraft: () => {
      if (scope) clearDraft(scope);
      setStaleDraft(null);
    },
    loadHistory: () => (scope ? repo.fetchHistory(scope) : Promise.resolve([])),
    // Loads an old version into the editor; saving it creates a new version, so history is never rewritten.
    restoreVersion: (v) => {
      setDraft(v.assumptions);
      writeDraft(v.assumptions);
    },
  };

  /** Assumptions per scenario for side-by-side comparison; the active scenario uses the working copy. */
  const byScenario = useMemo<Record<string, ValuationOverrides>>(() => {
    const out: Record<string, ValuationOverrides> = {};
    for (const id of scenarioIds) {
      out[id] = id === scenarioId ? draft : scope ? latestByScenario[id]?.assumptions ?? {} : loadValuationAssumptions(companyId, id);
    }
    return out;
  }, [scenarioKey, scenarioId, draft, scope, latestByScenario, companyId]);

  return { assumptions: draft, update, reset, persistence, byScenario };
}
