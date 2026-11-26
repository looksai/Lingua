import { useSyncExternalStore } from "react";
import "./pages/academy-interior.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Link, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import Home from "./pages/Home";
import PublicLiveController from "./pages/PublicLiveController";
import {lookupPublicLive} from "./pages/public-live-lookup";
import PartnerDashboard from "./pages/PartnerDashboard";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import StudentHome from "./pages/StudentHome";

function Loading({ text }: { text: string }) {
  return <main className="academy-interior px-5 py-8" role="status"><div className="academy-state-card"><img className="academy-interior-brand" src={`${import.meta.env.BASE_URL}academy/logo-lingua-transparente.png`} alt="Lingua"/><p>{text}</p></div></main>;
}

function PrivateExperience({ email }: { email: string }) {
  const snapshot = trpc.onboarding.me.useQuery(undefined, { retry: false });
  if (snapshot.isPending) return <Loading text="Preparando seu espaço de aprendizagem..." />;
  if (snapshot.error || !snapshot.data) return <main className="academy-interior px-5 py-8"><div className="academy-state-card"><img className="academy-interior-brand" src={`${import.meta.env.BASE_URL}academy/logo-lingua-transparente.png`} alt="Lingua"/>
    <h1 className="font-display text-3xl">Seu espaço não está disponível agora</h1>
    <p className="mt-3 text-sm">Não foi possível carregar seu perfil. Nenhum dado de demonstração será exibido no lugar do seu progresso.</p>
    <button onClick={() => void snapshot.refetch()} className="academy-primary">Tentar novamente</button>
  </div></main>;
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
  if (identity.data) return <main className="academy-interior px-5 py-8"><div className="academy-state-card">
    <p>Você já está conectado. A demonstração fictícia não faz parte do seu progresso.</p>
    <Link href="/" className="academy-primary">Ir para meu espaço</Link>
  </div></main>;
  return <>
    <div role="note" className="bg-[#071e48] border-b-3 border-[#f2aa00] px-5 py-3 text-center text-xs font-semibold text-white">
      DEMONSTRAÇÃO FICTÍCIA — Welma, percentuais e CSLE exibidos abaixo são simulados. <Link href="/login" className="ml-2 text-[#ffda65] underline">Criar minha conta</Link>
    </div>
    <Home/>
  </>;
}

function subscribeToInviteHash(onChange:()=>void) {
  window.addEventListener("hashchange",onChange);
  window.addEventListener("popstate",onChange);
  return ()=>{window.removeEventListener("hashchange",onChange);window.removeEventListener("popstate",onChange);};
}
function readInviteHash(){return window.location.hash.slice(1);}
function PublicLivePage() {
  const token=useSyncExternalStore(subscribeToInviteHash,readInviteHash,()=>"");
  return <PublicLiveController key={token} token={token} lookup={lookupPublicLive}/>;
}

function Router() {
  return <Switch>
    <Route path="/" component={RootPage} />
    <Route path="/demo" component={DemoPage} />
    {import.meta.env.VITE_PUBLIC_LIVES_ENABLED === "true" && <Route path="/live" component={PublicLivePage} />}
    {import.meta.env.VITE_PARTNER_DASHBOARD_ENABLED === "true" && <Route path="/partners" component={PartnerDashboard} />}
    <Route path="/login" component={Login} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster/><Router/></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
