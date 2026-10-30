import { useState } from 'react';
import { useModelContext } from '@/contexts/ModelContext';
import { readBankActivation } from '@/engine/bankHistoricalActivation';
import { readListedEquity } from '@/features/company-setup/services/listedEquityProfile';
import { readBankEquityAssumptions } from '@/features/company-setup/services/bankEquityAssumptions';
import { getBankForecastSource } from '@/features/bank-scenarios/services/forecastSource';
import { BankValuationWorkspace } from './BankValuationWorkspace';
import { ResidualIncomePanel } from './ResidualIncomePanel';
export function BankIntegratedValuation({onNavigateTab}:{onNavigateTab?:(tabId:string,subTabId?:string)=>void}){
 const {activeCompany}=useModelContext();
 const activated=readBankActivation(activeCompany.id),latest=activated?.periods.slice().sort((a,b)=>b.year-a.year)[0];
 const listed=readListedEquity(activeCompany.id),setup=readBankEquityAssumptions(activeCompany.id),forecast=getBankForecastSource(activeCompany.id);
 const [payout,setPayout]=useState(()=>{const v=localStorage.getItem('xlpro:bank-payout:v1:'+activeCompany.id);return v===null?50:Number(v)});
 const equity=latest?.accounts.total_equity??setup.verifiedEquity;
 const shares=listed.sharesMillions??setup.verifiedSharesMillions;
 const inputs=equity&&equity>0&&shares&&shares>0&&setup.costOfEquity&&forecast.data?{openingEquityMillions:equity/1_000_000,sharesMillions:shares,costOfEquityPct:setup.costOfEquity,terminalGrowthPct:listed.terminalGrowthPct??setup.terminalGrowth??0,payoutPct:payout,forecast:forecast.data.rows,marketPrice:listed.marketPrice,marketDate:listed.priceAsOf}:null;
 return <div><div className="mx-auto max-w-7xl px-5 pt-7"><div className="mb-4 rounded-xl border border-border bg-card p-5"><label htmlFor="bank-dividend-payout" className="text-sm font-semibold">Forecast dividend payout assumption (%)</label><p className="my-2 text-xs text-muted-foreground">Forward-looking assumption used to project retained equity; initial 50% is illustrative and editable, not a reported actual.</p><input id="bank-dividend-payout" type="number" min="0" max="100" value={payout} onChange={e=>{const n=Number(e.target.value);setPayout(n);if(n>=0&&n<=100)localStorage.setItem('xlpro:bank-payout:v1:'+activeCompany.id,String(n))}} className="w-28 rounded-lg border border-border bg-background p-2"/></div><ResidualIncomePanel inputs={inputs} marketDate={listed.priceAsOf}/></div><BankValuationWorkspace onNavigateTab={onNavigateTab}/></div>;
}
