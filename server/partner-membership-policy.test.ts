import {describe,it,expect} from "vitest";
import {deriveLiveMembership,type PartnerRecord,type PartnerMemberRecord} from "./partner-membership-policy";
const partner:PartnerRecord={id:1,status:"active"};
const member:PartnerMemberRecord={partnerId:1,userId:2,role:"owner",status:"active"};
describe("trusted partner membership",()=>{
 it("derives active membership",()=>expect(deriveLiveMembership(2,partner,member)).toEqual({partnerId:"1",active:true,role:"owner"}));
 it("rejects other users and tenants",()=>{expect(deriveLiveMembership(3,partner,member)).toBeNull();expect(deriveLiveMembership(2,{...partner,id:4},member)).toBeNull();});
 it("rejects inactive members and nonactive partners",()=>{expect(deriveLiveMembership(2,partner,{...member,status:"inactive"})).toBeNull();for(const status of ["pending","suspended"] as const)expect(deriveLiveMembership(2,{...partner,status},member)).toBeNull();});
 it("rejects absent records and invalid IDs",()=>{expect(deriveLiveMembership(2,null,member)).toBeNull();expect(deriveLiveMembership(2,partner,null)).toBeNull();expect(deriveLiveMembership(NaN,partner,member)).toBeNull();});
});
