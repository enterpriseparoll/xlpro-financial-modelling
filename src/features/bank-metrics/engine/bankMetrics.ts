import type { BankValidatedPeriod } from '@/engine/bankHistoricalActivation';
import type { MarketRecord } from '@/features/market-data/engine/gseWorkbookParser';
export type MetricKey='roa'|'roe'|'costIncome'|'loanDeposit'|'nim'|'eps'|'pe'|'pb'|'dividendYield'|'payout';
export type MetricResult={key:MetricKey;label:string;value?:number;unit:'%'|'GHS'|'x';source:string;warning?:string};
export type BankMetricInput={periods:BankValidatedPeriod[];market?:MarketRecord;marketDate?:string;sharesMillions?:number;price?:number;dividendPerShare?:number};
const valid=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
const divide=(a?:number,b?:number)=>valid(a)&&valid(b)&&b!==0?a/b:undefined;
const mean=(a?:number,b?:number)=>valid(a)&&valid(b)?(a+b)/2:undefined;
export function calculateBankMetrics(input:BankMetricInput):MetricResult[]{
 const years=[...input.periods].sort((a,b)=>b.year-a.year);
 const current=years[0],prior=years.find(p=>p.year===current?.year-1);
 const c=current?.accounts??{},p=prior?.accounts??{};
 const equity=c.total_equity??c.total_shareholders_equity;
 const oldEquity=p.total_equity??p.total_shareholders_equity;
 const assets=c.total_assets,oldAssets=p.total_assets;
 const loans=c.loans_and_advances,deposits=c.customer_deposits;
 const shares=input.sharesMillions??input.market?.sharesMillions;
 const price=input.price??input.market?.price;
 const dividend=input.dividendPerShare??input.market?.dividendPerShare;
 const income=c.net_profit;
 const eps=divide(income,valid(shares)?shares*1_000_000:undefined);
 const bvps=divide(equity,valid(shares)?shares*1_000_000:undefined);
 const operatingIncome=c.operating_income;
 const expenses=c.total_operating_expenses;
 const mismatch=!!(current&&input.marketDate&&Number(input.marketDate.slice(0,4))!==current.year);
 const warning=mismatch?'Market observation '+input.marketDate+' differs from FY'+current.year+' financials; illustrative comparison only.':undefined;
 const metric=(key:MetricKey,label:string,value:number|undefined,unit:'%'|'GHS'|'x',source:string,marketSensitive=false):MetricResult=>({key,label,value:valid(value)?value:undefined,unit,source,warning:marketSensitive?warning:undefined});
 // NIM requires average interest-earning assets, not average total assets.
 return [
 metric('roa','Return on assets',divide(income,mean(assets,oldAssets))!==undefined?divide(income,mean(assets,oldAssets))!*100:undefined,'%','Net profit / average assets (two consecutive balance sheets)'),
 metric('roe','Return on equity',divide(income,mean(equity,oldEquity))!==undefined?divide(income,mean(equity,oldEquity))!*100:undefined,'%','Net profit / average equity (two consecutive balance sheets)'),
 metric('costIncome','Cost-to-income',divide(expenses,operatingIncome)!==undefined?Math.abs(divide(expenses,operatingIncome)!)*100:undefined,'%','Absolute operating expenses / operating income'),
 metric('loanDeposit','Loan-to-deposit',divide(loans,deposits)!==undefined?divide(loans,deposits)!*100:undefined,'%','Customer loans / customer deposits'),
 metric('nim','Net interest margin',undefined,'%','Requires average interest-earning assets; total assets cannot substitute'),
 metric('eps','Earnings per share',eps,'GHS','Reported net profit / shares outstanding; verify share-count period'),
 metric('pe','Price / earnings',divide(price,eps),'x','Market price / reported EPS',true),
 metric('pb','Price / book',divide(price,bvps),'x','Market price / reported book value per share',true),
 metric('dividendYield','Dividend yield',divide(dividend,price)!==undefined?divide(dividend,price)!*100:undefined,'%','Reported dividend per share / market price',true),
 metric('payout','Dividend payout',divide(dividend,eps)!==undefined?divide(dividend,eps)!*100:undefined,'%','Reported dividend per share / reported EPS',true),
 ];
}
