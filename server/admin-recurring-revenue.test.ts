import {describe,it,expect} from "vitest";
import {contractedMrr,type RecurringContract} from "../shared/admin-recurring-revenue";
const base:RecurringContract={id:"monthly",currency:"BRL",amountMinor:9990,intervalMonths:1,status:"active",startsAtMs:0,endsAtMs:100};
describe("contracted MRR",()=>{
 it("normalizes annual contracts and excludes inactive access",()=>{
 expect(contractedMrr([base,{...base,id:"annual",amountMinor:99700,intervalMonths:12},{...base,id:"usd",currency:"USD",amountMinor:14900},{...base,id:"cancelled",status:"cancelled"},{...base,id:"expired",endsAtMs:50}],50)).toEqual([{currency:"BRL",mrrMinor:18298},{currency:"USD",mrrMinor:14900},{currency:"EUR",mrrMinor:0}]);
 });
 it("rounds after aggregation and rejects duplicate contracts",()=>{
 expect(contractedMrr([{...base,amountMinor:5,intervalMonths:12},{...base,id:"second",amountMinor:5,intervalMonths:12}],50)[0].mrrMinor).toBe(1);
 expect(()=>contractedMrr([base,base],50)).toThrow();
 });
});
