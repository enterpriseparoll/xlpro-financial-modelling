import type { BalanceSheetRow, CashFlowStatementRow, ValidationCheck } from '@/types/finance';
import { checkStatementIntegrity } from './modelIntegrity';

/**
 * Adapter between the financial engine's native statements and independent
 * accounting integrity checks. Call this from runValidationChecks.
 */
export function financialStatementIntegrityChecks(
  balanceSheets: readonly BalanceSheetRow[],
  cashFlowStatements: readonly CashFlowStatementRow[],
): ValidationCheck[] {
  const cashByPeriod = new Map(cashFlowStatements.map(row => [row.period.year, row]));
  const snapshots = balanceSheets.flatMap(bs => {
    const cfs = cashByPeriod.get(bs.period.year);
    if (!cfs) return [];
    return [{
      period: bs.period.periodLabel,
      assets: bs.totalAssets,
      liabilities: bs.totalLiabilities,
      equity: bs.totalEquity,
      beginningCash: cfs.beginningCash,
      endingCash: cfs.endingCash,
      netChangeInCash: cfs.netChangeInCash,
      netIncome: cfs.netIncome,
      operatingCashFlow: cfs.cashFromOperations,
      investingCashFlow: cfs.cashFromInvesting,
      financingCashFlow: cfs.cashFromFinancing,
    }];
  });

  const issues = checkStatementIntegrity(snapshots);
  return issues.map((issue, index) => ({
    id: `integrity-${index}-${issue.code}`,
    category: issue.code === 'BALANCE_SHEET_MISMATCH' ? 'balance_sheet' : 'cash_reconciliation',
    title: issue.code.replaceAll('_', ' '),
    description: issue.message,
    status: issue.severity === 'error' ? 'fail' : 'warning',
    detail: issue.difference === undefined
      ? issue.message
      : `${issue.message} Difference: ${issue.difference.toFixed(4)}M.`,
  }));
}
