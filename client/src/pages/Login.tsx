import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Login() {
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [serviceAccepted, setServiceAccepted] = useState(false);
  const utils = trpc.useUtils();
  const signIn = trpc.auth.signIn.useMutation();
  const signUp = trpc.auth.signUp.useMutation();
  const pending = signIn.isPending || signUp.isPending;
  const error = signIn.error ?? signUp.error;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === "signUp" && !serviceAccepted) return;
    try {
      if (mode === "signIn") await signIn.mutateAsync({ email, password });
      else await signUp.mutateAsync({ email, password, serviceAccepted: true });
      await utils.auth.me.invalidate();
      window.location.assign("/");
    } catch { /* error displayed below */ }
  };
  return <main className="min-h-screen bg-paper text-ink flex items-center justify-center px-4">
    <form onSubmit={submit} className="w-full max-w-md border border-ink/10 bg-white p-8 space-y-5">
      <Link href="/" className="text-sm text-teal">← Voltar à demonstração</Link>
      <h1 className="font-display text-4xl">lingua/</h1>
      <h2 className="text-xl font-semibold">{mode === "signIn" ? "Entrar" : "Criar conta"}</h2>
      <label className="block text-sm">Email<input type="email" autoComplete="email" required maxLength={320} value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full border p-3"/></label>
      <label className="block text-sm">Senha<input type="password" autoComplete={mode === "signIn" ? "current-password" : "new-password"} required minLength={mode === "signUp" ? 12 : 1} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full border p-3"/></label>
      {mode === "signUp" && <>
        <p className="text-xs text-ink-muted">Use pelo menos 12 caracteres.</p>
        <label className="flex items-start gap-3 text-sm leading-6">
          <input type="checkbox" required checked={serviceAccepted} onChange={event => setServiceAccepted(event.target.checked)} className="mt-1.5" />
          <span>Li e aceito os termos de uso e o aviso de privacidade aplicáveis à prestação do serviço. Entendo que minhas mensagens e gravações enviadas ao tutor poderão ser processadas pelos provedores de IA informados, e que meu progresso de estudo será registrado para continuidade das aulas.</span>
        </label>
        <p className="text-xs text-ink-muted">Memórias pessoais opcionais e usos secundários dos dados terão regras próprias. Você poderá consultar e apagar as memórias disponíveis nas configurações.</p>
      </>}
      {error && <p role="alert" className="text-red-700 text-sm">{error.message}</p>}
      <button disabled={pending || (mode === "signUp" && !serviceAccepted)} className="w-full bg-ink text-white p-3 disabled:opacity-50">{pending ? "Aguarde..." : mode === "signIn" ? "Entrar" : "Cadastrar"}</button>
      <button type="button" onClick={() => { setMode(mode === "signIn" ? "signUp" : "signIn"); signIn.reset(); signUp.reset(); }} className="text-sm text-teal">{mode === "signIn" ? "Criar uma conta" : "Já tenho conta"}</button>
    </form>
  </main>;
}
