import {useEffect,useState} from "react";
import PublicLivePreview,{type PublicLivePreviewState} from "./PublicLivePreview";
export type PublicLiveLookup=(token:string,signal:AbortSignal)=>Promise<{title:string;partnerName:string;scheduledAt:string;canWatch:boolean}|null>;
export default function PublicLiveController({token,lookup}:{token:string;lookup:PublicLiveLookup}){
 const [attempt,setAttempt]=useState(0);
 const [result,setResult]=useState<{token:string;attempt:number;state:PublicLivePreviewState}|null>(null);
 useEffect(()=>{
  const controller=new AbortController();
  const finish=(state:PublicLivePreviewState)=>{if(!controller.signal.aborted)setResult({token,attempt,state});};
  if(!/^[A-Za-z0-9_-]{43}$/.test(token)){finish({kind:"unavailable"});return ()=>controller.abort();}
  Promise.resolve().then(()=>lookup(token,controller.signal)).then(event=>finish(event?{kind:"event",...event}:{kind:"unavailable"})).catch(()=>finish({kind:"error"}));
  return ()=>controller.abort();
 },[token,lookup,attempt]);
 const state=result?.token===token&&result.attempt===attempt?result.state:{kind:"loading"} as const;
 return <PublicLivePreview state={state} onRetry={()=>setAttempt(n=>n+1)}/>;
}
