import type { BridgeInput, BridgeItemKey, BridgeResult } from '../types';
import { DcfInputError } from './errors';

const ITEMS: BridgeItemKey[] = ['cash', 'nonOperatingInvestments', 'debt', 'leaseLiabilities', 'minorityInterest', 'preferredEquity'];

/**
 * Equity value = EV + cash + non-operating investments − debt − leases − minorities − preferred.
 * Items not provided contribute nothing and are listed in `notProvided` so the UI can flag them.
 */
export function bridgeToEquity(enterpriseValue: number, input: BridgeInput): BridgeResult {
  const notProvided: BridgeItemKey[] = [];
  const v: Record<BridgeItemKey, number> = {} as Record<BridgeItemKey, number>;
  for (const key of ITEMS) {
    const raw = input[key];
    if (raw === undefined) {
      notProvided.push(key);
      v[key] = 0;
    } else if (!Number.isFinite(raw) || raw < 0) {
      throw new DcfInputError(`Bridge item "${key}" must be zero or a positive number.`);
    } else {
      v[key] = raw;
    }
  }
  const netDebt = v.debt + v.leaseLiabilities - v.cash;
  const equityValue =
    enterpriseValue + v.cash + v.nonOperatingInvestments - v.debt - v.leaseLiabilities - v.minorityInterest - v.preferredEquity;
  return { enterpriseValue, ...v, netDebt, equityValue, notProvided };
}
