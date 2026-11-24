/**
 * LAB-ONLY replacement for @/lib/trpc, injected by vite.tutorchat.qa.config.ts.
 * It never imports production tRPC, makes HTTP requests, or reads real profiles.
 * The tested TutorChat.tsx is unmodified.
 */
type RpcCall={name:string;input:unknown};
type PendingReply={resolve:(value:unknown)=>void;reject:(error:Error)=>void};
const answer={
  text:'Resposta sintética Naruto: "Hello, how are you?" significa "Olá, como vai?".',
  source:"ai" as const,audioBase64:null,voiceStatus:"off" as const,catalogTask:null,
  memoryCandidate:null,
};
const calls:RpcCall[]=[];
let holdNext=false;
let pending:PendingReply|null=null;
export const qaTutorRpc={
  calls,
  holdNextReply(){
    if(pending)throw Error("already holding a reply");
    holdNext=true;
  },
  resolveHeldReply(text="Resposta atrasada da conta anterior — NÃO EXIBIR"){
    const p=pending;
    if(!p)throw Error("no pending reply");
    pending=null;p.resolve({...answer,text});
  },
  rejectHeldReply(){
    const p=pending;
    if(!p)throw Error("no pending reply");
    pending=null;p.reject(new Error("synthetic network failure"));
  },
  resetCalls(){calls.length=0;},
  pendingCount(){return Number(Boolean(pending));},
};
const capabilities={data:{
  chat:true,provider:"groq" as const,tts:true,asr:true,
  neuralEnglish:true,memory:false,geminiDemo:false,
},isLoading:false,isPending:false,error:null,refetch:async()=>({data:capabilities.data})};
const privacyPreferences={data:{
  serviceAccepted:new URLSearchParams(window.location.search).get("accepted")==="1",
  personalMemoryEnabled:new URLSearchParams(window.location.search).get("accepted")==="1",
  legacyAccount:new URLSearchParams(window.location.search).get("accepted")!=="1",
},isError:false,isPending:false,isLoading:false,
  refetch:async()=>({data:privacyPreferences.data})};
const placement={data:{nextTask:null,answers:[]},isPending:false,isLoading:false,
  isError:false,refetch:async()=>({data:placement.data})};
const emptyMemory={data:[],isError:false,isPending:false,isLoading:false,
  refetch:async()=>({data:[]})};
async function dispatch(name:string,input:unknown):Promise<any>{
  calls.push({name,input});
  if(name==="reply"){
    if(holdNext){
      holdNext=false;
      return await new Promise((resolve,reject)=>{pending={resolve,reject};});
    }
    return {...answer};
  }
  if(name==="catalogPendingTask")return null;
  if(name==="catalogRenderAck")return {status:"rejected"};
  if(name==="neuralEnglish")throw Error("synthetic neural service unreachable");
  if(name==="welcomeAudio")return {
    text:"Bem-vindo ao laboratório",audioBase64:null,voiceStatus:"unavailable",
  };
  if(name==="transcribe")return {text:"Hello",provider:"whisper"};
  if(name==="memoryList")return [];
  if(name==="placementSubmit")return {ok:true};
  if(name==="placementGenerate")return {source:"rule_based"};
  return {success:true};
}
const mutation=(name:string)=>({
  isPending:false,
  mutateAsync:(input?:unknown)=>dispatch(name,input),
});
const makeMutation=(name:string)=>({useMutation:()=>mutation(name)});
const disabledQuery={useQuery:()=>emptyMemory};
export const trpc={
  tutor:{
    capabilities:{useQuery:()=>capabilities},
    privacyPreferences:{useQuery:()=>privacyPreferences},
    updatePersonalMemory:makeMutation("updatePersonalMemory"),
    reply:makeMutation("reply"),
    catalogRenderAck:makeMutation("catalogRenderAck"),
    catalogPendingTask:makeMutation("catalogPendingTask"),
    memoryList:disabledQuery,
    memorySave:makeMutation("memorySave"),
    memoryDelete:makeMutation("memoryDelete"),
    memoryClear:makeMutation("memoryClear"),
    transcribe:makeMutation("transcribe"),
    welcomeAudio:makeMutation("welcomeAudio"),
    geminiDemo:makeMutation("geminiDemo"),
    neuralEnglish:makeMutation("neuralEnglish"),
  },
  placement:{
    me:{useQuery:()=>placement},
    submit:makeMutation("placementSubmit"),
    generate:makeMutation("placementGenerate"),
  },
};
