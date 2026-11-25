import type {PublicLiveLookup} from "./PublicLiveController";
export const lookupPublicLive:PublicLiveLookup=async(token,signal)=>{
 const response=await fetch("/api/trpc/partnerInvites.resolve",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({json:{token}}),signal,cache:"no-store",credentials:"omit",referrerPolicy:"no-referrer"});
 if(!response.ok)throw new Error("Invite lookup unavailable");
 const payload=await response.json();
 const event=payload?.result?.data?.json;
 if(event===null)return null;
 if(!event||typeof event.title!=="string"||typeof event.partnerName!=="string"||typeof event.scheduledAt!=="string"||!Number.isFinite(Date.parse(event.scheduledAt))||typeof event.canWatch!=="boolean")throw new Error("Invalid invite response");
 return {title:event.title,partnerName:event.partnerName,scheduledAt:event.scheduledAt,canWatch:event.canWatch};
};
