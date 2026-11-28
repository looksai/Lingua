import type {FinanceCurrency} from "./admin-finance-policy";
export type RecurringContract={id:string;currency:FinanceCurrency;amountMinor:number;intervalMonths:1|12;status:"active"|"pending"|"cancelled"|"suspended";startsAtMs:number;endsAtMs:number};
export function contractedMrr(contracts:readonly RecurringContract[],nowMs:number){
 if(!Number.isSafeInteger(nowMs)||nowMs<0)throw Error("Invalid reporting time");
 const currencies:FinanceCurrency[]=["BRL","USD","EUR"];
 const totals=new Map(currencies.map(c=>[c,0n]));
 const seen=new Set<string>();
 for(const c of contracts){
 if(!c.id||seen.has(c.id)||!currencies.includes(c.currency)||!Number.isSafeInteger(c.amountMinor)||c.amountMinor<0||![1,12].includes(c.intervalMonths)||!["active","pending","cancelled","suspended"].includes(c.status)||!Number.isSafeInteger(c.startsAtMs)||!Number.isSafeInteger(c.endsAtMs)||c.startsAtMs<0||c.endsAtMs<=c.startsAtMs)throw Error("Invalid recurring contract");
 seen.add(c.id);
 if(c.status!=="active"||c.startsAtMs>nowMs||c.endsAtMs<=nowMs)continue;
 totals.set(c.currency,totals.get(c.currency)!+BigInt(c.amountMinor)*BigInt(12/c.intervalMonths));
 }
 return currencies.map(currency=>{
 const rounded=(totals.get(currency)!+6n)/12n;
 if(rounded>BigInt(Number.MAX_SAFE_INTEGER))throw Error("MRR overflow");
 return {currency,mrrMinor:Number(rounded)};
 });
}
