import {eq} from "drizzle-orm";
import type {MySql2Database} from "drizzle-orm/mysql2";
import {gamificationPrivacy as privacy} from "../drizzle/gamification-draft";
import {PRIVATE_GAMIFICATION,type GamificationPrivacy} from "../shared/gamification-profile";
function requireOwner(id:number){if(!Number.isSafeInteger(id)||id<=0||id>2147483647)throw Error("Invalid owner");}
export async function readGamificationPrivacy(db:MySql2Database,userId:number):Promise<GamificationPrivacy>{
 requireOwner(userId);
 const [row]=await db.select({showLevel:privacy.showLevel,showAchievements:privacy.showAchievements,leaderboardOptIn:privacy.leaderboardOptIn}).from(privacy).where(eq(privacy.userId,userId)).limit(1);
 return row??{...PRIVATE_GAMIFICATION};
}
// Laboratory only; caller derives owner from authenticated session.
export async function saveGamificationPrivacy(db:MySql2Database,userId:number,input:GamificationPrivacy,nowMs=Date.now()){
 requireOwner(userId);
 if(!Number.isSafeInteger(nowMs)||nowMs<0||[input.showLevel,input.showAchievements,input.leaderboardOptIn].some(v=>typeof v!=="boolean"))throw Error("Invalid preferences");
 const value={showLevel:input.showLevel,showAchievements:input.showAchievements,leaderboardOptIn:input.leaderboardOptIn,updatedAtMs:nowMs};
 await db.insert(privacy).values({userId,...value}).onDuplicateKeyUpdate({set:value});
}
