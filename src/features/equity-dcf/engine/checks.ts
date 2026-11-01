import type { DcfCheck, DcfResult } from '../types';

const BRIDGE_LABELS: Record<string, string> = {
  cash: 'cash',
  nonOperatingInvestments: 'non-operating investments',
  debt: 'debt',
  leaseLiabilities: 'lease liabilities',
  minorityInterest: 'minority interest',
  preferredEquity: 'preferred equity',
};

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/** Plain-language reasonableness checks. They never change the numbers. */
export function runDcfChecks(r: Omit<DcfResult, 'checks'>): DcfCheck[] {
  const checks: DcfCheck[] = [];

  if (r.terminal.method === 'gordon_growth' && r.terminal.growthRate !== undefined) {
    const spread = r.wacc.wacc - r.terminal.growthRate;
    checks.push({
      id: 'dcf-wacc-growth-spread',
      status: spread < 0.01 ? 'warning' : 'pass',
      title: 'Required return vs long-term growth',
      detail:
        spread < 0.01
          ? `WACC is only ${pct(spread)} above long-term growth; small changes will swing the value sharply.`
          : `WACC exceeds long-term growth by ${pct(spread)}.`,
    });
    if (r.terminal.growthRate > 0.04) {
      checks.push({
        id: 'dcf-terminal-growth-high',
        status: 'warning',
        title: 'Long-term growth is high',
        detail: `Long-term growth of ${pct(r.terminal.growthRate)} assumes the business outgrows most economies forever.`,
      });
    }
    if (r.terminal.value <= 0) {
      checks.push({
        id: 'dcf-terminal-negative',
        status: 'fail',
        title: 'Final-year cash flow is negative',
        detail: 'The long-term value is negative because the last forecast year burns cash. Extend the forecast or revisit margins and investment.',
      });
    }
  }

  if (r.enterpriseValue <= 0) {
    checks.push({ id: 'dcf-ev-nonpositive', status: 'fail', title: 'Enterprise value is not positive', detail: 'Forecast cash flows do not support a positive business value.' });
  } else {
    checks.push({
      id: 'dcf-terminal-share',
      status: r.terminalShareOfEv > 0.75 ? 'warning' : 'pass',
      title: 'Reliance on long-term value',
      detail: `${pct(r.terminalShareOfEv)} of enterprise value comes from beyond the forecast period.${r.terminalShareOfEv > 0.75 ? ' The result depends mostly on long-term assumptions.' : ''}`,
    });
  }

  if (r.bridge.notProvided.length) {
    checks.push({
      id: 'dcf-bridge-incomplete',
      status: 'warning',
      title: 'Some balance-sheet items were not provided',
      detail: `Not included in the equity bridge: ${r.bridge.notProvided.map((k) => BRIDGE_LABELS[k]).join(', ')}.`,
    });
  }

  if (r.valuePerShare === null) {
    checks.push({ id: 'dcf-shares-missing', status: 'warning', title: 'Share count not set', detail: 'Value per share cannot be shown until diluted shares outstanding are entered.' });
  }

  if (r.bridge.equityValue <= 0) {
    checks.push({ id: 'dcf-equity-nonpositive', status: 'warning', title: 'Equity value is not positive', detail: 'Debt and other claims exceed the business value.' });
  }

  return checks;
}
