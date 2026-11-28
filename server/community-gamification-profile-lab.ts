import {eq} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {gamificationEvidence as evidence} from "../drizzle/gamification-draft";
import {GAMIFICATION_POLICY_VERSION,type XpAward} from "../shared/gamification-contract";
import {communityGamificationProfile} from "../shared/gamification-profile";
import {readGamificationPrivacy} from "./gamification-privacy-lab";
// Laboratory only. Access resolver must enforce current membership and profile visibility.
export async function readCommunityGamificationProfile(db:MySql2Database,viewerId:number,ownerId:number,canView:(viewer:number,owner:number)=>Promise<boolean>){
 if([viewerId,ownerId].some(id=>!Number.isSafeInteger(id)||id<=0||id>2147483647))throw Error("Invalid member");
 if(!await canView(viewerId,ownerId))throw Error("Community access required");
 const privacy=await readGamificationPrivacy(db,ownerId);
 if(!privacy.showLevel&&!privacy.showAchievements)return {};
 const rows=await db.select().from(evidence).where(eq(evidence.userId,ownerId));
 if(rows.some(r=>r.policyVersion!==GAMIFICATION_POLICY_VERSION))throw Error("Unsupported award policy");
 const awards:XpAward[]=rows.map(r=>({kind:r.kind,sourceId:r.sourceId,occurredAtMs:r.occurredAtMs,xp:r.awardedXp,policyVersion:GAMIFICATION_POLICY_VERSION}));
 if(!await canView(viewerId,ownerId))throw Error("Community access required");
 return communityGamificationProfile(awards,await readGamificationPrivacy(db,ownerId));
}
