import {useState,type FormEvent} from "react";
import {Link} from "wouter";
import {trpc} from "@/lib/trpc";
import {PortalFooter,PortalHeader} from "./PublicPortal";

const field="mt-2 w-full rounded-xl border border-[#14283D]/20 bg-white p-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B88A4C]";
const btn="rounded-full bg-[#14283D] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50";

export function PartnerProfile({slug}:{slug:string}){
  const profile=trpc.partners.publicProfile.useQuery({slug},{retry:false});
  const identity=trpc.auth.me.useQuery(undefined,{retry:false});
  const [message,setMessage]=useState("");
  const [consent,setConsent]=useState(false);
  const [notice,setNotice]=useState("");
  const send=trpc.partners.sendInquiry.useMutation();
  async function submit(e:FormEvent){
    e.preventDefault();if(!profile.data||!consent)return;
    setNotice("");
    try{
      await send.mutateAsync({partnerId:profile.data.id,message:message.trim(),consentToShareMessage:true});
      setMessage("");setConsent(false);setNotice("Solicitação registrada. Ela poderá ser visualizada pela equipe autorizada da empresa.");
    }catch{setNotice("A solicitação não foi enviada. Confira sua assinatura e tente novamente.");}
  }
  return <div className="min-h-screen bg-[#F4F1EB] text-[#14283D]">
    <PortalHeader/>
    <main className="mx-auto min-h-[65vh] max-w-4xl px-5 py-14">
      <Link href="/portal/parceiros" className="text-sm text-[#956A39] hover:underline">← Diretório de empresas</Link>
      {profile.isPending&&<p role="status" className="mt-8">Carregando instituição...</p>}
      {!profile.isPending&&!profile.data&&<div className="mt-8 rounded-2xl bg-white p-6">
        <h1 className="font-display text-3xl">Organização indisponível</h1>
        <p className="mt-2 text-sm">Só publicamos perfis cuja divulgação foi autorizada administrativamente.</p>
      </div>}
      {profile.data&&<div className="mt-8 space-y-6">
        <article className="rounded-2xl bg-white p-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-[#956A39]">Perfil institucional listado</p>
          <h1 className="mt-3 font-display text-4xl">{profile.data.displayName}</h1>
          <p className="mt-5 whitespace-pre-wrap break-words text-[#526478]">{profile.data.description}</p>
          <p className="mt-6 text-xs leading-5 text-[#526478]">Aprovação de cadastro no portal não é certificação profissional, nem recomendação jurídica ou migratória.</p>
        </article>
        <section className="rounded-2xl bg-white p-7">
          <h2 className="font-display text-3xl">Solicitar contato</h2>
          <p className="mt-3 text-sm leading-6 text-[#526478]">Você escolhe se deseja enviar uma mensagem à equipe desta organização. Nenhum histórico do Naruto, lista de alunos ou dados da sua conta serão encaminhados automaticamente. Não envie documentos, senhas ou informações sensíveis.</p>
          {!identity.data&&!identity.isPending&&<p className="mt-4 text-sm">É necessário <Link href="/login" className="font-semibold underline">entrar na sua conta</Link> para solicitar contato.</p>}
          {identity.data&&<form className="mt-6 space-y-4" onSubmit={submit}>
            <label className="block text-sm font-semibold" htmlFor="inquiry-message">Sua mensagem</label>
            <textarea id="inquiry-message" required minLength={20} maxLength={1500} rows={5}
              value={message} onChange={event=>setMessage(event.target.value)} className={field}/>
            <label className="flex items-start gap-3 text-sm leading-6">
              <input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}
                className="mt-1.5 h-4 w-4" required/>
              <span>Autorizo o envio <strong>apenas desta mensagem</strong> à equipe autorizada desta organização para tratar desta solicitação. Sei que posso retirar uma solicitação ainda aberta, mas isso não desfaz eventuais leituras anteriores.</span>
            </label>
            <button type="submit" className={btn} disabled={send.isPending||!consent}>Enviar solicitação voluntária</button>
          </form>}
          {notice&&<p role="status" className="mt-4 text-sm">{notice}</p>}
        </section>
      </div>}
    </main><PortalFooter/>
  </div>;
}

