/** Bank canonical taxonomy. Subtotals are tagged to prevent double counting. */
export const BANK_CANONICAL = [
  ['interest_income','Interest income','income','detail'],
  ['interest_expense','Interest expense','income','detail'],
  ['net_interest_income','Net interest income','income','subtotal'],
  ['fee_income','Fee and commission income','income','detail'],
  ['fee_expense','Fee and commission expense','income','detail'],
  ['net_fee_income','Net fee and commission income','income','subtotal'],
  ['trading_income','Net trading income','income','detail'],
  ['fvtpl_gain_loss','FVTPL gains and losses','income','detail'],
  ['lease_modification_gain','Lease modification gain','income','detail'],
  ['other_operating_income','Other operating income','income','detail'],
  ['operating_income','Operating income','income','subtotal'],
  ['personnel_expenses','Personnel expenses','income','detail'],
  ['depreciation_amortization','Depreciation and amortisation','income','detail'],
  ['impairment_losses','Credit impairment losses','income','detail'],
  ['impairment_investment_securities','Impairment on investment securities','income','detail'],
  ['impairment_loans_advances','Impairment on loans and advances','income','detail'],
  ['impairment_leases','Lease impairment','income','detail'],
  ['total_impairment','Total impairment reversal/(charge)','income','subtotal'],
  ['operating_income_after_impairment','Operating income net of impairment','income','subtotal'],
  ['depreciation','Depreciation','income','detail'],
  ['other_operating_expenses','Other operating expenses','income','detail'],
  ['total_operating_expenses','Total operating expenses','income','subtotal'],
  ['profit_before_tax','Profit before tax','income','subtotal'],
  ['income_tax','Income tax expense','income','detail'],
  ['net_profit','Net profit/loss for the year','income','subtotal'],
  ['cash_and_central_bank','Cash and balances with central bank','balance','detail'],
  ['loans_and_advances','Loans and advances to customers','balance','detail'],
  ['investment_securities','Investment securities','balance','detail'],
  ['total_assets','Total assets','balance','subtotal'],
  ['customer_deposits','Customer deposits','balance','detail'],
  ['borrowings','Borrowings','balance','detail'],
  ['total_liabilities','Total liabilities','balance','subtotal'],
  ['total_equity','Total equity','balance','subtotal'],
  ['operating_cash_flow','Net cash from operating activities','cashflow','subtotal'],
  ['investing_cash_flow','Net cash from investing activities','cashflow','subtotal'],
  ['financing_cash_flow','Net cash from financing activities','cashflow','subtotal'],
  ['dividends_paid','Dividends paid','cashflow','detail'],
] as const;
export type BankCanonical = typeof BANK_CANONICAL[number][0];
export type BankMapping = { canonical: BankCanonical | ''; confidence: number; source: 'exact' | 'alias' | 'fuzzy' | 'manual' | 'unmapped'; needsReview: boolean };
const norm = (s: string) => s.toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const aliases: Record<string,BankCanonical> = {
  'interest income calculated using the effective interest method':'interest_income',
  'interest expense calculated using the effective interest method':'interest_expense',
  'interest income':'interest_income', 'interest expense':'interest_expense',
  'net interest income':'net_interest_income',
  'fee and commission income':'fee_income','fee and commission expense':'fee_expense',
  'net fee and commission income':'net_fee_income',
  'net trading income':'trading_income',
  'net gain loss from other financial instruments carried at fvtpl':'fvtpl_gain_loss',
  'lease modification gain':'lease_modification_gain',
  'other income':'other_operating_income','other operating income':'other_operating_income',
  'operating income':'operating_income',
  'personnel expenses':'personnel_expenses','staff costs':'personnel_expenses',
  'depreciation and amortisation':'depreciation_amortization','depreciation and amortization':'depreciation_amortization',
  'impairment charge reversal on investment securities':'impairment_investment_securities',
  'impairment reversal charge on loans and advances':'impairment_loans_advances',
  'lease impairment reversal charge':'impairment_leases',
  'total impairment reversal charge':'total_impairment',
  'operating income net of impairment charges':'operating_income_after_impairment',
  'depreciation':'depreciation',
  'impairment losses on financial assets':'impairment_losses','credit impairment losses':'impairment_losses',
  'other operating expenses':'other_operating_expenses','total operating expenses':'total_operating_expenses',
  'profit before tax':'profit_before_tax','profit before income tax':'profit_before_tax',
  'income tax expense':'income_tax','taxation':'income_tax',
  'net profit loss for the year':'net_profit','profit for the year':'net_profit',
  'profit after tax':'net_profit','profit loss for the year':'net_profit',
  'cash and balances with central bank':'cash_and_central_bank',
  'loans and advances to customers':'loans_and_advances','investment securities':'investment_securities',
  'total assets':'total_assets','customer deposits':'customer_deposits','deposits from customers':'customer_deposits',
  'borrowings':'borrowings','total liabilities':'total_liabilities','total equity':'total_equity',
  'net cash from operating activities':'operating_cash_flow',
  'net cash from investing activities':'investing_cash_flow',
  'net cash from financing activities':'financing_cash_flow','dividends paid':'dividends_paid',
};
const dictionary = new Map<string,BankCanonical>(BANK_CANONICAL.map(([id,label])=>[norm(label),id]));
const isValid = (id: string): id is BankCanonical => BANK_CANONICAL.some(([key])=>key===id);
export function suggestBankCanonical(account: string, manual?: Record<string,string>): BankMapping {
  const key=norm(account);
  const override=manual?.[key];
  if (override && isValid(override)) return {canonical:override,confidence:1,source:'manual',needsReview:false};
  const exact=dictionary.get(key);
  if (exact) return {canonical:exact,confidence:1,source:'exact',needsReview:false};
  const alias=aliases[key];
  if (alias) return {canonical:alias,confidence:0.98,source:'alias',needsReview:false};
  // Similarity suggestions are NEVER automatically accepted.
  const tokens=new Set(key.split(' ').filter(Boolean));
  const candidates=BANK_CANONICAL.map(([id,label])=>{
    const other=new Set(norm(label).split(' '));
    const overlap=[...tokens].filter(t=>other.has(t)).length;
    return {id,score:overlap/Math.max(1,new Set([...tokens,...other]).size)};
  }).sort((a,b)=>b.score-a.score);
  if (candidates[0]?.score>=0.5) return {canonical:candidates[0].id,confidence:Math.min(0.85,candidates[0].score),source:'fuzzy',needsReview:true};
  return {canonical:'',confidence:0,source:'unmapped',needsReview:true};
}
export const BANK_MAPPING_STORAGE_KEY='xlpro:bank-mapping:v1';
export function loadBankMappingOverrides(): Record<string,string> {
  try { return JSON.parse(localStorage.getItem(BANK_MAPPING_STORAGE_KEY) || '{}') as Record<string,string>; } catch {return {};}
}
export function saveBankMappingOverride(account:string,canonical:BankCanonical) {
  const overrides=loadBankMappingOverrides(); overrides[norm(account)]=canonical;
  localStorage.setItem(BANK_MAPPING_STORAGE_KEY,JSON.stringify(overrides));
}
export function bankCanonicalOptions(){return BANK_CANONICAL.map(([id,label,statement,kind])=>({id,label,statement,kind}));}
