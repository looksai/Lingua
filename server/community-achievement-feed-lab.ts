import {visibleAchievementShare,type AchievementShare} from "../shared/community-achievement-sharing";
type Access={viewerActive:boolean;ownerActive:boolean;ownerAllowsAchievements:boolean;moderationAllows:boolean};
// Access resolver must read current server-side membership, privacy and moderation.
export async function achievementFeedPreview(viewerId:number,shares:readonly AchievementShare[],resolveAccess:(viewerId:number,ownerId:number,achievementId:string)=>Promise<Access>,limit=20){
 if(!Number.isSafeInteger(viewerId)||viewerId<=0||!Number.isInteger(limit)||limit<1||limit>100)throw Error("Invalid feed request");
 const ordered=[...shares].filter(s=>s.revokedAtMs===null).sort((a,b)=>b.publishedAtMs-a.publishedAtMs||a.ownerId-b.ownerId||a.achievementId.localeCompare(b.achievementId));
 const seen=new Set<string>();
 const result:NonNullable<ReturnType<typeof visibleAchievementShare>>[]=[];
 for(const share of ordered){
  const key=JSON.stringify([share.ownerId,share.achievementId]);
  if(seen.has(key))continue;
  seen.add(key);
  const access=await resolveAccess(viewerId,share.ownerId,share.achievementId);
  const visible=visibleAchievementShare(share,access);
  if(visible)result.push(visible);
  if(result.length>=limit)break;
 }
 return result;
}
