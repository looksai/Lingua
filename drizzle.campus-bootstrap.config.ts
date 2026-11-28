import {defineConfig} from "drizzle-kit";
// Generate only. This configuration has no credentials and must not be used for push/migrate.
export default defineConfig({schema:"./drizzle/schema.ts",out:"./.campus-bootstrap-migrations",dialect:"mysql"});
