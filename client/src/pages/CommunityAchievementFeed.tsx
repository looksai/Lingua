import {useState} from "react";
import {trpc} from "@/lib/trpc";

type Reason="spam"|"harassment"|"inappropriate"|"other";
type Cursor={publishedAtMs:number;id:number};
const REASONS:Record<Reason,string>={
 spam:"Spam ou publicidade indevida",
 harassment:"Assédio",
 inappropriate:"Conteúdo inadequado",
 other:"Outro motivo",
};

function PublicationActions({accountId,ownerId,achievementId,publishedAtMs}:{
 accountId:number;ownerId:number;achievementId:string;publishedAtMs:number;
}){
 const [reportOpen,setReportOpen]=useState(false);
 const [reason,setReason]=useState<Reason>("spam");
 const [reported,setReported]=useState(false);
 const [blocked,setBlocked]=useState(false);
 const utils=trpc.useUtils();
 const report=trpc.commercialLab.reportPublication.useMutation({
  onSuccess:()=>{setReported(true);setReportOpen(false);},
 });
 const block=trpc.commercialLab.setCommunityBlock.useMutation({
  onSuccess:()=>{setBlocked(true);void utils.commercialLab.achievementFeed.invalidate();void utils.commercialLab.blockedMembers.invalidate();},
 });
 if(ownerId===accountId)return null;
 return <div className="mt-3 grid gap-3">
  {blocked ? <p role="status">Membro bloqueado. Esta publicação não aparecerá nas próximas consultas.</p> : <>
   {reported ? <p role="status">Denúncia registrada para análise. A publicação não foi removida automaticamente.</p> : <>
    <button className="academy-secondary justify-self-start" type="button" aria-expanded={reportOpen}
      onClick={()=>{setReportOpen(open=>!open);report.reset();}}>
      {reportOpen?"Cancelar denúncia":"Denunciar publicação"}
    </button>
    {reportOpen&&<form className="grid gap-3 rounded-lg border p-3" onSubmit={event=>{
     event.preventDefault();
     if(!report.isPending)report.mutate({accountId,ownerId,achievementId,publishedAtMs,reason});
    }}>
     <label>Motivo da denúncia
      <select className="block w-full rounded border p-2" value={reason} disabled={report.isPending}
       onChange={event=>{setReason(event.target.value as Reason);report.reset();}}>
       {(Object.keys(REASONS) as Reason[]).map(value=><option key={value} value={value}>{REASONS[value]}</option>)}
      </select>
     </label>
     <p className="text-sm">A equipe analisará a denúncia. O envio não aplica punição automaticamente.</p>
     <button className="academy-primary justify-self-start" type="submit" disabled={report.isPending}>
      {report.isPending?"Registrando...":"Enviar denúncia"}
     </button>
     {report.isError&&<p role="alert">Não foi possível registrar a denúncia. A publicação pode não estar mais disponível.</p>}
    </form>}
   </>}
   <button className="academy-secondary justify-self-start" type="button" disabled={block.isPending}
    onClick={()=>{if(window.confirm("Bloquear membro #"+ownerId+"? Vocês deixarão de ver as publicações um do outro.")){
     block.mutate({accountId,targetId:ownerId,blocked:true});
    }}}>
    {block.isPending?"Bloqueando...":"Bloquear membro"}
   </button>
   {block.isError&&<p role="alert">Não foi possível bloquear este membro.</p>}
  </>}
 </div>;
}

// Laboratory-only feed: mounted within the member's protected /community screen.
export function CommunityAchievementFeed({accountId}:{accountId:number}){
 const [before,setBefore]=useState<Cursor|undefined>();
 const feed=trpc.commercialLab.achievementFeed.useQuery({accountId,limit:10,before},{
  retry:false,staleTime:0,gcTime:0,refetchOnWindowFocus:true,
 });
 return <section className="my-5 grid gap-4" aria-label="Conquistas da comunidade">
  <h2 className="text-xl font-semibold">Conquistas compartilhadas</h2>
  <p className="text-sm">Mostramos apenas publicações autorizadas de membros com acesso ativo. Nenhum texto, áudio ou resultado oficial de exames é compartilhado aqui.</p>
  {feed.isPending&&<p role="status">Carregando conquistas...</p>}
  {feed.isError&&<p role="alert">Não foi possível consultar o feed. <button type="button" onClick={()=>void feed.refetch()}>Tentar novamente</button></p>}
  {feed.data&&!feed.isError&&<>
   {feed.data.items.length===0&&<p>{before?"Nenhuma publicação adicional disponível.":"Ainda não há conquistas públicas disponíveis."}</p>}
   <div className="grid gap-4">
    {feed.data.items.map(item=><article className="rounded-xl border p-4" key={JSON.stringify([item.ownerId,item.achievementId,item.publishedAtMs])}>
     <p className="font-semibold">{item.title}</p>
     <p className="text-sm">Membro #{item.ownerId} · {new Date(item.publishedAtMs).toLocaleDateString("pt-BR")}</p>
     <PublicationActions accountId={accountId} ownerId={item.ownerId} achievementId={item.achievementId} publishedAtMs={item.publishedAtMs}/>
    </article>)}
   </div>
   <div className="flex flex-wrap gap-3">
    <button className="academy-secondary" type="button" disabled={before===undefined} onClick={()=>setBefore(undefined)}>Primeira página</button>
    <button className="academy-secondary" type="button" disabled={feed.data.nextCursor===null}
     onClick={()=>setBefore(feed.data!.nextCursor??undefined)}>Próxima página</button>
    <button className="academy-secondary" type="button" onClick={()=>void feed.refetch()}>Atualizar</button>
   </div>
  </>}
 </section>;
}
