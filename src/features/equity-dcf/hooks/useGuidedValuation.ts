import { useMemo, useState } from 'react';
import { useModelContext } from '@/contexts/ModelContext';
import { SECTOR_BLUEPRINTS } from '@/engine/blueprints';
import { reviewAssumptions, type AssumptionReviewNote, type NumericAssumptionKey } from '../engine/assumptions';

export const GUIDED_STEPS = [
  { id: 'company', title: 'Company & date', question: 'What are we valuing, and as of when?' },
  { id: 'forecast', title: 'Future performance', question: 'How will the business perform?' },
  { id: 'return', title: 'Required return', question: 'What return do investors need?' },
  { id: 'longterm', title: 'After the forecast', question: 'What happens after the forecast years?' },
  { id: 'result', title: 'Result', question: 'What is the business worth?' },
] as const;

export type GuidedStepId = (typeof GUIDED_STEPS)[number]['id'];
export type StepStatus = 'ok' | 'attention';

/** UI orchestration for the guided valuation. All numbers come from the model run; nothing is recalculated here. */
export function useGuidedValuation() {
  const ctx = useModelContext();
  const { activeCompany, calculationRun, valuationAssumptions: assumptions } = ctx;
  const valuation = calculationRun.valuation;
  const [step, setStep] = useState<GuidedStepId>('company');

  const stepIndex = GUIDED_STEPS.findIndex((s) => s.id === step);
  const goTo = (id: GuidedStepId) => setStep(id);
  const next = () => setStep(GUIDED_STEPS[Math.min(stepIndex + 1, GUIDED_STEPS.length - 1)].id);
  const back = () => setStep(GUIDED_STEPS[Math.max(stepIndex - 1, 0)].id);

  /** Values the model is actually using for each field (override or model default). */
  const effective = useMemo<Partial<Record<NumericAssumptionKey, number>>>(() => ({
    riskFreeRate: valuation.waccInputs.riskFreeRate,
    equityBeta: valuation.waccInputs.equityBeta,
    equityRiskPremium: valuation.waccInputs.equityRiskPremium,
    preTaxCostOfDebt: valuation.waccInputs.preTaxCostOfDebt,
    targetDebtRatio: valuation.waccInputs.targetDebtRatio,
    directWacc: assumptions.directWacc,
    terminalGrowthRate: valuation.terminalGrowthRatePct,
    exitMultiple: valuation.exitMultipleEVtoEBITDA,
    leaseLiabilities: assumptions.leaseLiabilities,
    minorityInterest: assumptions.minorityInterest,
    preferredEquity: assumptions.preferredEquity,
    nonOperatingInvestments: assumptions.nonOperatingInvestments,
  }), [valuation, assumptions]);

  const waccMode = assumptions.waccMode ?? 'build_up';
  const terminalMethod = valuation.terminalValueMethod;

  const reviewNotes = useMemo(() => {
    const inUse: Partial<Record<NumericAssumptionKey, number>> =
      waccMode === 'direct'
        ? { directWacc: effective.directWacc }
        : {
            riskFreeRate: effective.riskFreeRate,
            equityBeta: effective.equityBeta,
            equityRiskPremium: effective.equityRiskPremium,
            preTaxCostOfDebt: effective.preTaxCostOfDebt,
            targetDebtRatio: effective.targetDebtRatio,
          };
    if (terminalMethod === 'gordon_growth') inUse.terminalGrowthRate = effective.terminalGrowthRate;
    else inUse.exitMultiple = effective.exitMultiple;
    return reviewAssumptions(inUse);
  }, [effective, waccMode, terminalMethod]);

  const noteFor = (key: NumericAssumptionKey): AssumptionReviewNote | undefined => reviewNotes.find((n) => n.key === key);

  const lastActual = calculationRun.periods.filter((p) => p.type === 'historical').at(-1);
  const firstForecast = calculationRun.periods.find((p) => p.type === 'forecast');
  const blueprint = SECTOR_BLUEPRINTS[activeCompany.sectorId] || SECTOR_BLUEPRINTS.general;

  const hasFailedCheck = valuation.dcfChecks.some((c) => c.status === 'fail');
  const stepStatus: Record<GuidedStepId, StepStatus> = {
    company: activeCompany.shareCount > 0 && (valuation.bridge?.notProvided.length ?? 0) === 0 ? 'ok' : 'attention',
    forecast: 'ok',
    return: reviewNotes.some((n) => ['riskFreeRate', 'equityBeta', 'equityRiskPremium', 'preTaxCostOfDebt', 'targetDebtRatio', 'directWacc'].includes(n.key)) ? 'attention' : 'ok',
    longterm: valuation.terminalShareOfEv > 0.75 || reviewNotes.some((n) => n.key === 'terminalGrowthRate' || n.key === 'exitMultiple') ? 'attention' : 'ok',
    result: valuation.dcfStatus === 'invalid' || hasFailedCheck ? 'attention' : 'ok',
  };

  return {
    ...ctx,
    valuation,
    assumptions,
    blueprint,
    step,
    stepIndex,
    goTo,
    next,
    back,
    effective,
    waccMode,
    terminalMethod,
    noteFor,
    stepStatus,
    lastActual,
    firstForecast,
  };
}

export type GuidedValuation = ReturnType<typeof useGuidedValuation>;
