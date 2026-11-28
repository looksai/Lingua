import {commercialBenefits,type CommercialBenefit,type SubscriptionEvidence} from "../shared/commercial-entitlements";
export type SubscriptionRepository={listForOwner(userId:number):Promise<readonly SubscriptionEvidence[]>};
// Inject only a trusted server-side repository. No pilot or client entitlement fallback.
export function createCommercialAccess(repository:SubscriptionRepository,clock:()=>number=Date.now){
 async function allows(userId:number,benefit:CommercialBenefit):Promise<boolean>{
  if(!Number.isSafeInteger(userId)||userId<=0)return false;
  try{return commercialBenefits(userId,await repository.listForOwner(userId),clock()).includes(benefit);}catch{return false;}
 }
 return {allows,isActiveMember:(userId:number)=>allows(userId,"community"),
  async canViewCommunityProfile(viewerId:number,ownerId:number){
   return await allows(viewerId,"community")&&await allows(ownerId,"community");
  }};
}
