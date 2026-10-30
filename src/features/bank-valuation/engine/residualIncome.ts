import type { ForecastRow } from '@/engine/bankForecast';
export type ResidualIncomeInputs={openingEquityMillions:number;sharesMillions:number;costOfEquityPct:number;terminalGrowthPct:number;payoutPct:number;forecast:ForecastRow[];marketPrice?:number;marketDate?:string};
export type ResidualIncomeYear={year:number;openingEquity:number;earnings:number;dividends:number;closingEquity:number;equityCharge:number;residualIncome:number;presentValue:number};
export type ResidualIncomeResult={years:ResidualIncomeYear[];openingEquity:number;forecastResidualPV:number;terminalResidualPV:number;terminalResidual:number;equityValueMillions:number;intrinsicPerShare:number;marketPrice?:number;upsidePct?:number;costOfEquityPct:number;terminalGrowthPct:number;payoutPct:number};
export function calculateResidualIncome(input:ResidualIncomeInputs):ResidualIncomeResult{
 const {openingEquityMillions,sharesMillions,costOfEquityPct,terminalGrowthPct,payoutPct,forecast}=input;
 if(!Number.isFinite(openingEquityMillions)||openingEquityMillions<=0)throw Error('Verified opening equity must be positive.');
 if(!Number.isFinite(sharesMillions)||sharesMillions<=0)throw Error('Verified shares outstanding must be positive.');
 if(!Number.isFinite(costOfEquityPct)||costOfEquityPct<=0)throw Error('Cost of equity must be greater than zero.');
 if(!Number.isFinite(terminalGrowthPct)||terminalGrowthPct<0||terminalGrowthPct>=costOfEquityPct)throw Error('Terminal growth must be non-negative and below cost of equity.');
 if(!Number.isFinite(payoutPct)||payoutPct<0||payoutPct>100)throw Error('Dividend payout must be between 0% and 100%.');
 if(!forecast.length||forecast.some(row=>!Number.isFinite(row.afterTax)))throw Error('A valid forecast is required.');
 const r=costOfEquityPct/100,g=terminalGrowthPct/100,payout=payoutPct/100;
 let equity=openingEquityMillions;
 const years=forecast.map((row,i)=>{const openingEquity=equity,earnings=row.afterTax,dividends=Math.max(0,earnings)*payout;equity=openingEquity+earnings-dividends;const equityCharge=openingEquity*r,residualIncome=earnings-equityCharge,presentValue=residualIncome/Math.pow(1+r,i+1);return {year:row.year,openingEquity,earnings,dividends,closingEquity:equity,equityCharge,residualIncome,presentValue};});
 const last=years[years.length-1];
 // Terminal normalized earnings are projected using terminal ROE implied by the final forecast year.
 // This maintains clean-surplus consistency and avoids treating growing residual income as a perpetuity without equity roll-forward.
 const terminalRoe=last.closingEquity>0?last.earnings/last.closingEquity:NaN;
 if(!Number.isFinite(terminalRoe))throw Error('Terminal equity must remain positive.');
 const terminalEarnings=last.closingEquity*terminalRoe*(1+g);
 const terminalResidual=terminalEarnings-r*last.closingEquity;
 const terminalResidualPV=(terminalResidual/(r-g))/Math.pow(1+r,years.length);
 const forecastResidualPV=years.reduce((sum,y)=>sum+y.presentValue,0);
 const equityValueMillions=openingEquityMillions+forecastResidualPV+terminalResidualPV;
 const intrinsicPerShare=equityValueMillions/sharesMillions;
 const marketPrice=input.marketPrice&&input.marketPrice>0?input.marketPrice:undefined;
 return {years,openingEquity:openingEquityMillions,forecastResidualPV,terminalResidualPV,terminalResidual,equityValueMillions,intrinsicPerShare,marketPrice,upsidePct:marketPrice?100*(intrinsicPerShare/marketPrice-1):undefined,costOfEquityPct,terminalGrowthPct,payoutPct};
}
export function residualSensitivity(input:ResidualIncomeInputs,costShift:number,growthShift:number){try{return calculateResidualIncome({...input,costOfEquityPct:input.costOfEquityPct+costShift,terminalGrowthPct:input.terminalGrowthPct+growthShift}).intrinsicPerShare}catch{return undefined}}
