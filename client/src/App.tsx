import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";

function HomeRoute() {
  const identity = trpc.auth.me.useQuery(undefined, { retry: false });
  if (identity.isPending) return <main className="min-h-screen bg-paper p-10 text-ink">Verificando sua sessão...</main>;
  if (identity.isError) return <main className="min-h-screen bg-paper p-10 text-ink">
    <h1 className="font-display text-3xl">Não foi possível verificar sua sessão</h1>
    <button className="mt-4 border p-3" onClick={() => void identity.refetch()}>Tentar novamente</button>
  </main>;
  // The demonstration is guest-only. Authenticated students never see demo data.
  return identity.data ? <StudentWorkspace /> : <Home />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/login" component={Login} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
