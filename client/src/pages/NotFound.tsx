import "./academy-interior.css";
import { AlertCircle, Home } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

// Hosting answers this path with HTTP 404 while still serving the app.
const NOT_FOUND_PATH = "/404";

// Render for unknown routes and for items the server confirmed missing (e.g. `/page/:id`).
// The redirect is irreversible: never render while loading, on other errors, or before auth resolves.
export default function NotFound() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);

    // Full-page navigation: a client-side route change sends no request, so no 404 status.
    if (window.location.pathname.replace(/\/$/, "") !== NOT_FOUND_PATH) {
      window.location.replace(NOT_FOUND_PATH);
    }

    return () => robots.remove();
  }, []);

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <main className="academy-interior px-5 py-8">
      <div className="academy-state-card">
        <img className="academy-interior-brand" src={`${import.meta.env.BASE_URL}academy/logo-lingua-transparente.png`} alt="Lingua"/>
        <AlertCircle className="mx-auto mb-4 h-10 w-10 text-[#0752a8]" aria-hidden="true"/>
        <h1 className="font-display text-4xl">404</h1>
        <h2 className="mt-2 text-xl font-semibold">Página não encontrada</h2>
        <p>Esta página não existe ou pode ter sido movida. Volte ao início para continuar.</p>
        <button onClick={handleGoHome} className="academy-primary"><Home size={17}/> Voltar ao início</button>
      </div>
    </main>
  );
}
