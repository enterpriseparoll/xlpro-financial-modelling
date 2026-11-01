export type BankEquityAssumptions={costOfEquity?:number;sustainableRoe?:number;nextDividend?:number;peerPB?:number;verifiedEquity?:number;verifiedSharesMillions?:number;terminalGrowth?:number};
const key=(id:string)=>'xlpro:bank-equity-setup:v1:'+id;
export function readBankEquityAssumptions(id:string):BankEquityAssumptions{try{return JSON.parse(localStorage.getItem(key(id))||'{}') as BankEquityAssumptions}catch{return {}}}
export function saveBankEquityAssumptions(id:string,value:BankEquityAssumptions){localStorage.setItem(key(id),JSON.stringify(value))}
