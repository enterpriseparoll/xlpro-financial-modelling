import type { DcfInputs, DcfSensitivity } from '../types';
import { calculateWacc } from './wacc';
import { runDcf } from './runDcf';

export interface SensitivityOptions {
  /** Offsets added to base WACC, as decimals. */
  waccSteps?: number[];
  /** Offsets added to base growth (decimals) or base exit multiple (turns). */
  secondAxisSteps?: number[];
}

const round = (x: number, dp: number) => Number(x.toFixed(dp));

/**
 * Full recalculation for every cell — no shortcuts — so each cell equals what `runDcf` would return for
 * that WACC and growth/multiple. Invalid combinations (growth ≥ WACC, WACC ≤ 0) are null, not clamped.
 */
export function buildSensitivity(inputs: DcfInputs, options: SensitivityOptions = {}): DcfSensitivity {
  const base = runDcf(inputs);
  const baseWacc = calculateWacc(inputs.wacc).wacc;
  const waccSteps = options.waccSteps ?? [-0.015, -0.0075, 0, 0.0075, 0.015];
  const isGordon = inputs.terminal.method === 'gordon_growth';
  const secondSteps = options.secondAxisSteps ?? (isGordon ? [-0.01, -0.005, 0, 0.005, 0.01] : [-2, -1, 0, 1, 2]);
  const baseSecond = inputs.terminal.method === 'gordon_growth' ? inputs.terminal.growthRate : inputs.terminal.evToEbitda;

  const waccValues = waccSteps.map((s) => round(baseWacc + s, 6));
  const secondAxisValues = secondSteps.map((s) => round(baseSecond + s, 6));
  const metric = base.valuePerShare !== null ? 'value_per_share' : 'equity_value';

  const cells = waccValues.map((w) =>
    secondAxisValues.map((x) => {
      if (!(w > 0)) return null;
      try {
        const r = runDcf({
          ...inputs,
          wacc: { mode: 'direct', wacc: w },
          terminal: isGordon ? { method: 'gordon_growth', growthRate: x } : { method: 'exit_multiple', evToEbitda: x },
        });
        return metric === 'value_per_share' ? r.valuePerShare : r.bridge.equityValue;
      } catch {
        return null;
      }
    }),
  );

  return { metric, waccValues, secondAxis: isGordon ? 'terminal_growth' : 'exit_multiple', secondAxisValues, cells };
}
