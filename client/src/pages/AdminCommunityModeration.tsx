import {useState} from "react";
import {trpc} from "@/lib/trpc";
import {ACHIEVEMENTS} from "../../../shared/gamification-achievements";
export function AdminCommunityModeration(){
 const [owner,setOwner]=useState(""),[achievementId,setAchievementId]=useState<string>(ACHIEVEMENTS[0].id),[hidden,setHidden]=useState(true);
 const action=trpc.adminLab.setCommunityPublicationHidden.useMutation();
 const ownerId=Number(owner);
 const valid=/^\d+$/.test(owner)&&Number.isInteger(ownerId)&&ownerId>0&&ownerId<=2147483647&&ACHIEVEMENTS.some(a=>a.id===achievementId);
 return <section className="academy-state-card !m-0 !p-5">
 <h2 className="text-xl font-semibold">Moderação da comunidade</h2>
 <p>Controle experimental de publicações de conquistas. Não altera a assinatura ou o acesso ao curso.</p>
 <form className="grid gap-4 my-4 sm:grid-cols-2" onSubmit={e=>{e.preventDefault();if(valid&&!action.isPending&&window.confirm((hidden?"Ocultar":"Restaurar")+" esta publicação do membro "+ownerId+"?"))action.mutate({ownerId,achievementId,hidden});}}>
 <label>ID do membro<input className="block border rounded p-2 w-full" inputMode="numeric" value={owner} onChange={e=>{action.reset();setOwner(e.target.value);}} disabled={action.isPending}/></label>
 <label>Conquista<select className="block border rounded p-2 w-full" value={achievementId} onChange={e=>{action.reset();setAchievementId(e.target.value);}} disabled={action.isPending}>{ACHIEVEMENTS.map(a=><option key={a.id} value={a.id}>{a.id}</option>)}</select></label>
 <label>Ação<select className="block border rounded p-2 w-full" value={hidden?"hide":"restore"} onChange={e=>{action.reset();setHidden(e.target.value==="hide");}} disabled={action.isPending}><option value="hide">Ocultar publicação</option><option value="restore">Restaurar publicação</option></select></label>
 <button className="academy-primary" disabled={!valid||action.isPending}>{action.isPending?"Processando...":"Confirmar moderação"}</button>
 </form>
 {action.isError&&<p role="alert">Não foi possível processar a moderação. Verifique o membro, a publicação e a configuração experimental.</p>}
 {action.isSuccess&&<p role="status">Solicitação processada. Alterações efetivas são registradas na auditoria.</p>}
 </section>;
}
