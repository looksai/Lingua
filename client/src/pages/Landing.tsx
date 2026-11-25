import { Link } from "wouter";
import { ArrowRight, BookOpen, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";

export default function Landing() {
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-ink/10 px-6 py-5">
        <span className="font-display text-3xl tracking-tight">lingua<span className="text-teal">/</span></span>
        <div className="flex flex-wrap items-center gap-3">
        <Link href="/portal" className="text-sm font-semibold text-ink hover:underline">Explorar o portal</Link>
        <Link href="/login" className="rounded-full border border-ink/15 px-5 py-2 text-sm font-semibold hover:bg-white">
          Entrar
        </Link>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-16 lg:grid-cols-[1.2fr_0.8fr] lg:py-28">
        <div>
          <p className="mb-5 text-sm font-bold uppercase tracking-[0.2em] text-teal-deep">Inglês com um caminho que faz sentido</p>
          <h1 className="font-display text-5xl leading-tight tracking-tight sm:text-7xl">Aprender começa com uma conversa.</h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-ink-muted">
            Descubra o que já sabe, escolha como chamar seu tutor e explore inglês com leitura,
            prática e revisões no seu ritmo. Sem progresso inventado.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/login" className="inline-flex items-center gap-2 rounded-full bg-ink px-7 py-4 font-semibold text-white">
              Conhecer meu tutor <ArrowRight size={18}/>
            </Link>
            <Link href="/demo" className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-7 py-4 font-semibold">
              Ver demonstração
            </Link>
            <Link href="/portal" className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-7 py-4 font-semibold">
              Conhecer a comunidade
            </Link>
          </div>
          <p className="mt-5 text-xs text-ink-faint">A demonstração é fictícia e não representa resultados de alunos reais.</p>
        </div>
        <aside className="grid gap-4 rounded-3xl border border-ink/10 bg-white p-8 shadow-sm">
          <h2 className="font-display text-3xl">Seu ritmo. Seu tutor.</h2>
          <div className="flex items-start gap-4"><MessageCircle className="shrink-0 text-teal" /><p>Uma conversa curta para começar. Você escolhe o nome e o tom do tutor.</p></div>
          <div className="flex items-start gap-4"><BookOpen className="shrink-0 text-teal" /><p>Leitura, produção e revisão com objetivos pedagógicos claros.</p></div>
          <div className="flex items-start gap-4"><Sparkles className="shrink-0 text-teal" /><p>O plano inicial é explicado e ajustado à medida que há evidências reais.</p></div>
          <div className="flex items-start gap-4"><ShieldCheck className="shrink-0 text-teal" /><p>A voz é opcional. Sem captação oculta nem certificação automática.</p></div>
        </aside>
      </section>
    </main>
  );
}
