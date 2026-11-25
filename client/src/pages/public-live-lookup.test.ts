import {afterEach,describe,expect,it,vi} from "vitest";
import {lookupPublicLive} from "./public-live-lookup";
afterEach(()=>vi.unstubAllGlobals());
describe("public live lookup",()=>{
 const token="a".repeat(43);
 const signal=new AbortController().signal;
 const mock=(json:unknown,status=200)=>{const f=vi.fn(async()=>new Response(JSON.stringify(json),{status}));vi.stubGlobal("fetch",f);return f;};
 it("sends token in body without cookies or referrer and projects public fields",async()=>{
 const event={title:"Live",partnerName:"Partner",scheduledAt:"2026-11-25T12:00:00Z",canWatch:true,privateEmail:"private"};
 const f=mock({result:{data:{json:event}}});
 expect(await lookupPublicLive(token,signal)).toEqual({title:event.title,partnerName:event.partnerName,scheduledAt:event.scheduledAt,canWatch:true});
 expect(f).toHaveBeenCalledWith("/api/trpc/partnerInvites.resolve",expect.objectContaining({method:"POST",credentials:"omit",cache:"no-store",referrerPolicy:"no-referrer",signal,body:JSON.stringify({json:{token}})}));
 });
 it("accepts unavailable invite",async()=>{mock({result:{data:{json:null}}});expect(await lookupPublicLive(token,signal)).toBeNull();});
 it("rejects malformed responses",async()=>{mock({result:{data:{json:{title:"Live"}}}});await expect(lookupPublicLive(token,signal)).rejects.toThrow("Invalid invite response");});
 it("rejects server errors",async()=>{mock({},503);await expect(lookupPublicLive(token,signal)).rejects.toThrow("Invite lookup unavailable");});
});
