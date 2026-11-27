import {Link} from "wouter";
import {CalendarDays,Video,ArrowRight,Radio} from "lucide-react";
import "./academy-interior.css";
export type PublicLivePreviewState=
 | {kind:"loading"}
 | {kind:"unavailable"}
 | {kind:"error"}
 | {kind:"event";title:string;partnerName:string;scheduledAt:string;canWatch:boolean};
export default function PublicLivePreview({state,onRetry}:{state:PublicLivePreviewState;onRetry:()=>void}){
 return <main className="academy-interior">
  <header className="academy-topbar"><div className="academy-topbar-inner"><Link href="/"><img className="academy-interior-brand" src={`${import.meta.env.BASE_URL}academy/logo-lingua-transparente.png`} alt="Lingua"/></Link><span className="font-semibold text-sm">Eventos de parceiros</span></div></header><div className="academy-business-shell">
   {state.kind==="loading"?<p className="academy-business-card" role="status">Consultando convite...</p>:state.kind==="unavailable"?<section className="academy-business-card"><h1 className="font-display text-3xl">Convite indisponível</h1><p className="mt-4">Este evento pode ter terminado ou o convite não está mais válido.</p></section>:state.kind==="error"?<section><h1 className="text-3xl font-bold">Não foi possível consultar o convite</h1><button className="academy-secondary mt-4" onClick={onRetry}>Tentar novamente</button></section>:<section className="academy-business-card">
    <p className="eyebrow">Evento apresentado por {state.partnerName}</p>
    <h1 className="font-display mt-4 text-3xl sm:text-4xl break-words">{state.title}</h1>
    <p className="mt-4 flex items-center gap-2 text-sm"><CalendarDays size={18}/><time dateTime={state.scheduledAt}>{new Date(state.scheduledAt).toLocaleString("pt-BR")}</time></p>
    <div className="academy-live-stage mt-8" role="status"><Video size={36} aria-hidden="true"/><p>{state.canWatch?"Evento ao vivo. A transmissão de vídeo ainda não está disponível nesta versão.":"A transmissão ainda não começou."}</p></div>
   </section>}
   <section className="academy-business-hero mt-6"><h2 className="font-display text-2xl">Seu próximo passo começa com o idioma.</h2><p className="mt-3">Conheça o Lingua e prepare seu inglês para oportunidades internacionais.</p><Link href="/" className="academy-primary mt-5">Conhecer o Lingua <ArrowRight size={16}/></Link></section>
  </div>
 </main>;
}
