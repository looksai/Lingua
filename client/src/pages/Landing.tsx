import { Link } from "wouter";
import { ArrowRight, BookOpen, Briefcase, Globe, Users } from "lucide-react";
import "./academy-landing.css";

const benefits = [
  { title: "Aprenda", text: "Inglês com IA e método adaptativo", Icon: BookOpen },
  { title: "Prepare-se", text: "Para entrevistas e o mercado global", Icon: Briefcase },
  { title: "Conecte-se", text: "Comunidade internacional — planejada", Icon: Users },
  { title: "Expanda", text: "Suas oportunidades de estudo, trabalho e vida", Icon: Globe },
];

export default function Landing() {
  return <main className="academy-landing">
    <section className="academy-hero" id="solucao">
      <header className="academy-nav">
        <Link href="/" className="academy-logo">Lingua<span>.</span></Link>
        <nav aria-label="Menu principal"><a href="#solucao">Solução</a><a href="#metodo">Método</a><a href="#empresas">Empresas</a><a href="#sobre">Sobre</a></nav>
        <div className="academy-actions"><Link href="/login" className="academy-outline">Entrar</Link><Link href="/login" className="academy-gold">Criar conta</Link></div>
      </header>
      <div className="academy-hero-grid">
        <div className="academy-copy">
          <p className="academy-eyebrow">APRENDIZADO • CARREIRA • MOBILIDADE</p>
          <h1>Inglês que conecta você a <span>oportunidades reais no mundo.</span></h1>
          <p>Aprenda inglês com um método inteligente e prático, desenvolva habilidades para sua carreira e prepare-se para novas oportunidades.</p>
          <div className="academy-actions"><Link href="/login" className="academy-gold">Começar agora <ArrowRight size={18}/></Link><Link href="/demo" className="academy-outline">Ver como funciona</Link></div>
        </div>
        <aside className="academy-preview" aria-label="Exemplo de jornada">
          <strong>Inglês</strong><small>Exemplo de jornada</small>
          <p>Comunicação profissional</p><p>Entrevistas e carreira</p><p>Mobilidade internacional</p>
          <small>Prévia ilustrativa • não é avaliação</small>
        </aside>
      </div>
    </section>
    <section id="metodo" className="academy-benefits" aria-label="Pilares do Lingua">{benefits.map(({title,text,Icon})=><article key={title}><Icon aria-hidden="true" size={40}/><div><h2>{title}</h2><p>{text}</p></div></article>)}</section>
    <section id="empresas" className="academy-partners"><div><p className="academy-tag">Programa de Parceiros Fundadores</p><h2>Construa o futuro da Lingua <span>com a gente.</span></h2><p>Empresas, consultorias, escolas e recrutadoras: visão de pilotos e co-desenvolvimento.</p></div><div><p>Pilotos de capacitação</p><p>Condições comerciais a definir</p><p>Visibilidade institucional futura</p><small>Programa em preparação.</small></div></section>
    <footer id="sobre" className="academy-footer"><strong>Tutor IA</strong><strong>Carreira</strong><strong>Comunidade</strong><strong>Empresas</strong><span>Uma plataforma global para o seu próximo passo.</span></footer>
  </main>;
}
