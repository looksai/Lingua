import {describe,it,expect} from "vitest";
import {promotionQuote,type Promotion} from "../shared/admin-promotion-policy";
const p:Promotion={code:"PROMO20",plan:"lingua-premium",discount:{kind:"percent",basisPoints:2000},redeemFromMs:0,redeemUntilMs:100,maxUses:10,revoked:false};
describe("promotion quote",()=>{
 it("calculates exact minor-unit discounts",()=>expect(promotionQuote(p,"lingua-premium","BRL",9990,50,0,false)).toEqual({currency:"BRL",priceMinor:9990,discountMinor:1998,totalMinor:7992}));
 it("caps fixed discounts and rejects currency mismatch",()=>{
 const fixed:Promotion={...p,discount:{kind:"fixed",currency:"BRL",minorUnits:20000}};
 expect(promotionQuote(fixed,"lingua-premium","BRL",9990,50,0,false)?.totalMinor).toBe(0);
 expect(promotionQuote(fixed,"lingua-premium","USD",9990,50,0,false)).toBeNull();
 });
 it("rejects expired, revoked, exhausted, repeated and wrong-plan coupons",()=>{
 expect(promotionQuote(p,"lingua-premium","BRL",9990,100,0,false)).toBeNull();
 expect(promotionQuote({...p,revoked:true},"lingua-premium","BRL",9990,50,0,false)).toBeNull();
 expect(promotionQuote(p,"lingua-premium","BRL",9990,50,10,false)).toBeNull();
 expect(promotionQuote(p,"lingua-premium","BRL",9990,50,0,true)).toBeNull();
 expect(promotionQuote(p,"community-premium","BRL",9990,50,0,false)).toBeNull();
 });
});
