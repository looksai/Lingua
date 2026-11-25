import {afterEach,describe,expect,it} from "vitest";
import {partnerRouter} from "./partner-router";
const flag=process.env.LINGUA_PORTAL_PARTNER_CONTACT_ENABLED;
const community=process.env.LINGUA_PORTAL_COMMUNITY_ENABLED;
afterEach(()=>{
  if(flag===undefined)delete process.env.LINGUA_PORTAL_PARTNER_CONTACT_ENABLED;
  else process.env.LINGUA_PORTAL_PARTNER_CONTACT_ENABLED=flag;
  if(community===undefined)delete process.env.LINGUA_PORTAL_COMMUNITY_ENABLED;
  else process.env.LINGUA_PORTAL_COMMUNITY_ENABLED=community;
});
describe("partner contact service denies access before explicit rollout",()=>{
  it("hides all public partner detail until both flags are on",async()=>{
    delete process.env.LINGUA_PORTAL_PARTNER_CONTACT_ENABLED;
    process.env.LINGUA_PORTAL_COMMUNITY_ENABLED="true";
    const guest=partnerRouter.createCaller({user:null} as never);
    expect(await guest.publicProfile({slug:"qa-test"})).toBeNull();
  });
  it("does not read the optional tables with partner flag disabled",async()=>{
    delete process.env.LINGUA_PORTAL_PARTNER_CONTACT_ENABLED;
    const ctx={user:{id:1,email:"qa@synthetic.invalid",role:"user"}} as never;
    const user=partnerRouter.createCaller(ctx);
    await expect(user.myOrganizations()).rejects.toMatchObject({code:"PRECONDITION_FAILED"});
    await expect(user.inbox({partnerId:1})).rejects.toMatchObject({code:"PRECONDITION_FAILED"});
    await expect(user.myInquiries()).rejects.toMatchObject({code:"PRECONDITION_FAILED"});
    await expect(user.sendInquiry({
      partnerId:1,message:"Quero saber sobre os serviços da organização.",consentToShareMessage:true,
    })).rejects.toMatchObject({code:"PRECONDITION_FAILED"});
  });
  it("rejects missing explicit consent before writing",async()=>{
    process.env.LINGUA_PORTAL_COMMUNITY_ENABLED="true";
    process.env.LINGUA_PORTAL_PARTNER_CONTACT_ENABLED="true";
    const user=partnerRouter.createCaller({user:{id:1,role:"user"}} as never);
    await expect(user.sendInquiry({
      partnerId:1,message:"Quero saber sobre os serviços da organização.",consentToShareMessage:false as true,
    })).rejects.toMatchObject({code:"BAD_REQUEST"});
  });
});
