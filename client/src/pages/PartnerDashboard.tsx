import {useState,type FormEvent} from "react";
import {Building2,CalendarDays,ArrowLeft,Video} from "lucide-react";
import "./academy-interior.css";
import {Link} from "wouter";
import {trpc} from "@/lib/trpc";
const labels={draft:"Rascunho",published:"Publicado",live:"Ao vivo",ended:"Encerrado",cancelled:"Cancelado"} as const;
const actions={draft:["published","cancelled"],published:["live","cancelled"],live:["ended","cancelled"],ended:[],cancelled:[]} as const;
const button="academy-secondary text-sm";
function InviteControls({partnerId,eventId}:{partnerId:number;eventId:number}){
 const inventory=trpc.partnerInvites.list.useQuery({partnerId,eventId},{retry:false});
 const issue=trpc.partnerInvites.issue.useMutation();
 const revoke=trpc.partnerInvites.revoke.useMutation();
 const [token,setToken]=useState("");
 const [message,setMessage]=useState("");
 const busy=issue.isPending||revoke.isPending;
 async function generate(){
  setMessage("");
  try{const result=await issue.mutateAsync({partnerId,eventId,expiresAt:null});setToken(result.token);await inventory.refetch();}catch{setMessage("Não foi possível gerar o convite.");}
 }
 async function cancel(){
  setMessage("");
  try{
   const bytes=Uint8Array.from(atob(token.replace(/-/g,"+").replace(/_/g,"/")+"="),c=>c.charCodeAt(0));
   const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("");
   await revoke.mutateAsync({partnerId,eventId,digest});setToken("");setMessage("Convite revogado.");await inventory.refetch();
  }catch{setMessage("Não foi possível revogar o convite.");}
 }
 async function revokeSaved(digest:string){
  setMessage("");
  try{await revoke.mutateAsync({partnerId,eventId,digest});setToken("");await inventory.refetch();setMessage("Convite revogado.");}catch{setMessage("Não foi possível revogar o convite.");}
 }
 const link=token?window.location.origin+"/live#"+token:"";
 return <div className="academy-invite-panel space-y-3">
 {!token?<button className={button} disabled={busy} onClick={()=>void generate()}>Gerar convite público</button>:<>
 <label>Link público<input readOnly className="block w-full rounded border p-2" value={link} onFocus={e=>e.target.select()}/></label>
 <div className="flex flex-wrap gap-2"><button className={button} onClick={()=>void navigator.clipboard.writeText(link).then(()=>setMessage("Link copiado."),()=>setMessage("Selecione e copie o link manualmente."))}>Copiar link</button><button className={button} disabled={busy} onClick={()=>void cancel()}>Revogar convite</button></div>
 <p className="text-xs">Guarde o link. Nesta versão experimental, ele não será recuperado após recarregar a página.</p>
 </>}
 <h4 className="font-semibold">Convites emitidos</h4>
 {inventory.isPending?<p role="status">Carregando convites...</p>:inventory.error?<p role="alert">Não foi possível consultar os convites. <button className={button} onClick={()=>void inventory.refetch()}>Tentar novamente</button></p>:inventory.data?.length===0?<p>Nenhum convite emitido.</p>:inventory.data?.map(invite=><div key={invite.digest} className="flex flex-wrap items-center gap-2 border-t py-2"><span>Emitido em {new Date(invite.createdAt).toLocaleString("pt-BR")} · {invite.revokedAt?"Revogado":invite.expiresAt&&new Date(invite.expiresAt).getTime()<=Date.now()?"Expirado":"Não revogado"}</span>{!invite.revokedAt&&<button className={button} disabled={busy} onClick={()=>void revokeSaved(invite.digest)}>Revogar convite anterior</button>}</div>)}
 {message&&<p role="status">{message}</p>}
 </div>;
}
function Events({partnerId,role}:{partnerId:number;role:string}){
 const events=trpc.partnerEvents.list.useQuery({partnerId},{retry:false});
 const create=trpc.partnerEvents.create.useMutation();
 const transition=trpc.partnerEvents.transition.useMutation();
 const [title,setTitle]=useState("");
 const [schedule,setSchedule]=useState("");
 const [visibility,setVisibility]=useState<"public"|"private"|"subscriber">("private");
 const [error,setError]=useState("");
 const busy=create.isPending||transition.isPending;
 const manage=role==="owner"||role==="event_manager";
 async function submit(e:FormEvent){
  e.preventDefault();setError("");
  const scheduledAt=new Date(schedule).getTime();
  if(!Number.isFinite(scheduledAt)){setError("Informe uma data válida.");return;}
  try{await create.mutateAsync({partnerId,title,visibility,scheduledAt});setTitle("");setSchedule("");await events.refetch();}catch{setError("Não foi possível criar o evento.");}
 }
 async function change(eventId:number,to:"published"|"live"|"ended"|"cancelled"){
  setError("");try{await transition.mutateAsync({partnerId,eventId,to});await events.refetch();}catch{setError("Não foi possível alterar o evento. Atualize a lista.");}
 }
 return <section className="space-y-6">
 {manage&&<form onSubmit={submit} className="academy-business-card grid gap-4">
 <h2 className="font-display text-xl"><CalendarDays className="mr-2 inline" size={21}/> Criar evento</h2>
 <label>Título<input className="block w-full rounded border p-2" required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label>
 <label>Data e hora local<input className="block w-full rounded border p-2" required type="datetime-local" value={schedule} onChange={e=>setSchedule(e.target.value)}/></label>
 <label>Visibilidade<select className="block w-full rounded border p-2" value={visibility} onChange={e=>setVisibility(e.target.value as typeof visibility)}><option value="private">Privado</option><option value="public">Público</option><option value="subscriber">Assinantes</option></select></label>
 <button disabled={busy} className="academy-primary">Criar rascunho</button>
 </form>}
 {error&&<p role="alert">{error}</p>}
 <h2 className="text-xl font-semibold">Eventos</h2>
 {events.isPending?<p role="status">Carregando eventos...</p>:events.error?<p role="alert">Não foi possível carregar os eventos. <button className={button} onClick={()=>void events.refetch()}>Tentar novamente</button></p>:events.data?.length===0?<p>Nenhum evento cadastrado.</p>:events.data?.map(event=><article key={event.id} className="academy-business-card space-y-3">
 <h3 className="break-words font-semibold">{event.title}</h3><p className="flex flex-wrap items-center gap-2 text-sm"><span className="academy-event-status" data-status={event.status}>{labels[event.status]}</span><time dateTime={new Date(event.scheduledAt).toISOString()}>{new Date(event.scheduledAt).toLocaleString("pt-BR")}</time></p>
 {manage&&<div className="flex flex-wrap gap-2">{actions[event.status].map(to=><button key={to} className={button} disabled={busy} onClick={()=>void change(event.id,to)}>{labels[to]}</button>)}</div>}
 {manage&&event.visibility==="public"&&(event.status==="published"||event.status==="live")&&<InviteControls partnerId={partnerId} eventId={event.id}/>}
 </article>)}
 </section>;
}
function Memberships(){
 const mine=trpc.partnerEvents.mine.useQuery(undefined,{retry:false});
 const [selected,setSelected]=useState<number|null>(null);
 if(mine.isPending)return <p role="status">Carregando empresas...</p>;
 if(mine.error)return <p role="alert">Painel indisponível. <button className={button} onClick={()=>void mine.refetch()}>Tentar novamente</button></p>;
 const partner=mine.data?.find(p=>p.id===selected)??mine.data?.[0];
 if(!partner)return <p>Nenhuma empresa ativa vinculada à sua conta.</p>;
 return <div className="space-y-6"><label className="academy-business-card block font-semibold">Empresa<select className="block w-full rounded border p-2" value={partner.id} onChange={e=>setSelected(Number(e.target.value))}>{mine.data?.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><Events key={partner.id} partnerId={partner.id} role={partner.role}/></div>;
}
export default function PartnerDashboard(){
 const identity=trpc.auth.me.useQuery(undefined,{retry:false});
 return <main className="academy-interior"><header className="academy-topbar"><div className="academy-topbar-inner"><Link href="/"><img className="academy-interior-brand" src={`${import.meta.env.BASE_URL}academy/logo-lingua-transparente.png`} alt="Lingua"/></Link><Link href="/" className="academy-secondary"><ArrowLeft size={16}/> Voltar ao Lingua</Link></div></header><div className="academy-business-shell"><section className="academy-business-hero"><div><p className="text-xs font-bold uppercase tracking-widest text-[#ffda65]"><Building2 size={16} className="mr-1 inline"/> Lingua para empresas</p><h1 className="font-display mt-3 text-3xl sm:text-5xl">Painel empresarial</h1><p className="mt-3 max-w-lg leading-6">Gerencie os eventos e convites da sua organização.</p><p className="mt-4 text-sm"><Video size={16} className="mr-2 inline"/> Ambiente experimental. Transmissão de vídeo ainda indisponível.</p></div></section><div className="academy-business-card">{identity.isPending?<p role="status">Confirmando sessão...</p>:identity.error?<p role="alert">Não foi possível confirmar a sessão.</p>:identity.data?<Memberships key={identity.data.id}/>:<Link href="/login" className="academy-primary">Entrar na minha conta</Link>}</div></div></main>;
}
