import {describe,it,expect} from "vitest";
import {createPartnerInviteLimiter} from "./partner-invite-rate-limit";
describe("partner invite limiter",()=>{
 it("limits independently and resets at expiry",()=>{let now=0;const allow=createPartnerInviteLimiter({clock:()=>now,limit:2,windowMs:10});expect(allow("a")).toBe(true);expect(allow("a")).toBe(true);expect(allow("a")).toBe(false);expect(allow("b")).toBe(true);now=10;expect(allow("a")).toBe(true);});
 it("fails closed at capacity and reclaims expired entries",()=>{let now=0;const allow=createPartnerInviteLimiter({clock:()=>now,maxKeys:1,windowMs:10});expect(allow("a")).toBe(true);expect(allow("b")).toBe(false);now=10;expect(allow("b")).toBe(true);});
 it("rejects invalid keys and configuration",()=>{const allow=createPartnerInviteLimiter();expect(allow("")).toBe(false);expect(allow("a".repeat(257))).toBe(false);expect(()=>createPartnerInviteLimiter({limit:0})).toThrow();});
});
