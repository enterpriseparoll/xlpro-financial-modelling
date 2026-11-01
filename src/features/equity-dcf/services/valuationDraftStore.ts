import type { ValuationOverrides } from '@/types/finance';
import { sanitizeValuationAssumptions } from '../engine/assumptions';
import type { AssumptionScope } from './valuationAssumptionsRepository';

/**
 * Unsaved edits to workspace assumptions, kept in this browser so a refresh does not lose work.
 * A draft records the version it was based on, so a newer server version is never silently overwritten.
 */
export interface ValuationDraft {
  baseVersion: number;
  assumptions: ValuationOverrides;
}

const key = (s: AssumptionScope) => `xlpro:valuation-draft:v1:${s.tenantId}:${s.companyKey}:${s.scenarioId}`;

export function loadDraft(scope: AssumptionScope): ValuationDraft | null {
  try {
    const raw = JSON.parse(localStorage.getItem(key(scope)) ?? 'null') as { baseVersion?: unknown; assumptions?: unknown } | null;
    if (!raw || typeof raw.baseVersion !== 'number' || !Number.isInteger(raw.baseVersion) || raw.baseVersion < 0) return null;
    return { baseVersion: raw.baseVersion, assumptions: sanitizeValuationAssumptions(raw.assumptions) };
  } catch {
    return null;
  }
}

export function saveDraft(scope: AssumptionScope, draft: ValuationDraft) {
  try { localStorage.setItem(key(scope), JSON.stringify(draft)); } catch { /* draft is a convenience only */ }
}

export function clearDraft(scope: AssumptionScope) {
  try { localStorage.removeItem(key(scope)); } catch { /* ignore */ }
}
