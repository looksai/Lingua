export type CommercialPlan="lingua-premium"|"community-premium";
export type CommercialBenefit="course"|"tutor"|"exams"|"community"|"social-achievements"|"leaderboard";
export type SubscriptionEvidence={userId:number;plan:CommercialPlan;status:"active"|"cancelled"|"expired"|"pending"|"suspended";startsAtMs:number;endsAtMs:number};
const BENEFITS:Record<CommercialPlan,readonly CommercialBenefit[]>={"lingua-premium":["course","tutor","exams","community","social-achievements","leaderboard"],"community-premium":["exams","community","social-achievements","leaderboard"]};
// Policy only: records must be loaded from an authoritative billing repository.
export function commercialBenefits(userId:number,records:readonly SubscriptionEvidence[],nowMs:number):CommercialBenefit[]{
 if(!Number.isSafeInteger(userId)||userId<=0||!Number.isSafeInteger(nowMs)||nowMs<0)return [];
 const result=new Set<CommercialBenefit>();
 for(const r of records){
  if(r.userId!==userId||r.status!=="active"||!Number.isSafeInteger(r.startsAtMs)||!Number.isSafeInteger(r.endsAtMs)||r.startsAtMs<0||r.startsAtMs>nowMs||r.endsAtMs<=nowMs||!Object.prototype.hasOwnProperty.call(BENEFITS,r.plan))continue;
  for(const benefit of BENEFITS[r.plan])result.add(benefit);
 }
 return [...result];
}
