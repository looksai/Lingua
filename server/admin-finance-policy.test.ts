import {describe,it,expect} from "vitest";
import {realizedCashReport,type FinanceEntry} from "../shared/admin-finance-policy";
const sale:FinanceEntry={id:"sale",currency:"BRL",kind:"subscription",minorUnits:9990,settledAtMs:100};
describe("realized cash reporting",()=>{
 it("separates currencies, refunds and costs without duplicate revenue",()=>{
 const report=realizedCashReport([sale,sale,{...sale,id:"refund",kind:"refund",minorUnits:1000},{...sale,id:"ai",kind:"ai-cost",minorUnits:1500},{...sale,id:"ad",currency:"USD",kind:"advertising",minorUnits:5000},{...sale,id:"outside",settledAtMs:200}],100,200);
 expect(report).toEqual([{currency:"BRL",revenue:9990,refunds:1000,expenses:1500,net:7490},{currency:"USD",revenue:5000,refunds:0,expenses:0,net:5000},{currency:"EUR",revenue:0,refunds:0,expenses:0,net:0}]);
 });
 it("rejects conflicting duplicates and invalid amounts",()=>{
 expect(()=>realizedCashReport([sale,{...sale,minorUnits:1}],0,200)).toThrow();
 expect(()=>realizedCashReport([{...sale,minorUnits:-1}],0,200)).toThrow();
 expect(()=>realizedCashReport([sale],200,100)).toThrow();
 });
});
