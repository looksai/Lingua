import {afterEach,describe,expect,it} from "vitest";
import {adsRouter} from "./ads-router";
const oldAds=process.env.LINGUA_PORTAL_ADS_ENABLED;
const oldCommunity=process.env.LINGUA_PORTAL_COMMUNITY_ENABLED;
afterEach(()=>{
  if(oldAds===undefined)delete process.env.LINGUA_PORTAL_ADS_ENABLED;else process.env.LINGUA_PORTAL_ADS_ENABLED=oldAds;
  if(oldCommunity===undefined)delete process.env.LINGUA_PORTAL_COMMUNITY_ENABLED;else process.env.LINGUA_PORTAL_COMMUNITY_ENABLED=oldCommunity;
});
describe("native Lingua Ads feature gate",()=>{
  it("returns no paid placements without both flags",async()=>{
    process.env.LINGUA_PORTAL_COMMUNITY_ENABLED="true";
    delete process.env.LINGUA_PORTAL_ADS_ENABLED;
    const guest=adsRouter.createCaller({user:null} as never);
    expect(await guest.placement({placement:"portal-home"})).toEqual([]);
    expect(await guest.placement({placement:"portal-partners"})).toEqual([]);
  });
  it("does not open business management or write ads while disabled",async()=>{
    delete process.env.LINGUA_PORTAL_ADS_ENABLED;
    const owner=adsRouter.createCaller({user:{id:1,role:"user"}} as never);
    await expect(owner.mine({partnerId:1})).rejects.toMatchObject({code:"PRECONDITION_FAILED"});
    await expect(owner.create({partnerId:1,placement:"portal-home",
      title:"Publicação institucional",body:"Informações de imigração fornecidas pela empresa."}))
      .rejects.toMatchObject({code:"PRECONDITION_FAILED"});
  });
  it("rejects unauthenticated placement names not present in enum",async()=>{
    const guest=adsRouter.createCaller({user:null} as never);
    await expect(guest.placement({placement:"private-chat" as "portal-home"}))
      .rejects.toMatchObject({code:"BAD_REQUEST"});
  });
});