export default function PartnerDashboard(){
  const identity=trpc.auth.me.useQuery(undefined,{retry:false});
  const organizations=trpc.partners.myOrganizations.useQuery(undefined,{retry:false,enabled:Boolean(identity.data)});
  const [selected,setSelected]=useState<number|null>(null);
  const [draft,setDraft]=useState("");
  const [openRoom,setOpenRoom]=useState<number|null>(null);
  const [notice,setNotice]=useState("");
  const current=organizations.data?.find(item=>item.id===selected)??organizations.data?.[0];
  const inbox=trpc.partners.inbox.useQuery({partnerId:current?.id??0},
    {enabled:Boolean(current?.id),retry:false});
  const edit=trpc.partners.submitProfileEdit.useMutation();
  const close=trpc.partners.closeInquiry.useMutation();
  async function submitEdit(e:FormEvent){
    e.preventDefault();if(!current)return;setNotice("");
    try{
      await edit.mutateAsync({partnerId:current.id,description:draft.trim()});
      setNotice("Texto enviado para revisão. A descrição pública permanece igual até ser aprovada.");
      await organizations.refetch();
    }catch{setNotice("Não foi possível enviar a alteração.");}
  }
  async function closeItem(inquiryId:number){
    if(!current)return;
    try{
      await close.mutateAsync({partnerId:current.id,inquiryId});
      await inbox.refetch();
      setNotice("Solicitação encerrada.");
    }catch{setNotice("Não foi possível encerrar a solicitação.");}
  }
  return <div className="min-h-screen bg-[#F4F1EB] text-[#14283D]">
    <PortalHeader/>
    <main className="mx-auto min-h-[65vh] max-w-5xl px-5 py-14">
      <p className="text-xs font-bold uppercase tracking-widest text-[#956A39]">Lingua Partners</p>
      <h1 className="mt-3 font-display text-4xl">Área da organização</h1>
      <p className="mt-3 text-sm text-[#526478]">Apenas usuários designados para a organização podem visualizar solicitações. Sem acesso à lista de membros.</p>
      {!identity.data&&!identity.isPending&&<p className="mt-8">Faça <Link href="/login" className="underline">login</Link> para acessar.</p>}
      {organizations.isError&&<p role="alert" className="mt-8">A área institucional ainda não está habilitada nesta conta.</p>}
      {organizations.isPending&&identity.data&&<p role="status" className="mt-8">Verificando vínculos com organizações...</p>}
      {organizations.data?.length===0&&<p className="mt-8 rounded-2xl bg-white p-6">Nenhuma organização verificada foi associada à sua conta.</p>}
      {organizations.data&&organizations.data.length>0&&<div className="mt-8 space-y-6">
        <label className="block text-sm font-semibold" htmlFor="partner-organization">Organização</label>
        <select id="partner-organization" className={field} value={current?.id??""}
          onChange={e=>{setSelected(Number(e.target.value));setNotice("");setDraft("");}}>
          {organizations.data.map(p=><option key={p.id} value={p.id}>{p.displayName}</option>)}
        </select>
        {notice&&<p role="status" className="rounded-xl bg-white p-4 text-sm">{notice}</p>}
        <section className="rounded-2xl bg-white p-6">
          <h2 className="font-display text-2xl">Página institucional</h2>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm text-[#526478]">{current?.description}</p>
          {current?.draftDescription&&<p className="mt-4 rounded-xl bg-[#FDF9F1] p-4 text-sm">Existe uma alteração aguardando revisão administrativa.</p>}
          {current?.role==="owner"&&<form className="mt-6 space-y-3" onSubmit={submitEdit}>
            <label htmlFor="partner-description" className="block text-sm font-semibold">Propor nova descrição</label>
            <textarea id="partner-description" minLength={30} maxLength={2400} rows={5} required
              className={field} value={draft} onChange={e=>setDraft(e.target.value)}/>
            <button className={btn} type="submit" disabled={edit.isPending}>Enviar para revisão</button>
          </form>}
        </section>
        <section className="rounded-2xl bg-white p-6">
          <h2 className="font-display text-2xl">Solicitações voluntárias</h2>
          <p className="mt-2 text-sm text-[#526478]">Somente a mensagem que o interessado escolheu enviar. Sem dados cadastrais ou histórico educacional.</p>
          {inbox.isPending&&<p role="status" className="mt-4">Carregando solicitações...</p>}
          {inbox.isError&&<p role="alert" className="mt-4">Não foi possível carregar as solicitações.</p>}
          {inbox.data?.length===0&&<p className="mt-4 text-sm">Nenhuma solicitação aberta.</p>}
          <div className="mt-5 space-y-4">
            {inbox.data?.map(item=><article key={item.id} className="rounded-xl border border-[#14283D]/10 p-4">
              <p className="whitespace-pre-wrap break-words text-sm">{item.message}</p>
              <div className="mt-4 flex flex-wrap gap-4">
                <button className="text-sm font-semibold text-[#956A39] underline" type="button" onClick={()=>setOpenRoom(item.id)}>Abrir sala</button>
                <button className="text-sm font-semibold text-[#956A39] underline" type="button"
                  onClick={()=>void closeItem(item.id)} disabled={close.isPending}>Encerrar solicitação</button>
              </div>
            </article>)}
          </div>
        </section>
        {openRoom!==null&&<PartnerRoom key={openRoom} inquiryId={openRoom} onBack={()=>setOpenRoom(null)}/>}
      </div>}
    </main><PortalFooter/>
  </div>;
}

/**
 * Private room, never displays account identifiers or company staff contacts.
 * User decides when to refresh; no background polling or tracking.
 */
export function PartnerRoom({inquiryId,onBack}:{inquiryId:number;onBack:()=>void}){
  const room=trpc.partners.roomMessages.useQuery({inquiryId},{retry:false});
  const send=trpc.partners.sendRoomMessage.useMutation();
  const [body,setBody]=useState("");
  const [notice,setNotice]=useState("");
  async function submit(e:FormEvent){
    e.preventDefault();
    setNotice("");
    try{
      await send.mutateAsync({inquiryId,body:body.trim()});
      setBody("");
      await room.refetch();
      setNotice("Mensagem enviada.");
    }catch{setNotice("Não foi possível enviar. A solicitação pode ter sido encerrada ou seu acesso alterado.");}
  }
  return <section aria-label="Sala privada de atendimento" className="mt-6 rounded-2xl bg-white p-6">
    <button type="button" onClick={onBack} className="text-sm font-semibold text-[#956A39] underline">← Voltar às solicitações</button>
    <h2 className="mt-4 font-display text-3xl">Sala privada de atendimento</h2>
    <p className="mt-2 text-xs leading-5 text-[#526478]">Somente o membro e a equipe autorizada desta organização podem visualizar mensagens enquanto a solicitação estiver aberta. Não envie documentos pessoais, senhas ou dados sensíveis. Este canal não fornece orientação jurídica do Lingua.</p>
    <button type="button" onClick={()=>void room.refetch()} className="mt-4 text-sm font-semibold underline">Atualizar mensagens</button>
    {room.isPending&&<p role="status" className="mt-4 text-sm">Carregando mensagens...</p>}
    {room.isError&&<p role="alert" className="mt-4 text-sm text-red-700">Esta sala não está acessível. Ela pode ter sido encerrada ou seu acesso pode ter mudado.</p>}
    {room.data&&<div className="mt-5 space-y-3">
      {room.data.messages.length===0&&<p className="text-sm text-[#526478]">Nenhuma resposta foi enviada nesta sala.</p>}
      {room.data.messages.map(item=><div key={item.id} className="rounded-xl border border-[#14283D]/10 p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#956A39]">{item.senderKind==="member"?"Membro":"Equipe institucional"}</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.body}</p>
      </div>)}
      <form className="space-y-3 pt-4" onSubmit={submit}>
        <label htmlFor={"room-message-"+inquiryId} className="block text-sm font-semibold">Escrever mensagem</label>
        <textarea id={"room-message-"+inquiryId} className={field} rows={4} required minLength={2} maxLength={3000}
          value={body} onChange={e=>setBody(e.target.value)}/>
        <button type="submit" className={btn} disabled={send.isPending}>Enviar mensagem</button>
      </form>
    </div>}
    {notice&&<p role="status" className="mt-4 text-sm">{notice}</p>}
  </section>;
}

