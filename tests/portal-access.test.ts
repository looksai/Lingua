import { describe,expect,it } from "vitest";
import { canUsePortal, hasPortalGrant, type PortalAccessInput, type PortalGrant } from "../shared/portal-access";

const now=1_800_000_000_000;
const academy: PortalGrant={kind:"academy",state:"active",expiresAtMs:now+30_000,source:"subscription"};
const club: PortalGrant={kind:"club",state:"active",expiresAtMs:null,source:"purchase"};
function input(grants:PortalGrant[]=[],extra:Partial<PortalAccessInput>={}):PortalAccessInput {
  return {authenticated:true,grants,nowMs:now,...extra};
}
describe("portal membership permissions (not yet wired to APIs)",()=>{
  it("allows free public discovery, without inventing private access",()=>{
    expect(canUsePortal(input([], {authenticated:false}),"read-public")).toBe(true);
    expect(canUsePortal(input([], {authenticated:false}),"view-partner-directory")).toBe(true);
    for(const action of ["read-private","reply-in-private","create-private-topic","manage-group"] as const)
      expect(canUsePortal(input([], {authenticated:false}),action)).toBe(false);
  });
  it("never treats login as a purchase or academy enrollment",()=>{
    expect(canUsePortal(input(),"read-private")).toBe(false);
    expect(canUsePortal(input(),"create-private-topic")).toBe(false);
  });
  it("limits Academy access to approved groups even when subscribed",()=>{
    expect(canUsePortal(input([academy]),"read-private")).toBe(false);
    expect(canUsePortal(input([academy],{academyGroupAllowed:true}),"read-private")).toBe(true);
    expect(canUsePortal(input([academy],{academyGroupAllowed:true}),"reply-in-private")).toBe(true);
    expect(canUsePortal(input([academy],{academyGroupAllowed:true}),"create-private-topic")).toBe(false);
    expect(canUsePortal(input([academy],{academyGroupAllowed:true,communityRole:"moderator"}),"manage-group")).toBe(false);
  });
  it("accepts valid purchased Club grant, never treats forum access as AI entitlement",()=>{
    expect(hasPortalGrant(input([club]),"club")).toBe(true);
    expect(hasPortalGrant(input([club]),"academy")).toBe(false);
    expect(canUsePortal(input([club]),"create-private-topic")).toBe(true);
    expect(canUsePortal(input([club]),"manage-group")).toBe(false);
    expect(canUsePortal(input([club],{communityRole:"moderator"}),"manage-group")).toBe(true);
  });
  it("revocation, expiry and impossible lifetime Academy grants fail closed",()=>{
    expect(hasPortalGrant(input([{...club,state:"revoked"}]),"club")).toBe(false);
    expect(hasPortalGrant(input([{...club,expiresAtMs:now}]),"club")).toBe(false);
    expect(hasPortalGrant(input([{...academy,expiresAtMs:null}]),"academy")).toBe(false);
    expect(hasPortalGrant(input([{...club,source:"subscription",expiresAtMs:null}]),"club")).toBe(false);
    expect(hasPortalGrant(input([club],{nowMs:NaN}),"club")).toBe(false);
  });
  it("never grants lifetime Club for partner-only authority",()=>{
    const partnerLike=input([], {communityRole:"moderator"});
    expect(canUsePortal(partnerLike,"manage-group")).toBe(false);
    expect(canUsePortal(partnerLike,"read-private")).toBe(false);
  });
});
