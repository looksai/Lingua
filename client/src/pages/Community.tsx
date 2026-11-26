import { Globe2, BriefcaseBusiness, Plane, BookOpen, Compass, LockKeyhole, Users } from "lucide-react";
import { Link } from "wouter";
import "./academy-interior.css";

type Group = {id:string;title:string;description:string};
export type CommunityViewState =
  | {kind:"loading"}
  | {kind:"disabled"}
  | {kind:"authentication_required"}
  | {kind:"subscription_required"}
  | {kind:"error"}
  | {kind:"allowed";groups:Group[]};

const groupIcons:Record<string,typeof Globe2>={
  immigration:Globe2, career:BriefcaseBusiness, travel:Plane, ielts:BookOpen, "express-entry":Compass,
};

/**
 * Presentation only. No entitlement may be inferred from this component.
 * The allowed state must come from the protected server catalog endpoint.
 * Not mounted in App.tsx until the billing adapter and router are approved.
 */
export default function Community({state,onRetry}:{state:CommunityViewState;onRetry:()=>void}){
  return <main className="academy-interior">
    <header className="academy-topbar"><div className="academy-topbar-inner">
      <Link href="/"><img className="academy-interior-brand" src={`${import.meta.env.BASE_URL}academy/logo-lingua-transparente.png`} alt="Lingua"/></Link>
      <Link href="/" className="academy-secondary">Voltar ao meu espaço</Link>
    </div></header>
    <div className="academy-business-shell">
      <section className="academy-business-hero">
        <p className="text-xs font-bold uppercase tracking-widest text-[#ffda65]"><Users size={17} className="mr-2 inline" aria-hidden="true"/>Comunidade Lingua</p>
        <h1 className="font-display mt-3 text-3xl sm:text-5xl">Conecte-se a quem tem objetivos parecidos.</h1>
        <p className="mt-4 max-w-xl leading-6">Encontre espaços de prática e troca de experiências sobre inglês, carreira e mobilidade internacional.</p>
      </section>
      {state.kind==="loading"?<p role="status" className="academy-business-card">Verificando seu acesso...</p>:
      state.kind==="allowed"?<section aria-labelledby="community-groups">
        <h2 id="community-groups" className="font-display mb-4 text-2xl">Grupos temáticos</h2>
        <p className="mb-5 text-sm text-ink-muted">Catálogo inicial. A publicação de mensagens e a entrada em grupos ainda não estão disponíveis.</p>
        {state.groups.length===0?<p className="academy-business-card">Nenhum grupo disponível no momento.</p>:<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.groups.map(group=>{const Icon=groupIcons[group.id]??Users;return <article key={group.id} className="academy-business-card flex flex-col gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#edf4fb] text-[#0752a8]"><Icon size={24} aria-hidden="true"/></span>
            <h3 className="font-display text-xl">{group.title}</h3>
            <p className="text-sm leading-6 text-ink-muted">{group.description}</p>
            <span className="mt-auto text-xs font-semibold text-ink-muted">Grupo em preparação</span>
          </article>;})}
        </div>}
      </section>:<section className="academy-business-card">
        <LockKeyhole size={30} className="mb-4 text-[#0752a8]" aria-hidden="true"/>
        <h2 className="font-display text-2xl">{state.kind==="authentication_required"?"Entre na sua conta":state.kind==="subscription_required"?"Acesso exclusivo para assinantes ativos":state.kind==="error"?"Não foi possível verificar o acesso":"Comunidade em preparação"}</h2>
        <p className="mt-3 leading-6 text-ink-muted">{state.kind==="authentication_required"?"Precisamos confirmar sua identidade antes de consultar sua assinatura.":state.kind==="subscription_required"?"O acesso depende de uma assinatura ativa verificada pelo servidor. Nenhuma cobrança será iniciada aqui.":state.kind==="error"?"Não exibiremos grupos sem confirmar sua autorização. Tente novamente.":"Os grupos serão disponibilizados após a validação da comunidade."}</p>
        {state.kind==="authentication_required"?<Link href="/login" className="academy-primary mt-5">Entrar</Link>:state.kind==="error"?<button className="academy-secondary mt-5" onClick={onRetry}>Tentar novamente</button>:<Link href="/" className="academy-secondary mt-5">Voltar ao Lingua</Link>}
      </section>}
    </div>
  </main>;
}
