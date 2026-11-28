import {describe,it,expect,vi} from "vitest";
import {adminTrialRouterLab} from "./admin-trial-router-lab";
import type {TrpcContext} from "./_core/context";
const context=(role:"user"|"admin"|null)=>({user:role?{id:1,role}:null,req:{},res:{setHeader:vi.fn()}} as unknown as TrpcContext);
describe("administrative access boundary",()=>{
 for(const role of [null,"user"] as const)it("denies "+String(role),async()=>{
 const caller=adminTrialRouterLab.createCaller(context(role));
 for(const request of [()=>caller.metrics(),()=>caller.advertising(),()=>caller.referrals(),()=>caller.recurring(),()=>caller.finance({fromMs:0,toMs:1}),()=>caller.coupons({}),()=>caller.promotions({}),()=>caller.revoke({code:"TEST"}),()=>caller.revokePromotion({code:"TEST"})])await expect(request()).rejects.toMatchObject({code:"FORBIDDEN"});
 });
 it("fails closed when administrative laboratory is disabled",async()=>{
 vi.stubEnv("LINGUA_ADMIN_LAB_ENABLED","false");
 try{await expect(adminTrialRouterLab.createCaller(context("admin")).metrics()).rejects.toMatchObject({code:"PRECONDITION_FAILED"});}finally{vi.unstubAllEnvs();}
 });
});
