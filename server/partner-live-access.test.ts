import {describe,it,expect} from "vitest";
import {canOpenPublicLive,canWatchPublicLive,type PartnerLiveEvent,type PartnerLiveInvite} from "./partner-live-access";
const event:PartnerLiveEvent={id:"event-a",partnerId:"partner-a",visibility:"public",status:"live"};
const invite:PartnerLiveInvite={eventId:event.id,partnerId:event.partnerId,revokedAt:null,expiresAt:200};
describe("public partner live access",()=>{
  it("allows anonymous public live viewing",()=>{
    expect(canOpenPublicLive(event,invite,100)).toBe(true);
    expect(canWatchPublicLive(event,invite,100)).toBe(true);
  });
  it("allows published landing page but not playback",()=>{
    const published={...event,status:"published" as const};
    expect(canOpenPublicLive(published,invite,100)).toBe(true);
    expect(canWatchPublicLive(published,invite,100)).toBe(false);
  });
  it.each(["private","subscriber"] as const)("denies %s events",visibility=>{
    expect(canOpenPublicLive({...event,visibility},invite,100)).toBe(false);
    expect(canWatchPublicLive({...event,visibility},invite,100)).toBe(false);
  });
  it.each(["draft","ended","cancelled"] as const)("denies %s events",status=>{
    expect(canOpenPublicLive({...event,status},invite,100)).toBe(false);
    expect(canWatchPublicLive({...event,status},invite,100)).toBe(false);
  });
  it("denies mismatched tenant or event",()=>{
    expect(canOpenPublicLive(event,{...invite,partnerId:"partner-b"},100)).toBe(false);
    expect(canOpenPublicLive(event,{...invite,eventId:"event-b"},100)).toBe(false);
  });
  it("denies revoked and expired invites including expiry boundary",()=>{
    expect(canOpenPublicLive(event,{...invite,revokedAt:99},100)).toBe(false);
    expect(canOpenPublicLive(event,invite,200)).toBe(false);
    expect(canOpenPublicLive(event,invite,201)).toBe(false);
    expect(canOpenPublicLive(event,invite,199)).toBe(true);
  });
  it("fails closed for missing records or invalid clock",()=>{
    expect(canOpenPublicLive(null,invite,100)).toBe(false);
    expect(canOpenPublicLive(event,null,100)).toBe(false);
    expect(canOpenPublicLive(event,invite,NaN)).toBe(false);
    expect(canOpenPublicLive(event,{...invite,expiresAt:Infinity},100)).toBe(false);
  });
});
