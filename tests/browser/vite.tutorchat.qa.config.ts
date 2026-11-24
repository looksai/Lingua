import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const root=process.cwd();
const stub=path.resolve(root,"client/qa/tutorchat-trpc-fixture.ts");

/**
 * Lab-only: explicit alias ordering ensures the tRPC stub wins BEFORE the
 * general @/ alias. The production TutorChat source remains unchanged.
 */
export default defineConfig({
  root:path.resolve(root,"client"),
  plugins:[react()],
  resolve:{alias:[
    {find:"@/lib/trpc",replacement:stub},
    {find:"@shared",replacement:path.resolve(root,"shared")},
    {find:"@",replacement:path.resolve(root,"client/src")},
  ]},
  server:{host:"127.0.0.1",port:4181,strictPort:true},
});
