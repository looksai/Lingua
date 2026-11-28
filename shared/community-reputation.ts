// Separate from academic XP and proficiency. Inputs must be authorized server evidence.
export type HelpfulEvidence={contributionId:string;authorId:number;reviewerId:number;acceptedAtMs:number;active:boolean};
export function communityReputation(ownerId:number,evidence:readonly HelpfulEvidence[]){
 if(!Number.isSafeInteger(ownerId)||ownerId<=0)throw Error("Invalid reputation owner");
 const unique=new Set<string>(),contributors=new Set<number>(),daily=new Map<string,number>();
 let helpful=0;
 const ordered=[...evidence].sort((a,b)=>a.acceptedAtMs-b.acceptedAtMs||a.reviewerId-b.reviewerId||a.contributionId.localeCompare(b.contributionId));
 for(const e of ordered){
  if(e.authorId!==ownerId||e.reviewerId===ownerId||!Number.isSafeInteger(e.reviewerId)||e.reviewerId<=0||!e.active||!e.contributionId.trim()||!Number.isSafeInteger(e.acceptedAtMs)||e.acceptedAtMs<0)continue;
  const key=JSON.stringify([e.reviewerId,e.contributionId]);
  if(unique.has(key))continue;
  unique.add(key);
  const bucket=JSON.stringify([e.reviewerId,Math.floor(e.acceptedAtMs/86400000)]);
  const count=daily.get(bucket)??0;
  if(count>=3)continue;
  daily.set(bucket,count+1);contributors.add(e.reviewerId);helpful++;
 }
 return {helpfulRecognitions:helpful,distinctReviewers:contributors.size};
}
