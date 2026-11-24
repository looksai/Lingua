import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Hermetic browser component lab: only the real React components are imported.
 * This server does not boot Express, connect to Aiven or inject Manus loggers.
 */
export default defineConfig({
  root:path.resolve(process.cwd(),"client"),
  plugins:[react()],
  resolve:{alias:{
    "@":path.resolve(process.cwd(),"client/src"),
    "@shared":path.resolve(process.cwd(),"shared"),
  }},
  server:{host:"127.0.0.1",port:4178,strictPort:true},
});
