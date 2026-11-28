import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import "./academy-landing.css";
import "./academy-interior.css";

export default function Login() {
  const [mode, setMode] = useState<"signIn" | "signUp">(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "signup" ? "signUp" : "signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const registration = trpc.auth.registrationMode.useQuery(undefined, { retry: false });
  const canRegister = registration.data === "open" || registration.data === "invite";
  const utils = trpc.useUtils();
  const signIn = trpc.auth.signIn.useMutation();
  const signUp = trpc.auth.signUp.useMutation();
  const pending = signIn.isPending || signUp.isPending;
  const error = signIn.error ?? signUp.error;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (mode === "signIn") await signIn.mutateAsync({ email, password });
      else {
        if (!canRegister) return;
        await signUp.mutateAsync({ email, password, inviteCode: registration.data === "invite" ? inviteCode.trim() : undefined });
      }
      await utils.auth.me.invalidate();
      window.location.assign("/");
    } catch { /* error displayed below */ }
  };
  return <main className="academy-landing academy-auth academy-interior">
    <div className="academy-auth-art academy-auth-story"><div><p className="academy-eyebrow">APRENDIZADO • CARREIRA • MOBILIDADE</p><h2>Inglês para o seu<br/> próximo passo.</h2><p>Desenvolva habilidades para oportunidades reais no mundo.</p></div></div>
    <section className="academy-auth-content">
      <Link href="/" className="academy-logo"><img src={`${import.meta.env.BASE_URL}academy/logo-lingua-transparente.png`} alt="Lingua" /></Link>
      <Link href="/" className="academy-auth-back">← Voltar ao início</Link>
      <form onSubmit={submit} className="academy-auth-form" aria-labelledby="academy-auth-title">
        <p className="academy-eyebrow">ACADEMY BETA</p>
        <h1 id="academy-auth-title">{mode === "signIn" ? "Bem-vindo ao Lingua" : "Crie sua conta"}</h1>
        <p>{mode === "signIn" ? "Acesse seu espaço de aprendizagem." : "15 dias gratuitos previstos para o lançamento. Nenhum cartão será solicitado nesta etapa."}</p>
        <label htmlFor="academy-email">E-mail</label>
        <input id="academy-email" type="email" autoComplete="email" required maxLength={320} value={email} onChange={e => {setEmail(e.target.value);signIn.reset();signUp.reset();}} />
        <label htmlFor="academy-password">Senha</label>
        <input id="academy-password" type="password" autoComplete={mode === "signIn" ? "current-password" : "new-password"} required minLength={mode === "signUp" ? 12 : 1} maxLength={128} value={password} onChange={e => {setPassword(e.target.value);signIn.reset();signUp.reset();}} aria-describedby={mode === "signUp" ? "academy-password-help" : undefined} />
        {mode === "signUp" && registration.data === "invite" && <><label htmlFor="academy-invite">Código do convite</label><input id="academy-invite" type="password" autoComplete="off" required minLength={43} maxLength={43} value={inviteCode} onChange={e => {setInviteCode(e.target.value);signUp.reset();}} /><p className="academy-auth-help">Use o e-mail indicado no convite. Não compartilhe seu código.</p></>}
        {mode === "signUp" && <p id="academy-password-help" className="academy-auth-help">Use pelo menos 12 caracteres.</p>}
        {error && <p role="alert" className="academy-auth-error">{error.message}</p>}
        <button type="submit" disabled={pending || (mode === "signUp" && !canRegister)} className="academy-gold">{pending ? "Aguarde..." : mode === "signIn" ? "Entrar" : "Cadastrar"}</button>
        {(canRegister || mode === "signUp") && <button type="button" disabled={pending} onClick={() => { setMode(mode === "signIn" ? "signUp" : "signIn"); setInviteCode(""); signIn.reset(); signUp.reset(); }} className="academy-outline">{mode === "signIn" ? (registration.data === "invite" ? "Tenho um convite" : "Criar uma conta") : "Já tenho conta"}</button>}
        {registration.data === "closed" && <p className="academy-auth-help">Novos cadastros estão temporariamente fechados.</p>}
        {registration.isError && <p role="status" className="academy-auth-help">Não foi possível consultar a disponibilidade de cadastro. Você ainda pode entrar na sua conta.</p>}
      </form>
    </section>
  </main>;
}
