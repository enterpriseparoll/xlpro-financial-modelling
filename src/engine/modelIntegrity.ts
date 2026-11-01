/**
 * Financial integrity checks shared by forecasting, import review and reporting.
 * Pure functions: no UI dependencies, no hidden balancing plugs.
 */
export type IntegritySeverity = 'error' | 'warning';
export interface IntegrityIssue {
  code: string;
  severity: IntegritySeverity;
  message: string;
  period?: string;
  difference?: number;
}

export interface StatementSnapshot {
  period: string;
  assets: number;
  liabilities: number;
  equity: number;
  beginningCash: number;
  endingCash: number;
  netChangeInCash: number;
  netIncome: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
}

const finite = (value: number): boolean => Number.isFinite(value);

/** Use an absolute tolerance because model amounts are denominated in millions. */
export function checkStatementIntegrity(
  snapshots: readonly StatementSnapshot[],
  tolerance = 0.0001,
): IntegrityIssue[] {
  if (!finite(tolerance) || tolerance < 0) {
    throw new RangeError('Tolerance must be a non-negative finite number.');
  }
  const issues: IntegrityIssue[] = [];
  for (const row of snapshots) {
    const values = Object.entries(row).filter(([key]) => key !== 'period');
    for (const [key, value] of values) {
      if (!finite(value as number)) {
        issues.push({
          code: 'NON_FINITE_VALUE',
          severity: 'error',
          period: row.period,
          message: `${row.period}: ${key} is not a finite number.`,
        });
      }
    }
    if (values.some(([, value]) => !finite(value as number))) continue;

    const balanceDifference = row.assets - row.liabilities - row.equity;
    if (Math.abs(balanceDifference) > tolerance) {
      issues.push({
        code: 'BALANCE_SHEET_MISMATCH',
        severity: 'error',
        period: row.period,
        difference: balanceDifference,
        message: `${row.period}: assets do not equal liabilities plus equity.`,
      });
    }

    const cashMovementDifference =
      row.endingCash - row.beginningCash - row.netChangeInCash;
    if (Math.abs(cashMovementDifference) > tolerance) {
      issues.push({
        code: 'CASH_ROLL_FORWARD_MISMATCH',
        severity: 'error',
        period: row.period,
        difference: cashMovementDifference,
        message: `${row.period}: ending cash does not reconcile to opening cash and net movement.`,
      });
    }

    const cashFlowDifference =
      row.netChangeInCash -
      (row.operatingCashFlow + row.investingCashFlow + row.financingCashFlow);
    if (Math.abs(cashFlowDifference) > tolerance) {
      issues.push({
        code: 'CASH_FLOW_COMPONENTS_MISMATCH',
        severity: 'error',
        period: row.period,
        difference: cashFlowDifference,
        message: `${row.period}: operating, investing and financing cash flows do not sum to net movement.`,
      });
    }

    if (row.endingCash < -tolerance) {
      issues.push({
        code: 'NEGATIVE_CASH',
        severity: 'warning',
        period: row.period,
        message: `${row.period}: projected cash is negative; financing may be required.`,
      });
    }
  }
  return issues;
}

export function modelIntegritySummary(issues: readonly IntegrityIssue[]) {
  const errors = issues.filter(issue => issue.severity === 'error').length;
  const warnings = issues.filter(issue => issue.severity === 'warning').length;
  return { status: errors > 0 ? 'failed' : warnings > 0 ? 'warning' : 'passed', errors, warnings } as const;
}
