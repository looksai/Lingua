import {useState} from "react";
import {trpc} from "@/lib/trpc";
import {ACHIEVEMENTS} from "../../../shared/gamification-achievements";
export function AdminCommunityModeration(){
 const [owner,setOwner]=useState(""),[achievementId,setAchievementId]=useState<string>(ACHIEVEMENTS[0].id),[hidden,setHidden]=useState(true);
 const [beforeId,setBeforeId]=useState<number|undefined>(undefined);
 const utils=trpc.useUtils();
 const audit=trpc.adminLab.communityPublicationAudit.useQuery({beforeId},{retry:false});
 const action=trpc.adminLab.setCommunityPublicationHidden.useMutation({onSuccess:()=>{setBeforeId(undefined);void utils.adminLab.communityPublicationAudit.invalidate();}});
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
 <h3 className="text-lg font-semibold mt-6">Histórico de moderação</h3>
 {audit.isPending&&<p role="status">Carregando histórico...</p>}
 {audit.isError&&<p role="alert">Histórico indisponível.</p>}
 {audit.data&&!audit.isError&&<>
 <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{["Administrador","Membro","Conquista","Ação","Data UTC"].map(label=><th scope="col" className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{audit.data.items.map(row=><tr className="border-t" key={row.id}><td className="p-2">{row.actorId}</td><td className="p-2">{row.ownerId}</td><td className="p-2">{row.achievementId}</td><td className="p-2">{row.hidden?"Ocultada":"Restaurada"}</td><td className="p-2">{new Date(row.occurredAtMs).toISOString()}</td></tr>)}</tbody></table></div>
 {audit.data.items.length===0&&<p>Nenhuma ação nesta página.</p>}
 <div className="flex gap-3"><button className="academy-secondary" disabled={beforeId===undefined} onClick={()=>setBeforeId(undefined)}>Primeira página</button><button className="academy-secondary" disabled={audit.data.nextBeforeId===null} onClick={()=>setBeforeId(audit.data?.nextBeforeId??undefined)}>Próxima página</button></div>
 </>}
 </section>;
}
