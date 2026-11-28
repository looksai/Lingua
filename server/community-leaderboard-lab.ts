import {and,eq,gte,lt,sum} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {gamificationEvidence as evidence,gamificationPrivacy as privacy} from "../drizzle/gamification-draft";
import {GAMIFICATION_POLICY_VERSION} from "../shared/gamification-contract";
import {weeklyParticipationRanking} from "../shared/community-leaderboard";
// Laboratory only: membership resolver must consult authoritative current community access.
export async function readWeeklyCommunityRanking(db:MySql2Database,viewerId:number,isActiveMember:(id:number)=>Promise<boolean>,nowMs=Date.now(),limit=20){
 if(!Number.isSafeInteger(viewerId)||viewerId<=0||!Number.isSafeInteger(nowMs)||nowMs<0||nowMs>8640000000000000)throw Error("Invalid ranking context");
 if(!await isActiveMember(viewerId))throw Error("Community access required");
 const day=Math.floor(nowMs/86400000);
 const monday=(day-((day+3)%7))*86400000;
 const rows=await db.select({memberId:evidence.userId,total:sum(evidence.awardedXp)}).from(evidence).innerJoin(privacy,and(eq(privacy.userId,evidence.userId),eq(privacy.leaderboardOptIn,true))).where(and(eq(evidence.policyVersion,GAMIFICATION_POLICY_VERSION),gte(evidence.occurredAtMs,monday),lt(evidence.occurredAtMs,nowMs+1))).groupBy(evidence.userId);
 const candidates=[];
 for(const row of rows){
  if(!await isActiveMember(row.memberId))continue;
  candidates.push({memberId:row.memberId,active:true,optedIn:true,weeklyXp:Number(row.total)});
 }
 return {weekStartMs:monday,ranking:weeklyParticipationRanking(candidates,limit)};
}
