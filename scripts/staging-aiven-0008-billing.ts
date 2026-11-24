/** Guarded Aiven staging MySQL 8.4 billing schema: inspect (read-only),
 * apply (6 CREATE TABLEs) only after a separately verified PRE-0008 backup.
 * No Stripe key, personal data or live service is touched.
 */
import { readFileSync } from "node:fs";
import mysql,{type RowDataPacket} from "mysql2/promise";
import { buildMysqlPoolOptions } from "../server/mysql-pool-options";
import { assertStagingTarget,STAGING_SCHEMA } from "./staging-aiven-guard";
import { signedIntUserIdColumn } from "./staging-memory-0007-column";
import { BILLING_0008_TABLES,billing0008Statements,billing0008Presence } from "./staging-billing-0008-ddl";

const CONFIRM="APLICAR_0008_COBRANCA_STAGING_LINGUA";
const BACKUP_CONFIRM="BACKUP_PRE_0008_GUARDADO_E_VERIFICADO";
const LOCK="lingua_staging_schema_0008";

async function main(){
  const action=process.env.LINGUA_STAGING_ACTION??"inspect";
  if(!["inspect","apply"].includes(action))throw Error("Unexpected billing migration action");
  if(process.env.GITHUB_REF!=="refs/heads/main"||process.env.GITHUB_EVENT_NAME!=="workflow_dispatch")
    throw Error("Manual main-branch migration required");
  const url=process.env.LINGUA_STAGING_DATABASE_URL,ca=process.env.LINGUA_STAGING_CA_BASE64;
  if(!url||!ca)throw Error("Missing staging migration prerequisites");
  assertStagingTarget(url);
  const conn=await mysql.createConnection({
    ...buildMysqlPoolOptions(url,ca),connectTimeout:15000,multipleStatements:false,
  });
  let locked=false;
  try{
    const [identity]=await conn.query<RowDataPacket[]>("SELECT DATABASE() AS target, VERSION() AS version");
    const [cipher]=await conn.query<RowDataPacket[]>("SHOW STATUS LIKE 'Ssl_cipher'");
    if(identity[0]?.target!==STAGING_SCHEMA ||
       !String(identity[0]?.version).startsWith("8.4.") || !cipher[0]?.Value)
      throw Error("Unexpected database version or TLS identity");
    const [columns]=await conn.execute<RowDataPacket[]>(
      "SELECT COLUMN_NAME AS columnName, DATA_TYPE AS dataType, COLUMN_TYPE AS columnType, IS_NULLABLE AS nullable FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='id'"
    );
    if(columns.length!==1||!signedIntUserIdColumn(columns[0]))
      throw Error("users.id incompatible with signed billing FK");
    const [tables]=await conn.execute<RowDataPacket[]>(
      "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()"
    );
    const present=new Set(tables.map(t=>String(t.name)));
    for(const name of ["users","localCredentials","learnerProfiles","learnerMemories"])
      if(!present.has(name))throw Error("0007 prerequisite table missing: "+name);
    const state=billing0008Presence(present);
    console.log("0008 staging MySQL 8.4 / TLS / schema / 0007 verified; billing status="+state);
    if(state==="partial")throw Error("0008 partial schema: manual review required");
    if(state==="complete"){
      if(action==="apply")throw Error("0008 already exists; refusing replay");
      console.log("READ-ONLY 0008 INSPECTION COMPLETED; already present");
      return;
    }
    if(action==="inspect"){
      console.log("READ-ONLY 0008 INSPECTION COMPLETED; all six billing tables absent");
      return;
    }
    if(process.env.LINGUA_STAGING_CONFIRMATION!==CONFIRM ||
       process.env.LINGUA_STAGING_BACKUP_CONFIRMATION!==BACKUP_CONFIRM)
      throw Error("Missing 0008 and independently verified PRE-0008 backup confirmations");

    const statements=billing0008Statements(readFileSync(
      new URL("../drizzle/0008_billing_staging.sql",import.meta.url),"utf8"));
    const [lock]=await conn.execute<RowDataPacket[]>("SELECT GET_LOCK(?,15) AS acquired",[LOCK]);
    if(Number(lock[0]?.acquired)!==1)throw Error("0008 schema lock unavailable");
    locked=true;
    const [again]=await conn.execute<RowDataPacket[]>(
      "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()"
    );
    if(billing0008Presence(new Set(again.map(t=>String(t.name))))!=="absent")
      throw Error("Concurrent billing schema change detected");
    for(let i=0;i<statements.length;i++){
      await conn.query(statements[i]);
      const table=BILLING_0008_TABLES[i];
      const [created]=await conn.execute<RowDataPacket[]>(
        "SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?",[table]);
      if(Number(created[0]?.n)!==1)throw Error("0008 CREATE validation failed");
      console.log("0008 created and verified table "+table);
    }
    const requiredFields:Record<string,string[]>={
      billingCustomers:["userId","stripeCustomerId"],
      billingSubscriptions:["stripeSubscriptionId","userId","status","paidThroughAt","currentPeriodEnd"],
      stripeWebhookEvents:["stripeEventId","status","processedAt"],
      tutorTrialState:["userId","trialStartedAt","trialEndsAt","successfulReplies"],
      tutorUsage:["id","userId","interactionId","kind","state","countable"],
      billingCheckoutAttempts:["id","userId","attemptId","state","expiresAt"],
    };
    for(const table of BILLING_0008_TABLES){
      const [cols]=await conn.execute<RowDataPacket[]>(
        "SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?",[table]);
      const names=new Set(cols.map(c=>String(c.name)));
      if(requiredFields[table].some(name=>!names.has(name)))throw Error("0008 required column missing");
      const [keys]=await conn.query<RowDataPacket[]>("SHOW INDEX FROM `"+table+"`");
      if(!keys.some(k=>k.Key_name==="PRIMARY"))throw Error("0008 primary index missing");
      const [rows]=await conn.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM `"+table+"`");
      if(Number(rows[0]?.n)!==0)throw Error("0008 nonempty after creation");
    }
    const [uniques]=await conn.query<RowDataPacket[]>("SHOW INDEX FROM `tutorUsage`");
    if(!uniques.some(k=>k.Key_name==="tutorUsage_user_interaction_unique"&&Number(k.Non_unique)===0))
      throw Error("0008 unique interaction index missing");
    console.log("0008 APPLIED AND VERIFIED: six billing/trial tables; 0 rows; quota unique index");
    console.log("Existing tutor memory / SRS / CSLE tables untouched");
  }finally{
    if(locked)try{await conn.execute("SELECT RELEASE_LOCK(?)",[LOCK]);}catch{/* connection close releases it */}
    await conn.end();
  }
}
main().catch(error=>{
  const message=error instanceof Error?error.message:"";
  const safe=/^(Unexpected billing migration action|Manual main-branch migration required|Missing staging migration prerequisites|Unexpected database version or TLS identity|users\.id incompatible with signed billing FK|0007 prerequisite table missing: [A-Za-z]+|0008 partial schema: manual review required|0008 already exists; refusing replay|Missing 0008 and independently verified PRE-0008 backup confirmations|0008 schema lock unavailable|Concurrent billing schema change detected|Unexpected 0008 migration file; refusing execution|0008 CREATE validation failed|0008 required column missing|0008 primary index missing|0008 nonempty after creation|0008 unique interaction index missing)$/.test(message);
  console.error("Billing 0008 aborted: "+(safe?message:"internal failure (details suppressed)"));
  process.exitCode=1;
});
