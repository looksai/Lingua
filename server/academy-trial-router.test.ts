import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import type {TrpcContext} from "./_core/context";
import {appRouter} from "./routers";

const now=1700000000000, day=86400000;
function caller(ageDays:number|null){
  const user=ageDays===null?null:{id:42,openId:"local:synthetic",email:"trial@synthetic.invalid",name:null,role:"user",loginMethod:"local",createdAt:new Date(now-ageDays*day),updatedAt:new Date(now),lastSignedIn:new Date(now)};
  return appRouter.createCaller({user,req:{headers:{origin:"https://lingua.example.test",host:"lingua.example.test"}},res:{clearCookie:vi.fn()}} as unknown as TrpcContext);
}
beforeEach(()=>{vi.stubEnv("ACADEMY_TRIAL_ENABLED","true");vi.spyOn(Date,"now").mockReturnValue(now)});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs()});
describe("trial middleware boundary",()=>{
 it("allows trial status for active and expired authenticated accounts",async()=>{
   await expect(caller(1).auth.trialStatus()).resolves.toMatchObject({kind:"active",remainingDays:14});
   await expect(caller(15).auth.trialStatus()).resolves.toMatchObject({kind:"expired",remainingDays:0});
   await expect(caller(null).auth.trialStatus()).rejects.toMatchObject({code:"UNAUTHORIZED"});
 });
 it("blocks expired sessions at learning, tutor and placement boundaries before side effects",async()=>{
   const c=caller(15);
   await expect(c.onboarding.me()).rejects.toMatchObject({code:"FORBIDDEN"});
   await expect(c.learning.listItems({limit:10})).rejects.toMatchObject({code:"FORBIDDEN"});
   await expect(c.tutor.capabilities()).rejects.toMatchObject({code:"FORBIDDEN"});
   await expect(c.placement.me()).rejects.toMatchObject({code:"FORBIDDEN"});
   await expect(c.speech.transcribe({audioBase64:"YQ==",mimeType:"audio/webm",language:"en"})).rejects.toMatchObject({code:"FORBIDDEN"});
   await expect(c.auth.me()).resolves.toMatchObject({id:42});
 });
 it("allows an active account to query tutor capabilities",async()=>{
   await expect(caller(1).tutor.capabilities()).resolves.toHaveProperty("provider");
 });
});
