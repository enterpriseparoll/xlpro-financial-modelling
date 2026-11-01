import type { ValuationOverrides } from '@/types/finance';
import { sanitizeValuationAssumptions } from '../engine/assumptions';

/**
 * PROTOTYPE persistence: valuation assumptions live in this browser's localStorage only, scoped by
 * company AND scenario. This is not secure or shared storage; server persistence (Supabase, RLS,
 * versioned assumption sets) is Phase 3.
 */
const key = (companyId: string, scenarioId: string) => `xlpro:valuation-assumptions:v1:${companyId}:${scenarioId}`;

export function loadValuationAssumptions(companyId: string, scenarioId: string): ValuationOverrides {
  try {
    return sanitizeValuationAssumptions(JSON.parse(localStorage.getItem(key(companyId, scenarioId)) ?? '{}'));
  } catch {
    return {};
  }
}

export function saveValuationAssumptions(companyId: string, scenarioId: string, assumptions: ValuationOverrides): boolean {
  try {
    if (Object.keys(assumptions).length === 0) localStorage.removeItem(key(companyId, scenarioId));
    else localStorage.setItem(key(companyId, scenarioId), JSON.stringify(assumptions));
    return true;
  } catch {
    return false;
  }
}
