import {useState,useRef,useEffect} from "react";
import {trpc} from "@/lib/trpc";

export default function ExamPrivacy(){
 const identity=trpc.auth.me.useQuery(undefined,{retry:false});
 return <main className="academy-interior px-5 py-8"><section className="academy-state-card"><h1 className="font-display text-3xl">Privacidade do Centro de Exames</h1><p>Consulte ou exclua seus próprios registros de preparação, mesmo sem acesso Premium. Isto não exclui sua conta nem o progresso de outros módulos.</p>
 {identity.isPending?<p role="status">Confirmando sessão...</p>:identity.isError?<p role="alert">Não foi possível confirmar a sessão.</p>:!identity.data?<a className="academy-primary" href="/login">Entrar na conta</a>:<OwnerPrivacy key={identity.data.id} accountId={identity.data.id}/>}<a href="/">Voltar ao Lingua</a>
 </section></main>;
}

function OwnerPrivacy({accountId}:{accountId:number}){
 const mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;};},[]);
 const status=trpc.exams.privacyStatus.useQuery(undefined,{retry:false});
 const exportPage=trpc.exams.privacyExport.useMutation();
 const remove=trpc.exams.privacyRemoveItinerary.useMutation();
 const clear=trpc.exams.privacyClear.useMutation();
 const [cursor,setCursor]=useState<number|null>(null);
 const [done,setDone]=useState(false);
 const [notice,setNotice]=useState("");
 const busy=exportPage.isPending||clear.isPending||remove.isPending;
 async function download(){
  setNotice("");
  try{
   const page=await exportPage.mutateAsync({beforeId:cursor,accountId});
   if(!mounted.current)return;
   const url=URL.createObjectURL(new Blob([JSON.stringify(page,null,2)],{type:"application/json"}));
   const a=document.createElement("a");a.href=url;a.download="lingua-exam-history-"+(cursor??"latest")+".json";document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
   setCursor(page.nextCursor);setDone(page.nextCursor===null);
   setNotice(page.nextCursor===null?"Última parte da exportação preparada.":"Parte preparada. Continue para exportar os registros anteriores.");
  }catch{setNotice("Não foi possível exportar seus dados.");}
 }
 async function forgetItinerary(){
  const revision=status.data?.itineraryRevision;
  if(!revision || !window.confirm("Excluir somente o roteiro integrado salvo?"))return;
  setNotice("");
  try{
   await remove.mutateAsync({accountId,revision});
   setNotice("Roteiro salvo excluído.");
   setDone(false);setCursor(null);
  }catch{setNotice("Não foi possível excluir o roteiro. Confira a versão atual.");}
  await status.refetch();
 }
 async function erase(){
  if(!window.confirm("Excluir definitivamente seu roteiro salvo, objetivo, tentativas e histórico do Centro de Exames?"))return;
  setNotice("");
  try{await clear.mutateAsync({confirm:true,accountId});setCursor(null);setDone(false);setNotice("Dados do Centro de Exames excluídos.");await status.refetch();}
  catch{setNotice("Não foi possível confirmar a exclusão.");}
 }
 return <>{status.isPending?<p role="status">Verificando disponibilidade...</p>:status.isError?<p role="alert">Não foi possível verificar a disponibilidade dos dados.</p>:!status.data?.enabled?<p>O armazenamento permanente do Centro de Exames ainda não está disponível.</p>:<>
 <p>A exportação inclui o roteiro integrado que você autorizou salvar. Exporte em arquivos JSON de até 50 atividades por parte. Se houver mais registros, continue até a última parte. Alterações simultâneas podem aparecer em uma nova exportação.</p>
 <button className="academy-primary" disabled={busy||done} onClick={()=>void download()}>{cursor===null?"Exportar meus dados":"Exportar próxima parte"}</button>
 {done&&<button className="academy-secondary" disabled={busy} onClick={()=>{setCursor(null);setDone(false);}}>Iniciar nova exportação</button>}
 {status.data?.accountId===accountId && status.data.itineraryRevision && <button className="academy-secondary" disabled={busy} onClick={()=>void forgetItinerary()}>Excluir somente meu roteiro salvo</button>}
 <button className="academy-secondary" disabled={busy} onClick={()=>void erase()}>Excluir dados do Centro de Exames</button>
 </>}
 {notice&&<p role="status">{notice}</p>}</>;
}
