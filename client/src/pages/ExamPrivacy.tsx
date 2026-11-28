import {useState} from "react";
import {trpc} from "@/lib/trpc";

export default function ExamPrivacy(){
 const identity=trpc.auth.me.useQuery(undefined,{retry:false});
 const status=trpc.exams.privacyStatus.useQuery(undefined,{enabled:!!identity.data,retry:false});
 const exportPage=trpc.exams.privacyExport.useMutation();
 const clear=trpc.exams.privacyClear.useMutation();
 const [cursor,setCursor]=useState<number|null>(null);
 const [done,setDone]=useState(false);
 const [notice,setNotice]=useState("");
 const busy=exportPage.isPending||clear.isPending;
 async function download(){
  setNotice("");
  try{
   const page=await exportPage.mutateAsync({beforeId:cursor});
   const url=URL.createObjectURL(new Blob([JSON.stringify(page,null,2)],{type:"application/json"}));
   const a=document.createElement("a");a.href=url;a.download="lingua-exam-history-"+(cursor??"latest")+".json";document.body.appendChild(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
   setCursor(page.nextCursor);setDone(page.nextCursor===null);
   setNotice(page.nextCursor===null?"Última parte da exportação preparada.":"Parte preparada. Continue para exportar os registros anteriores.");
  }catch{setNotice("Não foi possível exportar seus dados.");}
 }
 async function erase(){
  if(!window.confirm("Excluir definitivamente seu objetivo, tentativas e histórico do Centro de Exames?"))return;
  setNotice("");
  try{await clear.mutateAsync({confirm:true});setCursor(null);setDone(false);setNotice("Dados do Centro de Exames excluídos.");}
  catch{setNotice("Não foi possível confirmar a exclusão.");}
 }
 return <main className="academy-interior px-5 py-8"><section className="academy-state-card"><h1 className="font-display text-3xl">Privacidade do Centro de Exames</h1><p>Consulte ou exclua seus próprios registros de preparação, mesmo sem acesso Premium. Isto não exclui sua conta nem o progresso de outros módulos.</p>
 {identity.isPending?<p role="status">Confirmando sessão...</p>:identity.isError?<p role="alert">Não foi possível confirmar a sessão.</p>:!identity.data?<a className="academy-primary" href="/login">Entrar na conta</a>:status.isPending?<p role="status">Verificando disponibilidade...</p>:status.isError?<p role="alert">Não foi possível verificar a disponibilidade dos dados.</p>:!status.data?.enabled?<p>O armazenamento permanente do Centro de Exames ainda não está disponível.</p>:<>
 <p>Exporte em arquivos JSON de até 50 atividades por parte. Se houver mais registros, continue até a última parte. Alterações simultâneas podem aparecer em uma nova exportação.</p>
 <button className="academy-primary" disabled={busy||done} onClick={()=>void download()}>{cursor===null?"Exportar meus dados":"Exportar próxima parte"}</button>
 {done&&<button className="academy-secondary" disabled={busy} onClick={()=>{setCursor(null);setDone(false);}}>Iniciar nova exportação</button>}
 <button className="academy-secondary" disabled={busy} onClick={()=>void erase()}>Excluir dados do Centro de Exames</button>
 </>}
 {notice&&<p role="status">{notice}</p>}<a href="/">Voltar ao Lingua</a>
 </section></main>;
}
