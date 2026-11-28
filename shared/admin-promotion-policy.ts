import type {CommercialPlan} from "./commercial-entitlements";
export type Currency="BRL"|"USD"|"EUR";
export type Promotion={code:string;plan:CommercialPlan;discount:{kind:"percent";basisPoints:number}|{kind:"fixed";currency:Currency;minorUnits:number};redeemFromMs:number;redeemUntilMs:number;maxUses:number;revoked:boolean};
export function promotionQuote(p:Promotion,plan:CommercialPlan,currency:Currency,priceMinor:number,nowMs:number,uses:number,alreadyRedeemed:boolean){
 if(!/^[A-Z0-9_-]{4,40}$/.test(p.code)||!["lingua-premium","community-premium"].includes(plan)||p.plan!==plan||!["BRL","USD","EUR"].includes(currency)||p.revoked!==false||alreadyRedeemed!==false)return null;
 if(![priceMinor,nowMs,uses,p.redeemFromMs,p.redeemUntilMs,p.maxUses].every(Number.isSafeInteger)||priceMinor<0||nowMs<0||p.redeemFromMs<0||nowMs<p.redeemFromMs||nowMs>=p.redeemUntilMs||uses<0||p.maxUses<=0||uses>=p.maxUses)return null;
 let discountMinor:number;
 if(p.discount.kind==="percent"){
 const b=p.discount.basisPoints;if(!Number.isSafeInteger(b)||b<=0||b>10000)return null;
 discountMinor=Number(BigInt(priceMinor)*BigInt(b)/10000n);
 }else if(p.discount.kind==="fixed"){
 if(p.discount.currency!==currency||!Number.isSafeInteger(p.discount.minorUnits)||p.discount.minorUnits<=0)return null;
 discountMinor=Math.min(priceMinor,p.discount.minorUnits);
 }else return null;
 return {currency,priceMinor,discountMinor,totalMinor:priceMinor-discountMinor};
}
// Quote only; checkout must reserve redemption atomically and verify authoritative price.
