import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Link, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import StudentHome from "./pages/StudentHome";
import Premium from "./pages/Premium";

function Loading({ text }: { text: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-paper px-6 text-ink" role="status">{text}</main>;
}

function PrivateExperience({ email }: { email: string }) {
  const snapshot = trpc.onboarding.me.useQuery(undefined, { retry: false });
  if (snapshot.isPending) return <Loading text="Preparando seu espaço de aprendizagem..." />;
  if (snapshot.error || !snapshot.data) return <main className="min-h-screen bg-paper p-10 text-ink">
    <h1 className="font-display text-3xl">Seu espaço não está disponível agora</h1>
    <p className="mt-3 text-sm">Não foi possível carregar seu perfil. Nenhum dado de demonstração será exibido no lugar do seu progresso.</p>
    <button onClick={() => void snapshot.refetch()} className="mt-5 rounded-full bg-ink px-5 py-3 text-sm text-white">Tentar novamente</button>
  </main>;
  const profile = snapshot.data.profile;
  if (!profile || profile.onboardingStatus === "started") return <Onboarding snapshot={snapshot.data} />;
  return <StudentHome snapshot={snapshot.data} email={email} />;
}

function RootPage() {
  const identity = trpc.auth.me.useQuery(undefined, { retry: false });
  if (identity.isPending) return <Loading text="Carregando Lingua..." />;
  if (identity.error) return <Loading text="Não foi possível confirmar sua sessão. Verifique a conexão e recarregue a página." />;
  if (!identity.data) return <Landing />;
  return <PrivateExperience key={identity.data.id} email={identity.data.email ?? "minha conta"} />;
}

function DemoPage() {
  const identity = trpc.auth.me.useQuery(undefined, { retry: false });
  if (identity.isPending) return <Loading text="Carregando..." />;
  if (identity.error) return <Loading text="Não foi possível confirmar sua sessão." />;
  if (identity.data) return <main className="min-h-screen bg-paper p-10">
    <p>Você já está conectado. A demonstração fictícia não faz parte do seu progresso.</p>
    <Link href="/" className="mt-4 inline-block text-teal underline">Ir para meu espaço</Link>
  </main>;
  return <>
    <div role="note" className="sticky top-0 z-50 bg-ink px-5 py-3 text-center text-xs font-semibold text-white">
      DEMONSTRAÇÃO FICTÍCIA — Welma, percentuais e CSLE exibidos abaixo são simulados. <Link href="/login" className="ml-2 underline">Criar minha conta</Link>
    </div>
    <Home/>
  </>;
}

function Router() {
  return <Switch>
    <Route path="/" component={RootPage} />
    <Route path="/demo" component={DemoPage} />
    <Route path="/login" component={Login} />
    <Route path="/premium" component={Premium} />
    <Route path="/billing/success">{()=> <Premium success />}</Route>
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster/><Router/></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
