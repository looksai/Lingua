import {eq} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {gamificationEvidence as evidence} from "../drizzle/gamification-draft";
import {GAMIFICATION_POLICY_VERSION,type XpAward} from "../shared/gamification-contract";
import {personalGamificationProfile} from "../shared/gamification-profile";
import {participationMissions} from "../shared/gamification-missions";
import {readGamificationPrivacy} from "./gamification-privacy-lab";
// Laboratory only. Owner must come from authenticated session.
export async function readPersistentGamificationProfile(db:MySql2Database,userId:number,nowMs=Date.now()){
 if(!Number.isSafeInteger(userId)||userId<=0||userId>2147483647||!Number.isSafeInteger(nowMs)||nowMs<0)throw Error("Invalid profile context");
 const rows=await db.select().from(evidence).where(eq(evidence.userId,userId));
 if(rows.some(r=>r.policyVersion!==GAMIFICATION_POLICY_VERSION||r.occurredAtMs>nowMs))throw Error("Unsupported ledger evidence");
 const awards:XpAward[]=rows.map(r=>({kind:r.kind,sourceId:r.sourceId,occurredAtMs:r.occurredAtMs,xp:r.awardedXp,policyVersion:GAMIFICATION_POLICY_VERSION}));
 return {scope:"persistent-ledger" as const,...personalGamificationProfile(awards),missions:participationMissions(awards,nowMs),privacy:await readGamificationPrivacy(db,userId)};
}
