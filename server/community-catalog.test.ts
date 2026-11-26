import {describe,it,expect,vi} from "vitest";
import {readCommunityCatalog} from "./community-catalog";
import type {CommunityEntitlement} from "./community-access";

const now=1700000000000;
const active:CommunityEntitlement={userId:42,status:"active",validUntilMs:now+60000};
const input={featureEnabled:true,authenticatedUserId:42};
describe("community catalog",()=>{
  it("never consults billing when disabled or anonymous",async()=>{
    const lookupEntitlement=vi.fn(async()=>active);
    const dependencies={lookupEntitlement,now:()=>now};
    expect(await readCommunityCatalog({...input,featureEnabled:false},dependencies)).toEqual({allowed:false,reason:"disabled"});
    expect(await readCommunityCatalog({...input,authenticatedUserId:null},dependencies)).toEqual({allowed:false,reason:"authentication_required"});
    expect(lookupEntitlement).not.toHaveBeenCalled();
  });
  it("returns only the thematic group metadata for a verified active account",async()=>{
    const lookupEntitlement=vi.fn(async()=>active);
    const result=await readCommunityCatalog(input,{lookupEntitlement,now:()=>now});
    expect(lookupEntitlement).toHaveBeenCalledWith(42);
    expect(result.allowed).toBe(true);
    if(result.allowed){
      expect(result.groups.map(g=>g.id)).toEqual(["immigration","career","travel","ielts","express-entry"]);
      expect(result.groups.every(g=>Object.keys(g).sort().join(",")==="description,id,title")).toBe(true);
      result.groups[0].title="changed";
      const again=await readCommunityCatalog(input,{lookupEntitlement,now:()=>now});
      if(again.allowed)expect(again.groups[0].title).toBe("Imigração");
    }
  });
  it.each([null,{...active,userId:43},{...active,status:"canceled" as const},{...active,validUntilMs:now}])("does not expose groups for invalid entitlement",async entitlement=>{
    expect(await readCommunityCatalog(input,{lookupEntitlement:async()=>entitlement,now:()=>now})).toEqual({allowed:false,reason:"subscription_required"});
  });
  it("denies on lookup or clock failure",async()=>{
    expect(await readCommunityCatalog(input,{lookupEntitlement:async()=>{throw Error("unavailable")},now:()=>now})).toEqual({allowed:false,reason:"subscription_required"});
    expect(await readCommunityCatalog(input,{lookupEntitlement:async()=>active,now:()=>{throw Error("clock")}})).toEqual({allowed:false,reason:"subscription_required"});
  });
});
