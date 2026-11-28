import {ACHIEVEMENTS} from "../../../shared/gamification-achievements";
import {useState} from "react";
import {trpc} from "@/lib/trpc";
export function AdminCommunityReports(){
 const [notice,setNotice]=useState("");
 const [status,setStatus]=useState<"pending"|"dismissed"|"actioned">("pending"),[beforeId,setBeforeId]=useState<number|undefined>();
 const utils=trpc.useUtils();
 const summary=trpc.adminLab.communityReportSummary.useQuery(undefined,{retry:false});
 const queue=trpc.adminLab.communityReports.useQuery({status,beforeId},{retry:false});
 const refresh=()=>{void utils.adminLab.communityReports.invalidate();void utils.adminLab.communityPublicationAudit.invalidate();void utils.adminLab.communityReportSummary.invalidate();};
 const dismiss=trpc.adminLab.dismissCommunityReport.useMutation({onSuccess:()=>{setNotice("Denúncia descartada.");refresh();}});
 const action=trpc.adminLab.actionCommunityReport.useMutation({onSuccess:()=>{setNotice("Denúncia concluída e publicação moderada.");refresh();}});
 const busy=dismiss.isPending||action.isPending;
 return <section className="academy-state-card !m-0 !p-5">
 <h2 className="text-xl font-semibold">Fila de denúncias</h2>{summary.data&&<p role="status">Pendentes: <strong>{summary.data.pending}</strong> · Encerradas sem ação: {summary.data.dismissed} · Moderação aplicada: {summary.data.actioned}</p>}{summary.isError&&<p role="alert">Resumo de denúncias indisponível.</p>}<p className="text-sm">A moderação é manual: receber uma denúncia não oculta a conquista.</p>
 <label>Situação<select className="block border rounded p-2" value={status} disabled={busy} onChange={e=>{setStatus(e.target.value==="dismissed"?"dismissed":e.target.value==="actioned"?"actioned":"pending");setBeforeId(undefined);dismiss.reset();action.reset();setNotice("");}}><option value="pending">Pendentes</option><option value="dismissed">Descartadas</option><option value="actioned">Com ação aplicada</option></select></label>
 {notice&&<p role="status">{notice}</p>}
 {queue.isPending&&<p role="status">Carregando denúncias...</p>}
 {queue.isError&&<p role="alert">Fila indisponível.</p>}
 {(dismiss.isError||action.isError)&&<p role="alert">Não foi possível resolver a denúncia. A publicação pode ter sido alterada.</p>}
 {queue.data&&!queue.isError&&<>
 {queue.data.items.length===0&&<p>Nenhuma denúncia nesta página.</p>}
 <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr>{["ID","Denunciante","Autor","Conquista","Publicada UTC","Motivo","Registro UTC","Resolução"].map(label=><th scope="col" className="p-2" key={label}>{label}</th>)}</tr></thead><tbody>{queue.data.items.map(row=><tr key={row.id} className="border-t"><td className="p-2">{row.id}</td><td className="p-2">{row.reporterId}</td><td className="p-2">{row.ownerId}</td><td className="p-2">{ACHIEVEMENTS.find(a=>a.id===row.achievementId)?.title??row.achievementId}</td><td className="p-2">{new Date(row.publishedAtMs).toISOString()}</td><td className="p-2">{{spam:"Spam",harassment:"Assédio",inappropriate:"Inadequado",other:"Outro"}[row.reason]}</td><td className="p-2">{new Date(row.createdAtMs).toISOString()}</td><td className="p-2">{row.status==="pending"?<div className="flex flex-wrap gap-2"><button className="academy-secondary" disabled={busy} onClick={()=>{if(window.confirm("Descartar denúncia "+row.id+"?")){action.reset();dismiss.mutate({reportId:row.id});}}}>Descartar</button><button className="academy-primary" disabled={busy} onClick={()=>{if(window.confirm("Ocultar a publicação denunciada e encerrar a denúncia "+row.id+"?")){dismiss.reset();action.mutate({reportId:row.id});}}}>Ocultar</button></div>:<span>Admin {row.resolvedBy} · {row.resolvedAtMs===null?"—":new Date(row.resolvedAtMs).toISOString()}</span>}</td></tr>)}</tbody></table></div>
 <div className="flex gap-3"><button className="academy-secondary" disabled={busy||beforeId===undefined} onClick={()=>setBeforeId(undefined)}>Primeira página</button><button className="academy-secondary" disabled={busy||queue.data.nextBeforeId===null} onClick={()=>setBeforeId(queue.data?.nextBeforeId??undefined)}>Próxima página</button></div>
 </>}
 </section>;
}
