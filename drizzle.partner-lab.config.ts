import {defineConfig} from "drizzle-kit";
// Never consume DATABASE_URL or deployment secrets.
export default defineConfig({
 schema:["./drizzle/schema.ts","./drizzle/partner-foundation-draft.ts","./drizzle/academy-budget-draft.ts"],
 out:"./.partner-lab-migrations",
 dialect:"mysql",
 dbCredentials:{url:"mysql://partner_lab:partner_lab@127.0.0.1:33316/partner_lab"},
});
