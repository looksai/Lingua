import {participationMissions} from "../shared/gamification-missions";
import {projectXp,xpProgress,type XpEvent} from "../shared/gamification-contract";
import {achievementProgress} from "../shared/gamification-achievements";
export type OwnedReviewEvidence={logId:number;createdAt:Date};
// Call only with records selected by authenticated user ID on the server.
// This is a preview, not a durable balance: bounded history may omit older events.
export function reviewGamificationPreview(records:readonly OwnedReviewEvidence[],nowMs=Date.now()){
 const events:XpEvent[]=records.filter(r=>Number.isSafeInteger(r.logId)&&r.logId>0).map(r=>({kind:"review_completed",sourceId:String(r.logId),occurredAtMs:r.createdAt.getTime()}));
 const awards=projectXp(events);
 return {scope:"review-history-preview" as const,...xpProgress(awards),achievements:achievementProgress(awards),missions:participationMissions(awards,nowMs).filter(m=>m.kind==="review_completed")};
}
