import {describe,it,expect,vi} from "vitest";
import {adminTrialRouterLab} from "./admin-trial-router-lab";
import type {TrpcContext} from "./_core/context";
const context=(role:"user"|"admin"|null)=>({user:role?{id:1,role}:null,req:{},res:{setHeader:vi.fn()}} as unknown as TrpcContext);
describe("administrative access boundary",()=>{
 for(const role of [null,"user"] as const)it("denies "+String(role),async()=>{
 const caller=adminTrialRouterLab.createCaller(context(role));
 for(const request of [()=>caller.communityReportSummary(),()=>caller.communityReports({status:"pending"}),()=>caller.communityPublicationAudit({}),()=>caller.actionCommunityReport({reportId:1}),()=>caller.dismissCommunityReport({reportId:1}),()=>caller.setCommunityPublicationHidden({ownerId:2,achievementId:"first-lesson",hidden:true}),()=>caller.setCommunitySuspension({targetId:2,suspended:true}),()=>caller.metrics(),()=>caller.advertising(),()=>caller.referrals(),()=>caller.recurring(),()=>caller.finance({fromMs:0,toMs:1}),()=>caller.coupons({}),()=>caller.promotions({}),()=>caller.issue({code:"TEST",plan:"lingua-premium",days:30,validity:{kind:"days",days:3},maxUses:1}),()=>caller.issuePromotion({code:"TEST",plan:"lingua-premium",discount:{kind:"percent",basisPoints:1000},validity:{kind:"days",days:3},maxUses:1}),()=>caller.revoke({code:"TEST"}),()=>caller.revokePromotion({code:"TEST"})])await expect(request()).rejects.toMatchObject({code:"FORBIDDEN"});
 });
 it("rejects invalid inputs before accessing the database",async()=>{
 const caller=adminTrialRouterLab.createCaller(context("admin"));
 await expect(caller.issue({code:"TEST",plan:"lingua-premium",days:31,validity:{kind:"days",days:3},maxUses:1})).rejects.toMatchObject({code:"BAD_REQUEST"});
 await expect(caller.issuePromotion({code:"TEST",plan:"lingua-premium",discount:{kind:"percent",basisPoints:10001},validity:{kind:"days",days:3},maxUses:1})).rejects.toMatchObject({code:"BAD_REQUEST"});
 await expect(caller.finance({fromMs:100,toMs:99})).rejects.toMatchObject({code:"BAD_REQUEST"});
 await expect(caller.actionCommunityReport({reportId:0})).rejects.toMatchObject({code:"BAD_REQUEST"});
 await expect(caller.dismissCommunityReport({reportId:0})).rejects.toMatchObject({code:"BAD_REQUEST"});
 await expect(caller.setCommunityPublicationHidden({ownerId:2,achievementId:"not-a-real-achievement",hidden:true})).rejects.toMatchObject({code:"BAD_REQUEST"});
 });
 it("fails closed when administrative laboratory is disabled",async()=>{
 vi.stubEnv("LINGUA_ADMIN_LAB_ENABLED","false");
 try{await expect(adminTrialRouterLab.createCaller(context("admin")).metrics()).rejects.toMatchObject({code:"PRECONDITION_FAILED"});}finally{vi.unstubAllEnvs();}
 });
});
