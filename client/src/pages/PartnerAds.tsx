import {useState,type FormEvent} from "react";
import {Link} from "wouter";
import {trpc} from "@/lib/trpc";
import {PortalHeader,PortalFooter} from "./PublicPortal";
const field="mt-2 w-full rounded-xl border border-[#14283D]/20 p-3 text-sm";
const primary="rounded-full bg-[#14283D] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50";
export default function PartnerAdsManager(){
  const identity=trpc.auth.me.useQuery(undefined,{retry:false});
  const orgs=trpc.partners.myOrganizations.useQuery(undefined,{enabled:Boolean(identity.data),retry:false});
  const [partnerId,setPartnerId]=useState<number|null>(null);
  const chosen=orgs.data?.find(o=>o.id===partnerId)??orgs.data?.[0];
  const ads=trpc.ads.mine.useQuery({partnerId:chosen?.id??0},{enabled:Boolean(chosen?.id&&chosen.role==="owner"),retry:false});
  const [placement,setPlacement]=useState<"portal-home"|"portal-partners">("portal-home");
  const [title,setTitle]=useState("");
  const [body,setBody]=useState("");
  const [notice,setNotice]=useState("");
  const create=trpc.ads.create.useMutation();
  const pause=trpc.ads.pause.useMutation();
  async function submit(e:FormEvent){
    e.preventDefault();if(!chosen)return;
    setNotice("");
    try{
      await create.mutateAsync({partnerId:chosen.id,placement,title:title.trim(),body:body.trim()});
      setTitle("");setBody("");await ads.refetch();
      setNotice("Anúncio enviado para análise. Não será exibido antes da aprovação.");
    }catch{setNotice("Não foi possível enviar o anúncio.");}
  }
  return <div className="min-h-screen bg-[#F4F1EB] text-[#14283D]"><PortalHeader/>
    <main className="mx-auto min-h-[70vh] max-w-5xl px-5 py-14">
      <p className="text-xs font-bold uppercase tracking-widest text-[#956A39]">Lingua Ads · laboratório</p>
      <h1 className="mt-3 font-display text-4xl">Campanhas da organização</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#526478]">Crie propostas de anúncios para espaços públicos. Sem segmentação por memórias, mensagens privadas ou comportamento de alunos. Orçamento, pagamentos e contratos ainda não estão habilitados.</p>
      <Link href="/portal/parceiros/painel" className="mt-5 inline-block text-sm font-semibold text-[#956A39] underline">Voltar ao painel</Link>
      {orgs.isError&&<p role="alert" className="mt-6">Painel indisponível.</p>}
      {!identity.data&&!identity.isPending&&<p className="mt-6">Entre na sua conta para acessar.</p>}
      {orgs.data?.length===0&&<p className="mt-6">Nenhuma organização vinculada à sua conta.</p>}
      {chosen&&<div className="mt-8 space-y-6">
        <label htmlFor="ads-partner" className="block text-sm font-semibold">Organização</label>
        <select id="ads-partner" className={field} value={chosen.id}
          onChange={e=>setPartnerId(Number(e.target.value))}>
          {orgs.data?.map(o=><option value={o.id} key={o.id}>{o.displayName}</option>)}
        </select>
        {notice&&<p role="status" className="rounded-xl bg-white p-4">{notice}</p>}
        {chosen.role==="owner"&&<form className="space-y-4 rounded-2xl bg-white p-6" onSubmit={submit}>
          <h2 className="font-display text-2xl">Nova proposta</h2>
          <label htmlFor="ads-placement" className="block text-sm font-semibold">Local da divulgação</label>
          <select id="ads-placement" className={field} value={placement}
            onChange={e=>setPlacement(e.target.value as "portal-home"|"portal-partners")}>
            <option value="portal-home">Página inicial do portal</option>
            <option value="portal-partners">Diretório de empresas</option>
          </select>
          <label htmlFor="ads-title" className="block text-sm font-semibold">Título</label>
          <input id="ads-title" className={field} required minLength={5} maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/>
          <label htmlFor="ads-body" className="block text-sm font-semibold">Texto do anúncio</label>
          <textarea id="ads-body" className={field} rows={4} required minLength={20} maxLength={600} value={body} onChange={e=>setBody(e.target.value)}/>
          <p className="text-xs text-[#526478]">O destino será automaticamente sua página institucional no Lingua; links externos não estão habilitados.</p>
          <button type="submit" className={primary} disabled={create.isPending}>Enviar para revisão</button>
        </form>}
        <section className="rounded-2xl bg-white p-6">
          <h2 className="font-display text-2xl">Minhas campanhas</h2>
          {ads.isPending&&chosen.role==="owner"&&<p role="status">Carregando...</p>}
          {ads.data?.length===0&&<p className="mt-4 text-sm">Nenhum anúncio cadastrado.</p>}
          {ads.data?.map(item=><article key={item.id} className="mt-4 rounded-xl border p-4">
            <p className="text-xs font-semibold uppercase text-[#956A39]">{item.state}</p>
            <h3 className="mt-2 font-semibold">{item.title}</h3>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.body}</p>
            {item.state==="approved"&&<button className="mt-3 text-sm font-semibold underline" type="button"
              disabled={pause.isPending} onClick={()=>void pause.mutateAsync({partnerId:chosen.id,adId:item.id}).then(()=>ads.refetch()).catch(()=>setNotice("Não foi possível pausar."))}>Pausar anúncio</button>}
          </article>)}
        </section>
      </div>}
    </main><PortalFooter/></div>;
}
export function AdsReview(){
  const me=trpc.auth.me.useQuery(undefined,{retry:false});
  const pending=trpc.ads.pending.useQuery(undefined,{enabled:me.data?.role==="admin",retry:false});
  const review=trpc.ads.review.useMutation();
  const [notice,setNotice]=useState("");
  async function decide(adId:number,approve:boolean){
    try{await review.mutateAsync({adId,approve});await pending.refetch();setNotice("Decisão registrada.");}
    catch{setNotice("Não foi possível registrar a decisão.");}
  }
  return <div className="min-h-screen bg-[#F4F1EB] text-[#14283D]"><PortalHeader/>
    <main className="mx-auto min-h-[65vh] max-w-5xl px-5 py-14">
      <h1 className="font-display text-4xl">Revisar publicidade</h1>
      {me.data?.role!=="admin"&&!me.isPending&&<p className="mt-6">Acesso restrito.</p>}
      {pending.isPending&&me.data?.role==="admin"&&<p role="status" className="mt-6">Carregando anúncios...</p>}
      {notice&&<p role="status" className="mt-4">{notice}</p>}
      {pending.data?.length===0&&<p className="mt-6">Não existem anúncios aguardando revisão.</p>}
      {pending.data?.map(ad=><article key={ad.id} className="mt-5 rounded-2xl bg-white p-6">
        <p className="text-xs font-semibold uppercase text-[#956A39]">Patrocinado · {ad.company} · {ad.placement}</p>
        <h2 className="mt-3 font-display text-2xl">{ad.title}</h2>
        <p className="mt-3 whitespace-pre-wrap break-words text-sm">{ad.body}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className={primary} disabled={review.isPending} onClick={()=>void decide(ad.id,true)}>Aprovar</button>
          <button className="rounded-full border px-5 py-3 text-sm" disabled={review.isPending} onClick={()=>void decide(ad.id,false)}>Rejeitar</button>
        </div>
      </article>)}
    </main><PortalFooter/></div>;
}
