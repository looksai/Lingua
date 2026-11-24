/**
 * Parse the reviewed one-time 0008 billing DDL: six exact CREATE TABLEs,
 * without arbitrary SQL, DML, ALTER, DROP, or IF NOT EXISTS.\n * SQL column constraints legitimately contain ON UPDATE / ON DELETE.
 * The migration runs with multiStatements:false. Partial MySQL DDL must
 * be manually reviewed; this parser never repairs or rolls back tables.
 */
export const BILLING_0008_TABLES=[
  "billingCustomers","billingSubscriptions","stripeWebhookEvents",
  "tutorTrialState","tutorUsage","billingCheckoutAttempts",
] as const;

export function billing0008Statements(raw:string):string[]{
  const active=raw.split(/\r?\n/).filter(l=>!/^\s*--/.test(l)).join("\n").trim();
  const statements=active.split(";").map(s=>s.trim()).filter(Boolean);
  if(statements.length!==BILLING_0008_TABLES.length ||
     /\b(?:DROP|ALTER|INSERT|REPLACE|TRUNCATE|GRANT|IF\s+NOT\s+EXISTS)\b/i.test(active))
    throw new Error("Unexpected 0008 migration file; refusing execution");
  for(let i=0;i<BILLING_0008_TABLES.length;i++){
    const name=BILLING_0008_TABLES[i];
    if(!statements[i].startsWith("CREATE TABLE `"+name+"` (") ||
       !statements[i].endsWith(")") ||
       (statements[i].match(/\bCREATE\s+TABLE\b/gi)||[]).length!==1)
      throw new Error("Unexpected 0008 migration file; refusing execution");
  }
  return statements;
}
export function billing0008Presence(present:ReadonlySet<string>):"absent"|"complete"|"partial"{
  const count=BILLING_0008_TABLES.filter(name=>present.has(name)).length;
  return count===0?"absent":count===BILLING_0008_TABLES.length?"complete":"partial";
}
