import {TUTOR_MAX_TEXT, type TutorHistory} from "@shared/tutor";

export type StoredTutorMessage = TutorHistory & {id:number; source?:"local"|"ai"};
export const CHAT_MEMORY_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_MESSAGES=24;
const STORE_VERSION=1;
type Store=Pick<Storage,"getItem"|"setItem"|"removeItem">;

export function conversationStorageKeys(email:string,provider:string) {
  const scope=encodeURIComponent(email.trim().toLowerCase())+":"+encodeURIComponent(provider);
  return {preference:"lingua:tutor-memory-choice:v1:"+scope, conversation:"lingua:tutor-conversation:v1:"+scope};
}

function sanitizeMessages(raw:unknown):StoredTutorMessage[] {
  if(!Array.isArray(raw)) return [];
  return raw.slice(-MAX_MESSAGES).filter((m):m is StoredTutorMessage=>
    m!==null && typeof m==="object" &&
    Number.isSafeInteger(m.id) && m.id>0 &&
    (m.role==="assistant"||m.role==="user") &&
    typeof m.text==="string" && m.text.length>0 && m.text.length<=TUTOR_MAX_TEXT &&
    (m.source===undefined||m.source==="local"||m.source==="ai")
  ).map(m=>({id:m.id,role:m.role,text:m.text,source:m.source}));
}

export function loadChatMemory(store:Store,keys:ReturnType<typeof conversationStorageKeys>,now=Date.now()){
  try{
    if(store.getItem(keys.preference)!=="true") return {enabled:false,messages:[] as StoredTutorMessage[]};
    const raw=store.getItem(keys.conversation);
    if(!raw) return {enabled:true,messages:[] as StoredTutorMessage[]};
    const saved=JSON.parse(raw) as {version?:number;savedAt?:number;messages?:unknown};
    if(saved?.version!==STORE_VERSION||typeof saved.savedAt!=="number"||
       saved.savedAt>now+60_000||now-saved.savedAt>CHAT_MEMORY_TTL_MS){
      store.removeItem(keys.conversation);
      return {enabled:true,messages:[] as StoredTutorMessage[]};
    }
    return {enabled:true,messages:sanitizeMessages(saved.messages)};
  }catch{return {enabled:false,messages:[] as StoredTutorMessage[]};}
}

export function saveChatMemory(store:Store,keys:ReturnType<typeof conversationStorageKeys>,messages:readonly StoredTutorMessage[],now=Date.now()){
  try{
    // Text only. Never persist recordings, audioBase64 or generated neural WAV.
    const clean=sanitizeMessages(messages);
    store.setItem(keys.conversation,JSON.stringify({version:STORE_VERSION,savedAt:now,messages:clean}));
    return true;
  }catch{return false;}
}
export function enableChatMemory(store:Store,keys:ReturnType<typeof conversationStorageKeys>){
  try{store.setItem(keys.preference,"true");return true;}catch{return false;}
}
export function clearChatMemory(store:Store,keys:ReturnType<typeof conversationStorageKeys>,disable=false){
  try{store.removeItem(keys.conversation);if(disable)store.removeItem(keys.preference);}catch{/* storage unavailable */}
}
