import type { DcfInputs, DcfResult } from '../types';
import { bridgeToEquity } from './bridge';
import { runDcfChecks } from './checks';
import { DcfInputError, requireRange } from './errors';
import { buildFcffSchedule } from './fcff';
import { calculateTerminalValue } from './terminalValue';
import { calculateWacc } from './wacc';

export const DCF_ENGINE_VERSION = 'equity-dcf@1.0.0';

/** Deterministic FCFF DCF. Throws `DcfInputError` for invalid inputs. */
export function runDcf(inputs: DcfInputs): DcfResult {
  requireRange(inputs.taxRate, 'Tax rate', 0, 1);
  const wacc = calculateWacc(inputs.wacc);
  const rows = buildFcffSchedule(inputs.periods, inputs.taxRate, wacc.wacc, inputs.timing);
  const terminal = calculateTerminalValue(inputs.terminal, rows, inputs.periods, wacc.wacc, inputs.timing);

  const sumPvFcff = rows.reduce((sum, r) => sum + r.presentValue, 0);
  const enterpriseValue = sumPvFcff + terminal.presentValue;
  const bridge = bridgeToEquity(enterpriseValue, inputs.bridge);

  const shares = inputs.bridge.dilutedShares;
  if (shares !== undefined && !Number.isFinite(shares)) throw new DcfInputError('Diluted shares must be a finite number.');
  const dilutedShares = shares !== undefined && shares > 0 ? shares : null;
  const valuePerShare = dilutedShares ? bridge.equityValue / dilutedShares : null;
  const marketPrice = inputs.marketPrice !== undefined && inputs.marketPrice > 0 ? inputs.marketPrice : null;
  const upside = valuePerShare !== null && marketPrice !== null ? valuePerShare / marketPrice - 1 : null;
  const terminalShareOfEv = enterpriseValue > 0 ? terminal.presentValue / enterpriseValue : NaN;

  const result = {
    engineVersion: DCF_ENGINE_VERSION,
    moneyUnit: inputs.moneyUnit,
    timing: inputs.timing,
    wacc,
    rows,
    sumPvFcff,
    terminal,
    enterpriseValue,
    bridge,
    dilutedShares,
    valuePerShare,
    marketPrice,
    upside,
    terminalShareOfEv,
  };
  return { ...result, checks: runDcfChecks(result) };
}