export function MyPartnerInquiries(){
  const identity=trpc.auth.me.useQuery(undefined,{retry:false});
  const list=trpc.partners.myInquiries.useQuery(undefined,{retry:false,enabled:Boolean(identity.data)});
  const withdraw=trpc.partners.withdrawInquiry.useMutation();
  const [notice,setNotice]=useState("");
  const [openRoom,setOpenRoom]=useState<number|null>(null);
  async function cancel(inquiryId:number){
    try{
      await withdraw.mutateAsync({inquiryId});await list.refetch();
      setNotice("Solicitação retirada. Leituras anteriores pela empresa não podem ser desfeitas.");
    }catch{setNotice("Não foi possível retirar esta solicitação.");}
  }
  return <div className="min-h-screen bg-[#F4F1EB] text-[#14283D]"><PortalHeader/>
    <main className="mx-auto min-h-[65vh] max-w-4xl px-5 py-14">
      <h1 className="font-display text-4xl">Minhas solicitações</h1>
      <p className="mt-4 text-sm text-[#526478]">Aqui você pode retirar solicitações que ainda estejam abertas.</p>
      {!identity.data&&!identity.isPending&&<Link href="/login" className="mt-5 inline-block underline">Entrar</Link>}
      {list.isError&&<p role="alert" className="mt-6">Solicitações indisponíveis.</p>}
      {list.isPending&&identity.data&&<p role="status" className="mt-6">Carregando...</p>}
      {notice&&<p role="status" className="mt-4">{notice}</p>}
      {list.data?.length===0&&<p className="mt-6">Nenhuma solicitação registrada.</p>}
      <div className="mt-6 space-y-3">{list.data?.map(item=><div className="rounded-xl bg-white p-5" key={item.id}>
        <p className="whitespace-pre-wrap break-words text-sm">{item.message}</p>
        <p className="mt-2 text-xs text-[#526478]">Situação: {item.state==="new"?"Aberta":item.state==="closed"?"Encerrada":"Retirada"}</p>
        {item.state==="new"&&<div className="mt-4 flex flex-wrap gap-4">
          <button type="button" className="text-sm font-semibold text-[#956A39] underline" onClick={()=>setOpenRoom(item.id)}>Abrir sala</button>
          <button type="button" disabled={withdraw.isPending} className="text-sm font-semibold text-[#956A39] underline"
          onClick={()=>void cancel(item.id)}>Retirar solicitação</button>
        </div>}
      </div>)}</div>
      {openRoom!==null&&<PartnerRoom key={openRoom} inquiryId={openRoom} onBack={()=>setOpenRoom(null)}/>}
    </main><PortalFooter/></div>;
}

