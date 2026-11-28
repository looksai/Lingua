export type FinanceCurrency="BRL"|"USD"|"EUR";
export type FinanceKind="subscription"|"advertising"|"partner"|"refund"|"ai-cost"|"commission"|"operating-expense";
export type FinanceEntry={id:string;currency:FinanceCurrency;kind:FinanceKind;minorUnits:number;settledAtMs:number};
const kinds:FinanceKind[]=["subscription","advertising","partner","refund","ai-cost","commission","operating-expense"];
const currencies:FinanceCurrency[]=["BRL","USD","EUR"];
export function realizedCashReport(entries:readonly FinanceEntry[],fromMs:number,toMs:number){
 if(!Number.isSafeInteger(fromMs)||!Number.isSafeInteger(toMs)||fromMs<0||toMs<=fromMs)throw Error("Invalid period");
 const seen=new Map<string,string>();
 const totals=currencies.map(currency=>({currency,revenue:0,refunds:0,expenses:0,net:0}));
 for(const e of entries){
 if(!e.id||!currencies.includes(e.currency)||!kinds.includes(e.kind)||!Number.isSafeInteger(e.minorUnits)||e.minorUnits<=0||!Number.isSafeInteger(e.settledAtMs)||e.settledAtMs<0)throw Error("Invalid cash entry");
 const fingerprint=JSON.stringify([e.currency,e.kind,e.minorUnits,e.settledAtMs]);
 if(seen.has(e.id)){if(seen.get(e.id)!==fingerprint)throw Error("Conflicting cash entry");continue;}
 seen.set(e.id,fingerprint);
 if(e.settledAtMs<fromMs||e.settledAtMs>=toMs)continue;
 const t=totals.find(t=>t.currency===e.currency)!;
 if(e.kind==="subscription"||e.kind==="advertising"||e.kind==="partner")t.revenue+=e.minorUnits;
 else if(e.kind==="refund")t.refunds+=e.minorUnits;
 else t.expenses+=e.minorUnits;
 if(![t.revenue,t.refunds,t.expenses].every(Number.isSafeInteger))throw Error("Cash total overflow");
 }
 for(const t of totals){t.net=t.revenue-t.refunds-t.expenses;if(!Number.isSafeInteger(t.net))throw Error("Cash total overflow");}
 return totals;
}
