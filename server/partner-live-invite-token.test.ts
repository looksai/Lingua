import {describe,it,expect} from "vitest";
import {createLiveInviteToken,digestLiveInviteToken} from "./partner-live-invite-token";
describe("live invitation tokens",()=>{
  it("generates canonical 256-bit tokens with stable SHA-256 digests",()=>{
    const {token,digest}=createLiveInviteToken();
    expect(Buffer.from(token,"base64url")).toHaveLength(32);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(digest).toMatch(/^[a-f0-9]{64}$/);
    expect(digestLiveInviteToken(token)).toBe(digest);
  });
  it("generates distinct tokens and digests in a sample",()=>{
    const items=Array.from({length:64},()=>createLiveInviteToken());
    expect(new Set(items.map(x=>x.token)).size).toBe(64);
    expect(new Set(items.map(x=>x.digest)).size).toBe(64);
  });
  it("rejects malformed and noncanonical tokens",()=>{
    const {token}=createLiveInviteToken();
    for(const invalid of ["",token+"=",token.slice(1),"/"+token.slice(1),"A".repeat(42)+"B",token+"\n"]){
      expect(digestLiveInviteToken(invalid)).toBeNull();
    }
  });
});
