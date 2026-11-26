import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import "./academy-landing.css";

export default function Login() {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const utils = trpc.useUtils();
  const signIn = trpc.auth.signIn.useMutation();
  const signUp = trpc.auth.signUp.useMutation();
  const pending = signIn.isPending || signUp.isPending;
  const error = signIn.error ?? signUp.error;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (mode === "signIn") await signIn.mutateAsync({ email, password });
      else await signUp.mutateAsync({ email, password });
      await utils.auth.me.invalidate();
      window.location.assign("/");
    } catch { /* error displayed below */ }
  };
  return <main className="academy-landing academy-auth">
    <div className="academy-auth-art" aria-hidden="true" />
    <section className="academy-auth-content">
      <Link href="/" className="academy-logo"><img src={`${import.meta.env.BASE_URL}academy/logo-lingua-transparente.png`} alt="Lingua" /></Link>
      <Link href="/" className="academy-auth-back">← Voltar ao início</Link>
      <form onSubmit={submit} className="academy-auth-form" aria-labelledby="academy-auth-title">
        <p className="academy-eyebrow">ACADEMY BETA</p>
        <h1 id="academy-auth-title">{mode === "signIn" ? "Bem-vindo ao Lingua" : "Crie sua conta"}</h1>
        <p>Acesse seu espaço de aprendizagem.</p>
        <label htmlFor="academy-email">E-mail</label>
        <input id="academy-email" type="email" autoComplete="email" required maxLength={320} value={email} onChange={e => setEmail(e.target.value)} />
        <label htmlFor="academy-password">Senha</label>
        <input id="academy-password" type="password" autoComplete={mode === "signIn" ? "current-password" : "new-password"} required minLength={mode === "signUp" ? 12 : 1} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} aria-describedby={mode === "signUp" ? "academy-password-help" : undefined} />
        {mode === "signUp" && <p id="academy-password-help" className="academy-auth-help">Use pelo menos 12 caracteres.</p>}
        {error && <p role="alert" className="academy-auth-error">{error.message}</p>}
        <button type="submit" disabled={pending} className="academy-gold">{pending ? "Aguarde..." : mode === "signIn" ? "Entrar" : "Cadastrar"}</button>
        <button type="button" disabled={pending} onClick={() => { setMode(mode === "signIn" ? "signUp" : "signIn"); signIn.reset(); signUp.reset(); }} className="academy-outline">{mode === "signIn" ? "Criar uma conta" : "Já tenho conta"}</button>
      </form>
    </section>
  </main>;
}
