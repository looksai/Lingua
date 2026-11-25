import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { PortalFooter, PortalHeader } from "./PublicPortal";

const frame="rounded-2xl border border-[#14283D]/10 bg-white p-5";
const action="rounded-full bg-[#14283D] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40";

export default function CommunityHub(){
  const identity=trpc.auth.me.useQuery(undefined,{retry:false});
  const groups=trpc.community.myGroups.useQuery(undefined,{retry:false,enabled:Boolean(identity.data)});
  const [selected,setSelected]=useState<number|null>(null);
  const [topicId,setTopicId]=useState<number|null>(null);
  const [subject,setSubject]=useState("");
  const [body,setBody]=useState("");
  const [reply,setReply]=useState("");
  const [notice,setNotice]=useState("");
  const current=groups.data?.find(g=>g.id===selected)??groups.data?.[0];
  const currentGroupId=current?.id??null;
  const topics=trpc.community.groupTopics.useQuery({groupId:currentGroupId??0},{
    retry:false,enabled:Boolean(currentGroupId)
  });
  const activeTopic=topics.data?.find(t=>t.id===topicId)??null;
  const replies=trpc.community.topicReplies.useQuery({topicId:activeTopic?.id??0},{
    retry:false,enabled:Boolean(activeTopic?.id)
  });
  const createTopic=trpc.community.createTopic.useMutation();
  const createReply=trpc.community.createReply.useMutation();

  async function submitTopic(e:FormEvent){
    e.preventDefault();
    if(!currentGroupId||!current?.canCreate)return;
    setNotice("");
    try{
      await createTopic.mutateAsync({groupId:currentGroupId,title:subject.trim(),body:body.trim()});
      setSubject("");setBody("");
      setNotice("Discussão enviada. Ela será analisada antes da publicação.");
    }catch{setNotice("Não foi possível enviar a discussão. Confira suas permissões ou tente novamente.");}
  }
  async function submitReply(e:FormEvent){
    e.preventDefault();
    if(!activeTopic||!current?.canReply)return;
    setNotice("");
    try{
      await createReply.mutateAsync({topicId:activeTopic.id,body:reply.trim()});
      setReply("");setNotice("Comentário enviado para moderação.");
    }catch{setNotice("Não foi possível enviar o comentário.");}
  }

  return <div className="min-h-screen bg-[#F4F1EB] text-[#14283D]">
    <PortalHeader/>
    <main className="mx-auto max-w-6xl px-5 py-12">
      <p className="text-xs font-bold uppercase tracking-widest text-[#956A39]">Lingua Club</p>
      <h1 className="mt-3 font-display text-5xl">Sua comunidade</h1>
      <p className="mt-4 max-w-2xl text-[#526478]">Participe de grupos que fazem sentido para seu projeto internacional. Toda publicação passa por moderação antes de aparecer para outras pessoas.</p>
      {!identity.isPending&&!identity.data&&<div className={frame+" mt-8"}><p>Para acessar seus grupos, entre na sua conta.</p><Link href="/login" className="mt-4 inline-block font-semibold text-[#956A39] underline">Entrar</Link></div>}
      {identity.isPending&&<p role="status" className="mt-8">Verificando sua conta...</p>}
      {identity.data&&groups.isPending&&<p role="status" className="mt-8">Carregando grupos autorizados...</p>}
      {identity.data&&groups.isError&&<div className={frame+" mt-8"}>
        <h2 className="font-display text-2xl">Comunidade ainda não disponível</h2>
        <p className="mt-3 text-sm text-[#526478]">A liberação dos grupos depende da configuração e dos direitos de acesso verificados no servidor.</p>
      </div>}
      {identity.data&&groups.data&&groups.data.length===0&&<div className={frame+" mt-8"}>
        <h2 className="font-display text-2xl">Nenhum grupo disponível nesta conta</h2>
        <p className="mt-3 text-sm text-[#526478]">O acesso ao curso não cria automaticamente uma associação ao Club. As modalidades e permissões serão exibidas quando a comunidade for aberta.</p>
      </div>}
      {identity.data&&groups.data&&groups.data.length>0&&<div className="mt-9 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className={frame+" h-fit"}>
          <h2 className="font-display text-xl">Grupos disponíveis</h2>
          <div className="mt-5 grid gap-2">
            {groups.data.map(group=><button type="button" key={group.id}
              onClick={()=>{setSelected(group.id);setTopicId(null);setNotice("");}}
              className={"rounded-xl p-3 text-left text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B88A4C] "+
                (currentGroupId===group.id?"bg-[#14283D] text-white":"bg-[#F4F1EB] hover:bg-[#E9E3DA]")}
            >{group.title}<span className="mt-1 block text-xs font-normal opacity-75">{group.visibility==="private"?"Grupo privado":"Grupo público"}</span></button>)}
          </div>
        </aside>
        <section className="min-w-0 space-y-5">
          <div className={frame}>
            <h2 className="font-display text-3xl">{current?.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#526478]">{current?.description}</p>
          </div>
          {notice&&<p role="status" className={frame+" text-sm"}>{notice}</p>}
          {current?.canCreate&&<form onSubmit={submitTopic} className={frame+" space-y-3"}>
            <h3 className="font-display text-2xl">Criar discussão</h3>
            <label className="block text-sm font-semibold" htmlFor="portal-subject">Assunto</label>
            <input id="portal-subject" required minLength={3} maxLength={160} value={subject}
              onChange={e=>setSubject(e.target.value)} className="w-full rounded-lg border border-[#14283D]/20 p-3"/>
            <label className="block text-sm font-semibold" htmlFor="portal-body">Mensagem</label>
            <textarea id="portal-body" required minLength={3} maxLength={5000} rows={4} value={body}
              onChange={e=>setBody(e.target.value)} className="w-full rounded-lg border border-[#14283D]/20 p-3"/>
            <button className={action} disabled={createTopic.isPending} type="submit">Enviar para moderação</button>
          </form>}
          <div className={frame}>
            <h3 className="font-display text-2xl">Discussões publicadas</h3>
            {topics.isPending&&<p role="status" className="mt-3 text-sm">Carregando discussões...</p>}
            {topics.isError&&<p role="alert" className="mt-3 text-sm text-red-700">Não foi possível carregar as discussões.</p>}
            {topics.data?.length===0&&<p className="mt-3 text-sm text-[#526478]">Ainda não há discussões aprovadas neste grupo.</p>}
            <div className="mt-5 space-y-3">
              {topics.data?.map(topic=><button type="button" key={topic.id} onClick={()=>setTopicId(topic.id)}
                className={"block w-full rounded-xl border p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B88A4C] "+
                  (activeTopic?.id===topic.id?"border-[#956A39] bg-[#FDF9F1]":"border-[#14283D]/10 hover:border-[#956A39]")}>
                <span className="font-semibold">{topic.title}</span>
                <span className="mt-2 block whitespace-pre-wrap break-words text-sm text-[#526478]">{topic.body}</span>
              </button>)}
            </div>
          </div>
          {activeTopic&&<div className={frame+" space-y-4"}>
            <h3 className="font-display text-2xl">Comentários</h3>
            {replies.isPending&&<p role="status" className="text-sm">Carregando comentários...</p>}
            {replies.data?.length===0&&<p className="text-sm text-[#526478]">Nenhum comentário aprovado ainda.</p>}
            {replies.data?.map(item=><p key={item.id} className="whitespace-pre-wrap break-words rounded-lg bg-[#F4F1EB] p-3 text-sm">{item.body}</p>)}
            {current?.canReply&&<form onSubmit={submitReply} className="space-y-3">
              <label htmlFor="portal-reply" className="block font-semibold">Comentar</label>
              <textarea id="portal-reply" rows={3} required minLength={3} maxLength={3000} value={reply}
                onChange={e=>setReply(e.target.value)} className="w-full rounded-lg border border-[#14283D]/20 p-3"/>
              <button className={action} disabled={createReply.isPending} type="submit">Enviar comentário para moderação</button>
            </form>}
          </div>}
        </section>
      </div>}
    </main><PortalFooter/>
  </div>;
}
