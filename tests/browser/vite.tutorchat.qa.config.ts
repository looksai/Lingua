import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const root=process.cwd();
const stub=path.resolve(root,"client/qa/tutorchat-trpc-fixture.ts");

/**
 * STRICTLY LABORATORY-ONLY: replaces @/lib/trpc at import resolution while
 * importing the real TutorChat and child components without modifying them.
 * No server, browser auth, HTTP client or production databases are started.
 */
export default defineConfig({
  root:path.resolve(root,"client"),
  plugins:[
    {name:"qa-only-trpc-replacement",enforce:"pre" as const,
      resolveId(source:string){
        if(source==="@/lib/trpc")return stub;
        return null;
      }},
    react(),
  ],
  resolve:{alias:{
    "@":path.resolve(root,"client/src"),
    "@shared":path.resolve(root,"shared"),
  }},
  server:{host:"127.0.0.1",port:4181,strictPort:true},
});
