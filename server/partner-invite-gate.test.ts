import {describe,it,expect} from "vitest";
import {partnerInviteLabEnabled} from "./partner-invite-gate";
describe("partner invite activation",()=>{
 const lab={NODE_ENV:"development",PARTNER_INVITES_ENABLED:"true",DATABASE_URL:"mysql://partner_lab:partner_lab@127.0.0.1:33316/partner_lab"};
 it("requires explicit laboratory configuration",()=>{expect(partnerInviteLabEnabled(lab)).toBe(true);expect(partnerInviteLabEnabled({})).toBe(false);expect(partnerInviteLabEnabled({...lab,PARTNER_INVITES_ENABLED:undefined})).toBe(false);});
 it("rejects production even with laboratory URL",()=>expect(partnerInviteLabEnabled({...lab,NODE_ENV:"production"})).toBe(false));
 it("rejects other databases",()=>expect(partnerInviteLabEnabled({...lab,DATABASE_URL:"mysql://example.invalid/db"})).toBe(false));
});
