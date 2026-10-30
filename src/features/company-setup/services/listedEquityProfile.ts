export type ListedEquityProfile={sharesMillions?:number;marketPrice?:number;priceAsOf?:string;terminalGrowthPct?:number;exchange?:string};
const key=(id:string)=>'xlpro:listed-equity:v1:'+id;
export function readListedEquity(id:string):ListedEquityProfile {try{return JSON.parse(localStorage.getItem(key(id))||'{}') as ListedEquityProfile;}catch{return {};}}
export function saveListedEquity(id:string,profile:ListedEquityProfile){localStorage.setItem(key(id),JSON.stringify(profile));}
