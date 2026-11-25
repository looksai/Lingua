import { ArrowRight, BookOpen, BriefcaseBusiness, Building2, Globe2, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import { Link } from "wouter";

/** Product structure only. No fictitious partners, offers, migration advice or fake activity. */
export const portalSections = [
  { slug:"canada", title:"Canadá", description:"Experiências e dúvidas sobre estudo, trabalho e imigração", flag:"🇨🇦" },
  { slug:"eua", title:"Estados Unidos", description:"Caminhos profissionais, educação e adaptação", flag:"🇺🇸" },
  { slug:"australia", title:"Austrália", description:"Estudo, oportunidades e relatos da comunidade", flag:"🇦🇺" },
  { slug:"europa", title:"Europa", description:"Conversas por país, experiência e objetivo", flag:"🇪🇺" },
  { slug:"carreiras", title:"Carreiras internacionais", description:"Idiomas, entrevistas e profissões no exterior", flag:"🛠️" },
  { slug:"idiomas", title:"Idiomas e exames", description:"Preparação linguística, IELTS e aprendizagem", flag:"📚" },
] as const;

export type PortalSectionSlug = typeof portalSections[number]["slug"];

export function findPortalSection(slug: string) {
  return portalSections.find(section=>section.slug===slug);
}

const primaryLink="inline-flex items-center justify-center gap-2 rounded-full bg-[#14283D] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#223D57] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88A4C]";
const secondaryLink="inline-flex items-center justify-center gap-2 rounded-full border border-[#14283D]/20 bg-white/80 px-6 py-3 text-sm font-semibold text-[#14283D] transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B88A4C]";

export function PortalHeader(){
  return <header className="border-b border-[#14283D]/10 bg-white/95">
    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
      <Link href="/portal" className="font-display text-3xl font-bold tracking-tight text-[#14283D]" aria-label="Lingua — portal">lingua<span className="text-[#B88A4C]">/</span></Link>
      <nav className="flex flex-wrap items-center gap-4 text-sm font-semibold text-[#14283D]" aria-label="Navegação do portal">
        <Link href="/portal" className="hover:underline">Explorar</Link>
        <Link href="/portal/parceiros" className="hover:underline">Empresas</Link>
        <Link href="/login" className="hover:underline">Entrar</Link>
      </nav>
    </div>
  </header>;
}

export function PortalFooter(){
  return <footer className="border-t border-[#14283D]/10 bg-white px-5 py-7 text-center text-xs leading-5 text-[#526478]">
    <p>Lingua — aprendizagem, conexões e oportunidades internacionais.</p>
    <p className="mt-1">Conteúdos compartilhados por membros não substituem orientação jurídica ou migratória de profissionais habilitados.</p>
  </footer>;
}

export default function PublicPortal(){
  return <div className="min-h-screen bg-[#F4F1EB] text-[#14283D]">
    <PortalHeader/>
    <main>
      <section className="relative overflow-hidden bg-[#14283D] px-5 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#D7B887]">Seu projeto de vida internacional começa aqui</p>
          <h1 className="max-w-4xl font-display text-5xl leading-[1.08] tracking-tight sm:text-7xl">Aprenda. Conecte-se. Prepare seu próximo destino.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/80">Conheça caminhos para viver, estudar e trabalhar fora do Brasil. O Lingua reúne educação, comunidade e, progressivamente, profissionais e organizações desse universo.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-[#D7B887] px-6 py-3 font-semibold text-[#14283D] hover:bg-[#F4DFBB]">Conhecer o Academy <ArrowRight size={18}/></Link>
            <a href="#comunidades" className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 font-semibold text-white hover:bg-white/10">Explorar temas</a>
          </div>
          <p className="mt-5 text-xs text-white/65">A comunidade com participação privada e as páginas comerciais estão em preparação. Nenhum parceiro ou vaga é anunciado como existente.</p>
        </div>
      </section>
      <section id="comunidades" className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#956A39]">Descubra seus interesses</p>
        <h2 className="mt-2 font-display text-4xl tracking-tight">Um mundo de conversas para construir</h2>
        <p className="mt-4 max-w-2xl leading-7 text-[#526478]">A área pública apresenta os temas. Publicações e participação em grupos serão habilitadas depois dos controles de acesso, privacidade e moderação.</p>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portalSections.map(section=><Link key={section.slug} href={`/portal/tema/${section.slug}`} className="group rounded-2xl border border-[#14283D]/10 bg-white p-6 transition hover:border-[#B88A4C] hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#B88A4C]">
            <span aria-hidden="true" className="text-3xl">{section.flag}</span>
            <h3 className="mt-4 font-display text-2xl">{section.title}</h3>
            <p className="mt-2 min-h-[3rem] text-sm leading-6 text-[#526478]">{section.description}</p>
            <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[#956A39]">Conhecer tema <ArrowRight size={16}/></span>
          </Link>)}
        </div>
      </section>
      <section className="bg-white px-5 py-16">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-[#14283D]/10 p-6">
            <BookOpen className="text-[#956A39]"/><h2 className="mt-3 font-display text-2xl">Lingua Academy</h2>
            <p className="mt-3 text-sm leading-6 text-[#526478]">Estude inglês com o tutor e atividades de leitura, prática e revisão. O acesso comunitário terá condições próprias.</p>
            <Link href="/login" className={secondaryLink+" mt-5"}>Entrar no Academy</Link>
          </article>
          <article className="rounded-2xl border border-[#14283D]/10 p-6">
            <Users className="text-[#956A39]"/><h2 className="mt-3 font-display text-2xl">Lingua Club</h2>
            <p className="mt-3 text-sm leading-6 text-[#526478]">Grupos temáticos, fóruns e conexões entre pessoas com objetivos internacionais. A participação privada ainda não está disponível.</p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#526478]"><LockKeyhole size={15}/> Acesso em preparação</span>
          </article>
          <article className="rounded-2xl border border-[#14283D]/10 p-6">
            <Building2 className="text-[#956A39]"/><h2 className="mt-3 font-display text-2xl">Lingua Partners</h2>
            <p className="mt-3 text-sm leading-6 text-[#526478]">Espaço para consultorias, escritórios e organizações apresentarem seus serviços, mediante verificação e regras claras.</p>
            <Link href="/portal/parceiros" className={secondaryLink+" mt-5"}>Conhecer o programa</Link>
          </article>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="flex flex-wrap items-start gap-4 rounded-xl border border-[#B88A4C]/25 bg-[#FDF9F1] p-5">
          <ShieldCheck className="shrink-0 text-[#956A39]"/>
          <div className="max-w-3xl">
            <h2 className="font-semibold">Informação independente e relacionamento voluntário</h2>
            <p className="mt-2 text-sm leading-6 text-[#526478]">Publicidade e perfis comerciais serão identificados. Empresas não terão acesso à lista de membros ou dados pessoais por assinarem um plano. O atendimento começará por uma solicitação voluntária do interessado.</p>
          </div>
        </div>
      </section>
    </main><PortalFooter/>
  </div>;
}

export function PortalTopic({ slug }: {slug:string}){
  const section=findPortalSection(slug);
  if(!section)return <div className="min-h-screen bg-[#F4F1EB]"><PortalHeader/><main className="mx-auto max-w-4xl p-10"><h1 className="font-display text-4xl">Tema não encontrado</h1><Link href="/portal" className={secondaryLink+" mt-6"}>Voltar ao portal</Link></main><PortalFooter/></div>;
  return <div className="min-h-screen bg-[#F4F1EB] text-[#14283D]"><PortalHeader/>
    <main className="mx-auto min-h-[60vh] max-w-4xl px-5 py-16">
      <Link href="/portal" className="text-sm text-[#956A39] hover:underline">← Voltar aos temas</Link>
      <p className="mt-8 text-5xl" aria-hidden="true">{section.flag}</p>
      <h1 className="mt-4 font-display text-5xl">{section.title}</h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-[#526478]">{section.description}.</p>
      <div className="mt-9 rounded-2xl border border-[#14283D]/10 bg-white p-7">
        <p className="text-xs font-bold uppercase tracking-widest text-[#956A39]">Comunidade em preparação</p>
        <h2 className="mt-3 font-display text-2xl">Discussões ainda não abertas</h2>
        <p className="mt-3 text-sm leading-7 text-[#526478]">Publicações, comentários e grupos privados serão ativados com moderação e permissões. Não exibimos conversas ou participantes fictícios.</p>
        <Link href="/portal" className={secondaryLink+" mt-5"}>Explorar outros destinos</Link>
      </div>
    </main><PortalFooter/>
  </div>;
}

export function PortalPartners(){
  return <div className="min-h-screen bg-[#F4F1EB] text-[#14283D]"><PortalHeader/>
    <main className="mx-auto min-h-[65vh] max-w-5xl px-5 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#956A39]">Para empresas e profissionais</p>
      <h1 className="mt-3 max-w-3xl font-display text-5xl leading-tight">Sua organização no ecossistema Lingua.</h1>
      <p className="mt-5 max-w-3xl text-lg leading-8 text-[#526478]">Estamos preparando páginas institucionais, grupos próprios e canais de atendimento voluntário para empresas de imigração, educação e carreiras internacionais.</p>
      <div className="mt-9 grid gap-4 sm:grid-cols-3">
        {[
          {Icon:Building2,title:"Página institucional",copy:"Apresentação de serviços e credenciais com identificação clara."},
          {Icon:Globe2,title:"Grupo temático",copy:"Comunicação moderada com pessoas que escolhem acompanhar a organização."},
          {Icon:BriefcaseBusiness,title:"Contato voluntário",copy:"O interessado solicita atendimento; dados não são entregues automaticamente aos parceiros."},
        ].map(({Icon,title,copy})=><article key={title} className="rounded-2xl bg-white p-6"><Icon className="text-[#956A39]"/><h2 className="mt-4 font-display text-2xl">{title}</h2><p className="mt-3 text-sm leading-6 text-[#526478]">{copy}</p></article>)}
      </div>
      <div className="mt-10 rounded-2xl border border-[#14283D]/15 bg-white p-6">
        <h2 className="font-display text-2xl">Programa em estruturação</h2>
        <p className="mt-3 text-sm leading-7 text-[#526478]">Ainda não há inscrições institucionais ou pagamentos habilitados nesta página. As condições comerciais, a verificação de credenciais e os contratos serão publicados antes da abertura.</p>
      </div>
    </main><PortalFooter/>
  </div>;
}
