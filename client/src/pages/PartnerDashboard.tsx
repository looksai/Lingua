import {useState,type FormEvent} from "react";
import {Link} from "wouter";
import {trpc} from "@/lib/trpc";
const labels={draft:"Rascunho",published:"Publicado",live:"Ao vivo",ended:"Encerrado",cancelled:"Cancelado"} as const;
const actions={draft:["published","cancelled"],published:["live","cancelled"],live:["ended","cancelled"],ended:[],cancelled:[]} as const;
const button="rounded-lg border px-4 py-2 text-sm disabled:opacity-50";
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
 {manage&&<form onSubmit={submit} className="grid gap-3 rounded-xl border p-4">
 <h2 className="text-xl font-semibold">Criar evento</h2>
 <label>Título<input className="block w-full rounded border p-2" required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></label>
 <label>Data e hora local<input className="block w-full rounded border p-2" required type="datetime-local" value={schedule} onChange={e=>setSchedule(e.target.value)}/></label>
 <label>Visibilidade<select className="block w-full rounded border p-2" value={visibility} onChange={e=>setVisibility(e.target.value as typeof visibility)}><option value="private">Privado</option><option value="public">Público</option><option value="subscriber">Assinantes</option></select></label>
 <button disabled={busy} className={button}>Criar rascunho</button>
 </form>}
 {error&&<p role="alert">{error}</p>}
 <h2 className="text-xl font-semibold">Eventos</h2>
 {events.isPending?<p role="status">Carregando eventos...</p>:events.error?<p role="alert">Não foi possível carregar os eventos. <button className={button} onClick={()=>void events.refetch()}>Tentar novamente</button></p>:events.data?.length===0?<p>Nenhum evento cadastrado.</p>:events.data?.map(event=><article key={event.id} className="space-y-2 rounded-xl border p-4">
 <h3 className="break-words font-semibold">{event.title}</h3><p>{labels[event.status]} · {new Date(event.scheduledAt).toLocaleString("pt-BR")}</p>
 {manage&&<div className="flex flex-wrap gap-2">{actions[event.status].map(to=><button key={to} className={button} disabled={busy} onClick={()=>void change(event.id,to)}>{labels[to]}</button>)}</div>}
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
 return <div className="space-y-6"><label>Empresa<select className="block w-full rounded border p-2" value={partner.id} onChange={e=>setSelected(Number(e.target.value))}>{mine.data?.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><Events key={partner.id} partnerId={partner.id} role={partner.role}/></div>;
}
export default function PartnerDashboard(){
 const identity=trpc.auth.me.useQuery(undefined,{retry:false});
 return <main className="mx-auto min-h-screen max-w-3xl space-y-6 p-5"><Link href="/">Voltar ao Lingua</Link><h1 className="text-3xl font-semibold">Painel empresarial</h1><p>Ambiente experimental. Transmissão de vídeo ainda indisponível.</p>{identity.isPending?<p role="status">Confirmando sessão...</p>:identity.error?<p role="alert">Não foi possível confirmar a sessão.</p>:identity.data?<Memberships key={identity.data.id}/>:<Link href="/login">Entrar na minha conta</Link>}</main>;
}
