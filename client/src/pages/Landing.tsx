import { Link } from "wouter";
import { ArrowRight, Play, Globe, Plane, Users, ChartNoAxesColumnIncreasing, Handshake } from "lucide-react";
import "./academy-landing.css";

const asset = (name: string) => `${import.meta.env.BASE_URL}academy/${name}`;
const benefits = [
  { title: "Aprenda", text: "Inglês com IA e método adaptativo", image: "icone-aprenda.png" },
  { title: "Prepare-se", text: "Para entrevistas e o mercado global", image: "icone-prepare-se.png" },
  { title: "Conecte-se", text: "Comunidade internacional em planejamento", image: "icone-conecte-se.png" },
  { title: "Expanda", text: "Suas oportunidades de estudo, trabalho e vida", image: "icone-expanda.png" },
];
const pillars = [
  { title: "Tutor IA", description: "Aprendizagem personalizada", Icon: Users },
  { title: "Carreira", description: "Inglês aplicado à vida real", Icon: ChartNoAxesColumnIncreasing },
  { title: "Comunidade", description: "Visão de expansão", Icon: Handshake },
  { title: "Empresas", description: "Programa de pré-lançamento", Icon: Globe },
];
const partnerBenefits = ["Pilotos de capacitação", "Condições comerciais a definir", "Visibilidade institucional futura", "Participação consultiva"];

export default function Landing() {
  return <main className="academy-landing">
    <section className="academy-hero" id="solucao">
      <header className="academy-nav">
        <Link href="/" className="academy-logo"><img src={asset("logo-lingua-transparente.png")} alt="Lingua" /></Link>
        <nav aria-label="Menu principal">
          <a className="academy-active" href="#solucao">Solução</a>
          <a href="#metodo">Método</a>
          <a href="#planos">Planos</a>
          <a href="#empresas">Empresas</a>
          <a href="#parceiros">Parceiros</a>
          <a href="#sobre">Sobre</a>
        </nav>
        <div className="academy-actions academy-nav-actions"><span className="academy-language" aria-label="Idioma da interface: português"><Globe size={22} aria-hidden="true"/> PT</span><Link href="/login" className="academy-outline">Entrar</Link><Link href="/login?mode=signup" className="academy-gold">Criar conta</Link></div>
      </header>
      <div className="academy-copy">
        <p className="academy-eyebrow">APRENDIZADO • CARREIRA • MOBILIDADE</p>
        <h1>Inglês que conecta<br className="academy-desktop-break"/> você a <span>oportunidades<br className="academy-desktop-break"/> reais no mundo.</span></h1>
        <p className="academy-intro">Aprenda inglês com um método inteligente e prático, desenvolva habilidades para sua carreira e prepare-se para novas oportunidades e acompanhe a construção de uma comunidade global.</p>
        <div className="academy-actions">
          <Link href="/login" className="academy-gold"><Play size={15} aria-hidden="true" /> Começar agora</Link>
          <Link href="/demo" className="academy-outline"><Play size={15} aria-hidden="true" /> Ver como funciona</Link>
        </div>
        <p className="academy-note" id="planos">Academy Beta por convite, em preparação. Planos comerciais ainda não disponíveis.</p>
      </div>
      <div className="academy-flight" aria-hidden="true"><svg viewBox="0 0 360 120" fill="none"><path d="M0 110 Q165 4 337 25" stroke="#1767b4" strokeWidth="1.5" strokeDasharray="5 5"/></svg><Plane size={50} fill="currentColor"/></div>
      <aside className="academy-preview" aria-label="Exemplo de jornada">
        <div className="academy-preview-top"><span aria-hidden="true">🇬🇧</span><div><strong>Inglês</strong><small>Exemplo fictício de jornada</small></div><b className="academy-example-number">78%</b></div>
        <div className="academy-example-track" aria-hidden="true"><span/></div>
        <ul><li>Comunicação profissional</li><li>Entrevistas e carreira</li><li>Mobilidade internacional</li></ul>
        <small>Prévia ilustrativa • não é avaliação</small>
      </aside>
    </section>
    <section id="metodo" className="academy-benefits" aria-label="Pilares do Lingua">
      {benefits.map(({title,text,image}) => <article key={title}><img src={asset(image)} alt="" /><div><h2>{title}</h2><p>{text}</p></div></article>)}
    </section>
    <section id="empresas" className="academy-partners">
      <img className="academy-building" src={asset("edificio-ilustrativo.png")} alt="Edifício conceitual, não é uma sede real" />
      <div className="academy-partner-copy" id="programa-info"><p className="academy-tag">◇ Programa de Parceiros Fundadores</p><h2>Construa o futuro da<br className="academy-desktop-break"/> Lingua <span>com a gente.</span></h2><p>Empresas, consultorias, escolas e recrutadoras que desejam participar desde o início, com pilotos e co-desenvolvimento.</p></div>
      <ul className="academy-partner-benefits">{partnerBenefits.map(item => <li key={item}>{item}</li>)}</ul>
      <div className="academy-partner-status" id="parceiros"><p>Programa em preparação</p><a href="#programa-info" className="academy-gold">Conhecer o programa <ArrowRight size={16} aria-hidden="true" /></a></div>
    </section>
    <footer id="sobre" className="academy-footer">{pillars.map(({title,description,Icon}) => <div key={title}><Icon aria-hidden="true" size={36}/><section><strong>{title}</strong><small>{description}</small></section></div>)}<span>Uma plataforma global para o seu próximo passo.</span></footer>
  </main>;
}
