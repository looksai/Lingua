import { createRoot } from "react-dom/client";
import { SessionQueries } from "./SessionQueries";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<SessionQueries><App/></SessionQueries>);
