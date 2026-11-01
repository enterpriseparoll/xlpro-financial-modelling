import type { ValuationOverrides } from '@/types/finance';
import { supabase } from '@/lib/supabase/client';
import { sanitizeValuationAssumptions } from '../engine/assumptions';
import { buildRunOutputs, canonicalJson, type RunInputs } from '../engine/runSnapshot';
import type { ValuationOutput } from '@/types/finance';

/**
 * Workspace (Supabase) storage for valuation assumptions. Every save is a new immutable version;
 * the database rejects a save whose expected version is not the latest (see the migration).
 */

export interface AssumptionScope {
  tenantId: string;
  companyKey: string;
  scenarioId: string;
}

export interface AssumptionVersion {
  id: string;
  version: number;
  assumptions: ValuationOverrides;
  note: string | null;
  createdAt: string;
  createdBy: string;
}

export class VersionConflictError extends Error {
  constructor(message = 'Someone else saved a newer version while you were editing.') {
    super(message);
    this.name = 'VersionConflictError';
  }
}

/** Maps a database row; returns null for anything malformed. Assumptions are re-sanitised on read. */
export function rowToVersion(row: unknown): AssumptionVersion | null {
  const r = row as Record<string, unknown> | null;
  if (!r || typeof r.id !== 'string' || typeof r.version !== 'number' || typeof r.created_at !== 'string' || typeof r.created_by !== 'string') {
    return null;
  }
  return {
    id: r.id,
    version: r.version,
    assumptions: sanitizeValuationAssumptions(r.assumptions),
    note: typeof r.note === 'string' ? r.note : null,
    createdAt: r.created_at,
    createdBy: r.created_by,
  };
}

function db() {
  if (!supabase) throw new Error('Workspace storage is not configured.');
  return supabase;
}

const COLUMNS = 'id, version, assumptions, note, created_at, created_by, scenario_id';

export async function fetchLatestByScenario(tenantId: string, companyKey: string, scenarioIds: string[]): Promise<Record<string, AssumptionVersion | null>> {
  const results = await Promise.all(
    scenarioIds.map(async (scenarioId) => {
      const { data, error } = await db()
        .from('valuation_assumption_sets')
        .select(COLUMNS)
        .eq('tenant_id', tenantId)
        .eq('company_key', companyKey)
        .eq('scenario_id', scenarioId)
        .order('version', { ascending: false })
        .limit(1);
      if (error) throw error;
      return [scenarioId, rowToVersion(data?.[0] ?? null)] as const;
    }),
  );
  return Object.fromEntries(results);
}

export async function fetchHistory(scope: AssumptionScope, limit = 50): Promise<AssumptionVersion[]> {
  const { data, error } = await db()
    .from('valuation_assumption_sets')
    .select(COLUMNS)
    .eq('tenant_id', scope.tenantId)
    .eq('company_key', scope.companyKey)
    .eq('scenario_id', scope.scenarioId)
    .order('version', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(rowToVersion).filter((v): v is AssumptionVersion => v !== null);
}

export async function saveVersion(
  scope: AssumptionScope,
  assumptions: ValuationOverrides,
  expectedVersion: number,
  note: string | null,
): Promise<AssumptionVersion> {
  const { data, error } = await db().rpc('save_valuation_assumptions', {
    p_tenant: scope.tenantId,
    p_company_key: scope.companyKey,
    p_scenario_id: scope.scenarioId,
    p_assumptions: sanitizeValuationAssumptions(assumptions),
    p_expected_version: expectedVersion,
    p_note: note,
  });
  if (error) {
    if (error.code === '40001') throw new VersionConflictError();
    throw error;
  }
  const saved = rowToVersion(data);
  if (!saved) throw new Error('The saved version could not be read back.');
  return saved;
}

export async function sha256Hex(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Stores an immutable snapshot of the outputs produced by a saved assumption version. */
export async function recordRun(scope: AssumptionScope, assumptionSetId: string, engineVersion: string, inputs: RunInputs, valuation: ValuationOutput) {
  const { error } = await db().from('valuation_runs').insert({
    tenant_id: scope.tenantId,
    company_key: scope.companyKey,
    scenario_id: scope.scenarioId,
    assumption_set_id: assumptionSetId,
    engine_version: engineVersion,
    input_hash: await sha256Hex(canonicalJson(inputs)),
    outputs: buildRunOutputs(valuation),
  });
  if (error) throw error;
}
