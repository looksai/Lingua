import { Link } from "wouter";
import { ArrowRight, Play } from "lucide-react";
import "./academy-landing.css";

const asset = (name: string) => `${import.meta.env.BASE_URL}academy/${name}`;
const benefits = [
  { title: "Aprenda", text: "Inglês com IA e método adaptativo", image: "icone-aprenda.png" },
  { title: "Prepare-se", text: "Para entrevistas e o mercado global", image: "icone-prepare-se.png" },
  { title: "Conecte-se", text: "Comunidade internacional em planejamento", image: "icone-conecte-se.png" },
  { title: "Expanda", text: "Suas oportunidades de estudo, trabalho e vida", image: "icone-expanda.png" },
];
const pillars = [
  ["Tutor IA", "Aprendizagem personalizada"],
  ["Carreira", "Inglês aplicado à vida real"],
  ["Comunidade", "Visão de expansão"],
  ["Empresas", "Programa de pré-lançamento"],
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
          <a href="#empresas">Empresas</a>
          <a href="#sobre">Sobre</a>
        </nav>
        <div className="academy-actions academy-nav-actions"><Link href="/login" className="academy-outline">Entrar</Link></div>
      </header>
      <div className="academy-copy">
        <p className="academy-eyebrow">APRENDIZADO • CARREIRA • MOBILIDADE</p>
        <h1>Inglês que conecta você a <span>oportunidades reais no mundo.</span></h1>
        <p className="academy-intro">Aprenda inglês com um método inteligente e prático, desenvolva habilidades para sua carreira e prepare-se para novas oportunidades.</p>
        <div className="academy-actions">
          <Link href="/login" className="academy-gold"><Play size={15} aria-hidden="true" /> Começar agora</Link>
          <Link href="/demo" className="academy-outline"><Play size={15} aria-hidden="true" /> Ver como funciona</Link>
        </div>
        <p className="academy-note">Academy Beta em preparação para alunos convidados.</p>
      </div>
      <aside className="academy-preview" aria-label="Exemplo de jornada">
        <div className="academy-preview-top"><span aria-hidden="true">🇬🇧</span><div><strong>Inglês</strong><small>Exemplo de jornada</small></div></div>
        <ul><li>Comunicação profissional</li><li>Entrevistas e carreira</li><li>Mobilidade internacional</li></ul>
        <small>Prévia ilustrativa • não é avaliação</small>
      </aside>
    </section>
    <section id="metodo" className="academy-benefits" aria-label="Pilares do Lingua">
      {benefits.map(({title,text,image}) => <article key={title}><img src={asset(image)} alt="" /><div><h2>{title}</h2><p>{text}</p></div></article>)}
    </section>
    <section id="empresas" className="academy-partners">
      <img className="academy-building" src={asset("edificio-ilustrativo.png")} alt="Edifício conceitual, não é uma sede real" />
      <div className="academy-partner-copy"><p className="academy-tag">◇ Programa de Parceiros Fundadores</p><h2>Construa o futuro da Lingua <span>com a gente.</span></h2><p>Empresas, consultorias, escolas e recrutadoras: visão de pilotos e co-desenvolvimento.</p></div>
      <ul className="academy-partner-benefits">{partnerBenefits.map(item => <li key={item}>{item}</li>)}</ul>
      <div className="academy-partner-status"><p>Programa em preparação</p><a href="#sobre" className="academy-gold">Conhecer o Lingua <ArrowRight size={16} aria-hidden="true" /></a></div>
    </section>
    <footer id="sobre" className="academy-footer">{pillars.map(([title,description]) => <div key={title}><strong>{title}</strong><small>{description}</small></div>)}<span>Uma plataforma global para o seu próximo passo.</span></footer>
  </main>;
}
