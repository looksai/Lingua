import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { INTEGRATED_STAGES, INTEGRATED_VERSION, type IntegratedSession } from "@shared/exam-integrated-contract";

export default function ExamItineraryBookmark({accountId,session,onRestore}:{
  accountId:number;
  session:IntegratedSession;
  onRestore:(session:IntegratedSession)=>void;
}) {
  const utils=trpc.useUtils();
  const query=trpc.exams.itinerary.useQuery({accountId},{retry:false,refetchOnWindowFocus:false,staleTime:0,gcTime:0});
  const save=trpc.exams.saveItinerary.useMutation();
  const [notice,setNotice]=useState("");
  const stored=query.data?.saved;
  const bookmark={version:INTEGRATED_VERSION,variant:session.variant,statuses:session.outcomes.map(o=>o.status)} as const;
  async function persist(){
    if(!query.data || query.isFetching || save.isPending || !bookmark.statuses.length)return;
    setNotice("");
    try{
      await save.mutateAsync({accountId,consent:true,expectedRevision:stored?.revision??null,bookmark});
      await utils.exams.itinerary.invalidate();
      setNotice("Roteiro salvo na sua conta.");
    }catch{
      setNotice("Não foi possível confirmar a gravação. Confira o roteiro salvo antes de tentar novamente.");
      await query.refetch();
    }
  }
  return <section className="exam-panel" aria-label="Roteiro salvo">
    <h3>Guardar meu roteiro</h3>
    <p>Ao salvar, você autoriza guardar na sua conta a variante do IELTS e a situação de cada etapa. Textos, áudios e acertos ficam fora desta cópia.</p>
    {query.isPending ? <p role="status">Consultando roteiro...</p> : query.isError ?
      <button onClick={()=>void query.refetch()}>Tentar consultar novamente</button> : <>
      {stored && <p>Roteiro salvo · {stored.bookmark.variant==="ielts-academic"?"Academic":"General Training"} · {stored.bookmark.statuses.length} de 4 etapas registradas.</p>}
      <button className="academy-secondary" disabled={!session.outcomes.length||query.isFetching||save.isPending} onClick={()=>void persist()}>{stored?"Substituir roteiro salvo":"Salvar roteiro na minha conta"}</button>
      {stored && <button className="academy-secondary" disabled={save.isPending||query.isFetching} onClick={()=>{
        if(session.outcomes.length && !window.confirm("Substituir o roteiro desta sessão pelo roteiro salvo?"))return;
        onRestore({variant:stored.bookmark.variant,outcomes:stored.bookmark.statuses.map((status,i)=>({stage:INTEGRATED_STAGES[i]!,status}))});
        setNotice("Roteiro retomado.");
      }}>Retomar roteiro salvo</button>}
    </>}
    {notice && <p role="status">{notice}</p>}
    <a href="/exam-privacy">Exportar ou excluir meus dados de exames</a>
  </section>;
}