export function PartnerReviewPanel(){
  const identity=trpc.auth.me.useQuery(undefined,{retry:false});
  const queue=trpc.partners.pendingProfileEdits.useQuery(undefined,{
    enabled:identity.data?.role==="admin",retry:false,
  });
  const decide=trpc.partners.approveProfileEdit.useMutation();
  const [notice,setNotice]=useState("");
  async function review(partnerId:number,approve:boolean){
    setNotice("");
    try{
      await decide.mutateAsync({partnerId,approve});
      await queue.refetch();
      setNotice(approve?"Alteração publicada.":"Alteração rejeitada.");
    }catch{setNotice("Não foi possível revisar a alteração.");}
  }
  return <div className="min-h-screen bg-[#F4F1EB] text-[#14283D]">
    <PortalHeader/>
    <main className="mx-auto min-h-[65vh] max-w-4xl px-5 py-14">
      <h1 className="font-display text-4xl">Revisão institucional</h1>
      <p className="mt-3 text-sm text-[#526478]">Mudanças na apresentação pública passam por um administrador antes de serem exibidas.</p>
      {identity.data?.role!=="admin"&&!identity.isPending&&<p className="mt-6">Esta área é restrita.</p>}
      {queue.isPending&&identity.data?.role==="admin"&&<p role="status" className="mt-6">Carregando propostas...</p>}
      {queue.isError&&<p role="alert" className="mt-6">Revisão indisponível.</p>}
      {notice&&<p role="status" className="mt-5">{notice}</p>}
      {queue.data?.length===0&&<p className="mt-6">Nenhuma alteração pendente.</p>}
      <div className="mt-6 space-y-4">
        {queue.data?.map(item=><article key={item.id} className="rounded-2xl bg-white p-6">
          <h2 className="font-display text-2xl">{item.displayName}</h2>
          <p className="mt-4 whitespace-pre-wrap break-words text-sm">{item.draftDescription}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="button" className={btn} disabled={decide.isPending} onClick={()=>void review(item.id,true)}>Aprovar</button>
            <button type="button" className="rounded-full border px-5 py-3 text-sm font-semibold" disabled={decide.isPending} onClick={()=>void review(item.id,false)}>Rejeitar</button>
          </div>
        </article>)}
      </div>
    </main><PortalFooter/>
  </div>;
}
