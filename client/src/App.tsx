import AdminDashboard from "./pages/AdminDashboard";
import { useSyncExternalStore } from "react";
import "./pages/academy-interior.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import PublicLiveController from "./pages/PublicLiveController";
import {lookupPublicLive} from "./pages/public-live-lookup";
import PartnerDashboard from "./pages/PartnerDashboard";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Onboarding from "./pages/Onboarding";
import StudentHome from "./pages/StudentHome";
import ExamPrivacy from "./pages/ExamPrivacy";

function Loading({ text }: { text: string }) {
  return <main className="academy-interior px-5 py-8" role="status"><div className="academy-state-card"><img className="academy-interior-brand" src={`${import.meta.env.BASE_URL}academy/logo-lingua-transparente.png`} alt="Lingua"/><p>{text}</p></div></main>;
}

function PrivateExperience({ email }: { email: string }) {
  const trial = trpc.auth.trialStatus.useQuery(undefined, { retry: false, refetchInterval: 60000 });
  const logout = trpc.auth.logout.useMutation({onSuccess:()=>window.location.assign("/login")});
  if (trial.isPending) return <Loading text="Confirmando seu acesso..."/>;
  if (trial.error || !trial.data || trial.data.kind === "unavailable") return <main className="academy-interior px-5 py-8"><div className="academy-state-card"><h1 className="font-display text-3xl">Não foi possível confirmar seu acesso</h1><button className="academy-primary mt-5" onClick={()=>void trial.refetch()}>Tentar novamente</button></div></main>;
  if (trial.data.kind === "expired") return <main className="academy-interior px-5 py-8"><div className="academy-state-card"><img className="academy-interior-brand" src={`${import.meta.env.BASE_URL}academy/logo-lingua-transparente.png`} alt="Lingua"/><h1 className="font-display text-3xl">Seus 15 dias gratuitos terminaram.</h1><p>Seu progresso continua vinculado à sua conta. Os planos de assinatura ainda estão em preparação.</p><a href="/exam-privacy">Privacidade do Centro de Exames</a><button className="academy-secondary" disabled={logout.isPending} onClick={()=>logout.mutate()}>Sair da conta</button>{logout.error && <p role="alert">Não foi possível sair. Tente novamente.</p>}</div></main>;
  return <><div className="academy-trial-strip" hidden={trial.data.kind !== "active"}>{trial.data.kind === "active" ? `Período gratuito · ${trial.data.remainingDays} dia(s) restantes` : null}</div><LearningExperience email={email}/></>;
}

function LearningExperience({ email }: { email: string }) {
  const snapshot = trpc.onboarding.me.useQuery(undefined, { retry: false });
  if (snapshot.isPending) return <Loading text="Preparando seu espaço de aprendizagem..." />;
  if (snapshot.error || !snapshot.data) return <main className="academy-interior px-5 py-8"><div className="academy-state-card"><img className="academy-interior-brand" src={`${import.meta.env.BASE_URL}academy/logo-lingua-transparente.png`} alt="Lingua"/>
    <h1 className="font-display text-3xl">Seu espaço não está disponível agora</h1>
    <p className="mt-3 text-sm">Não foi possível carregar seu perfil. Seu progresso permanece vinculado à sua conta.</p>
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
    <Route path="/demo"><Redirect to="/login?mode=signup" replace /></Route>
    {import.meta.env.VITE_PUBLIC_LIVES_ENABLED === "true" && <Route path="/live" component={PublicLivePage} />}
    {import.meta.env.VITE_PARTNER_DASHBOARD_ENABLED === "true" && <Route path="/partners" component={PartnerDashboard} />}
    {import.meta.env.VITE_ADMIN_LAB_ENABLED === "true" && <Route path="/admin" component={AdminDashboard} />}
    <Route path="/exam-privacy" component={ExamPrivacy} />
    <Route path="/login" component={Login} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster/><Router/></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
