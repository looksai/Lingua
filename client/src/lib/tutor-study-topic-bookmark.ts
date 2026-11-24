import {getMicrocompetency} from "@shared/pedagogy/microcompetency-catalog";

/**
 * Local, separately opted-in *topic bookmark*. Never a learner evidence,
 * SRS schedule, CAL snapshot or trusted assessment.
 */
export const STUDY_TOPIC_BOOKMARK_TTL_MS=7*24*60*60*1000;
type LocalStore=Pick<Storage,"getItem"|"setItem"|"removeItem">;
export type StudyTopicBookmark=Readonly<{competencyId:string;savedAt:number}>;
export type StudyTopicBookmarkState=Readonly<{enabled:boolean;bookmark:StudyTopicBookmark|null}>;

export function studyTopicBookmarkKeys(email:string,provider:string){
  const scope=encodeURIComponent(email.trim().toLowerCase())+":"+encodeURIComponent(provider);
  return {
    preference:"lingua:study-topic-choice:v1:"+scope,
    bookmark:"lingua:study-topic-bookmark:v1:"+scope,
  };
}
function permitted(competencyId:string):boolean {
  return Boolean(getMicrocompetency(competencyId));
}
export function loadStudyTopicBookmark(
  store:LocalStore,keys:ReturnType<typeof studyTopicBookmarkKeys>,now=Date.now(),
):StudyTopicBookmarkState {
  try{
    if(store.getItem(keys.preference)!=="true")return {enabled:false,bookmark:null};
    const raw=store.getItem(keys.bookmark);
    if(!raw)return {enabled:true,bookmark:null};
    if(raw.length>300){store.removeItem(keys.bookmark);return {enabled:true,bookmark:null};}
    let parsed:{version?:unknown;competencyId?:unknown;savedAt?:unknown}|null;
    try{parsed=JSON.parse(raw) as typeof parsed;}
    catch{
      try{store.removeItem(keys.bookmark);}catch{/* storage denied */}
      // A corrupt value is not a withdrawal of the separate opt-in.
      return {enabled:true,bookmark:null};
    }
    const valid=parsed!==null&&parsed.version===1&&typeof parsed.competencyId==="string"&&
      permitted(parsed.competencyId)&&typeof parsed.savedAt==="number"&&
      Number.isFinite(parsed.savedAt)&&parsed.savedAt>=0&&
      parsed.savedAt<=now+60_000&&now-parsed.savedAt<=STUDY_TOPIC_BOOKMARK_TTL_MS;
    if(!valid){store.removeItem(keys.bookmark);return {enabled:true,bookmark:null};}
    return {enabled:true,bookmark:{competencyId:parsed.competencyId as string,savedAt:parsed.savedAt as number}};
  }catch{return {enabled:false,bookmark:null};}
}
export function setStudyTopicBookmarkEnabled(
  store:LocalStore,keys:ReturnType<typeof studyTopicBookmarkKeys>,enabled:boolean,
):boolean {
  try{
    if(enabled)store.setItem(keys.preference,"true");
    else {store.removeItem(keys.preference);store.removeItem(keys.bookmark);}
    return true;
  }catch{return false;}
}
export function saveStudyTopicBookmark(
  store:LocalStore,keys:ReturnType<typeof studyTopicBookmarkKeys>,competencyId:string,now=Date.now(),
):boolean {
  if(!permitted(competencyId)||!Number.isSafeInteger(now)||now<0)return false;
  try{
    if(store.getItem(keys.preference)!=="true")return false;
    // Store only an allowlisted curriculum ID, never text/audio/answer/grade.
    store.setItem(keys.bookmark,JSON.stringify({version:1,competencyId,savedAt:now}));
    return true;
  }catch{return false;}
}
/** A new lesson choice, not a claim of resumed mastery or independent typed work. */
export function studyTopicRestartRequest(competencyId:string):{
  message:string;catalogCompetencyId:string;catalogRestart:true;
}|null{
  if(!permitted(competencyId))return null;
  return {
    message:"Quero recomeçar este assunto do início, sem recuperar resultados anteriores.",
    catalogCompetencyId:competencyId,catalogRestart:true,
  };
}
export function clearStudyTopicBookmark(
  store:LocalStore,keys:ReturnType<typeof studyTopicBookmarkKeys>,disable=false,
):boolean {
  try{
    store.removeItem(keys.bookmark);
    if(disable)store.removeItem(keys.preference);
    return true;
  }catch{return false;}
}
