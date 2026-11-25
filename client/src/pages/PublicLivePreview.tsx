import {Link} from "wouter";
export type PublicLivePreviewState=
 | {kind:"loading"}
 | {kind:"unavailable"}
 | {kind:"error"}
 | {kind:"event";title:string;partnerName:string;scheduledAt:string;canWatch:boolean};
export default function PublicLivePreview({state,onRetry}:{state:PublicLivePreviewState;onRetry:()=>void}){
 return <main className="min-h-screen bg-paper text-ink px-6 py-10">
  <div className="mx-auto max-w-3xl">
   <header className="mb-12 flex items-center justify-between"><Link href="/" className="text-2xl font-bold">Lingua</Link><span className="text-sm">Eventos de parceiros</span></header>
   {state.kind==="loading"?<p role="status">Consultando convite...</p>:state.kind==="unavailable"?<section><h1 className="text-3xl font-bold">Convite indisponível</h1><p className="mt-4">Este evento pode ter terminado ou o convite não está mais válido.</p></section>:state.kind==="error"?<section><h1 className="text-3xl font-bold">Não foi possível consultar o convite</h1><button className="mt-4 underline" onClick={onRetry}>Tentar novamente</button></section>:<section>
    <p className="text-sm uppercase tracking-widest">Evento apresentado por {state.partnerName}</p>
    <h1 className="mt-4 text-4xl font-bold">{state.title}</h1>
    <p className="mt-4"><time dateTime={state.scheduledAt}>{new Date(state.scheduledAt).toLocaleString("pt-BR")}</time></p>
    <div className="mt-8 rounded-2xl border border-current/20 p-8" role="status">{state.canWatch?"Evento ao vivo. A transmissão de vídeo ainda não está disponível nesta versão.":"A transmissão ainda não começou."}</div>
   </section>}
   <section className="mt-12 border-t border-current/20 pt-8"><h2 className="text-2xl font-semibold">Seu próximo passo começa com o idioma.</h2><p className="mt-3">Conheça o Lingua e prepare seu inglês para oportunidades internacionais.</p><Link href="/" className="mt-5 inline-block rounded-lg border border-current px-5 py-3 font-semibold">Conhecer o Lingua</Link></section>
  </div>
 </main>;
}
