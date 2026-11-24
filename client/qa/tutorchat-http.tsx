import React,{useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {httpBatchLink} from "@trpc/client";
import superjson from "superjson";
import {trpc} from "../src/lib/trpc";
import TutorChat, {type TutorVoiceSettings} from "../src/components/TutorChat";

/**
 * Uses the SAME client tRPC + React Query providers as client/src/main.tsx.
 * Account email is a DISPLAY/REACT-SCOPE HINT ONLY: the server authorizes
 * every call using an independently signed, httpOnly synthetic JWT.
 */
function Fixture(){
  const [email,setEmail]=useState("qa-a@synthetic.invalid");
  const [prefs,setPrefs]=useState<TutorVoiceSettings>({
    voiceURI:"",rate:1,pitch:1,neuralVoice:"troy",
  });
  const queryClient=useMemo(()=>new QueryClient({defaultOptions:{
    queries:{retry:false,refetchOnWindowFocus:false},
    mutations:{retry:false},
  }}),[]);
  const rpcClient=useMemo(()=>trpc.createClient({links:[
    httpBatchLink({url:"/api/trpc",transformer:superjson,
      fetch(input,init){return globalThis.fetch(input,{...(init??{}),credentials:"include"});}
    }),
  ]}),[]);
  (window as any).__qaFullHttp={
    account:()=>email,
    changeEmail:(next:"a"|"b")=>setEmail("qa-"+next+"@synthetic.invalid"),
  };
  return <trpc.Provider client={rpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <TutorChat
        profile={{tutorName:"Naruto",tutorPersona:"welcoming",interest:"work"}}
        accountEmail={email}
        voiceSettings={prefs}
        onVoiceSettingsChange={setPrefs}
        onOpenTutorSettings={()=>{}}
        placementRequested={false}
        onPlacementCompleted={()=>{}}
      />
      <div style={{position:"fixed",left:4,top:4,zIndex:100,
        padding:6,background:"white",border:"1px solid #bbb"}}>
        <button type="button" data-testid="qa-switch-account"
          onClick={()=>setEmail(old=>old.includes("qa-a")?
            "qa-b@synthetic.invalid":"qa-a@synthetic.invalid")}>
          Trocar identificação fictícia
        </button>
        <output data-testid="qa-email">{email}</output>
      </div>
    </QueryClientProvider>
  </trpc.Provider>;
}
const root=document.getElementById("qa-root");
if(!root)throw new Error("Missing isolated full TutorChat HTTP root");
createRoot(root).render(<Fixture/>);
