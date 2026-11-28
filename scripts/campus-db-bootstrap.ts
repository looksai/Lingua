import mysql from "mysql2/promise";
import {drizzle} from "drizzle-orm/mysql2";
import {migrate} from "drizzle-orm/mysql2/migrator";
import {buildMysqlPoolOptions} from "../server/mysql-pool-options";
import type {RowDataPacket} from "mysql2";

const schema="lingua_campus";
const appUser="lingua_campus_app";
const tables=["users","localCredentials","knowledgeItems","userKnowledgeStates","reviewLogs","learnerProfiles","introductoryResponses","learnerMemories","learnerPlacementAnswers","learnerPlacementPlans"];
let stage="configuration";
async function main(){
 const adminUrl=process.env.CAMPUS_ADMIN_DATABASE_URL??"";
 const appUrl=process.env.CAMPUS_APP_DATABASE_URL??"";
 const ca=process.env.CAMPUS_DATABASE_CA;
 if(!adminUrl)throw new Error("missing admin URL");
 if(!appUrl)throw new Error("missing app URL");
 if(!ca?.trim())throw new Error("missing CA");
 stage="validate admin URL and CA";
 const admin=buildMysqlPoolOptions(adminUrl,ca);
 stage="validate app URL and CA";
 const app=buildMysqlPoolOptions(appUrl,ca);
 stage="verify target configuration";
 if(admin.database!==schema||app.database!==schema||admin.user!=="avnadmin"||app.user!==appUser||admin.host!==app.host||admin.port!==app.port||!admin.ssl||!app.ssl||!admin.host?.endsWith(".aivencloud.com"))throw Error("unexpected target");
 stage="connect administrator via TLS";
 const db=await mysql.createConnection({...admin,connectTimeout:20000});
 try{
  stage="verify target database";
  const [identity]=await db.query<RowDataPacket[]>("SELECT DATABASE() AS db");
  if(identity[0]?.db!==schema)throw Error("unexpected schema");
  const [before]=await db.query<RowDataPacket[]>("SHOW FULL TABLES");
  const existingNames=before.map(row=>String(Object.values(row)[0]));
  const fresh=existingNames.length===0;
  if(!fresh&&(!tables.every(name=>existingNames.includes(name))||existingNames.some(name=>!tables.includes(name)&&name!=="__drizzle_migrations")||!existingNames.includes("__drizzle_migrations")))throw Error("database is not empty; manual review required");
  stage="verify restricted app account";
  const [grants]=await db.query<RowDataPacket[]>("SHOW GRANTS FOR 'lingua_campus_app'@'%'");
  const lines=grants.flatMap(row=>Object.values(row).map(String));
  const usage=(line:string)=>/^GRANT USAGE ON \*\.\* TO /i.test(line)&&!/WITH GRANT OPTION/i.test(line);
  async function verifyGrants(connection:typeof db,rows:string[]){
   // Use structured authorization data as the primary source, not the
   // vendor-dependent serialization of accounts in SHOW GRANTS.
   const grantee="'lingua_campus_app'@'%'";
   const [inventory]=await connection.query<RowDataPacket[]>("SELECT TABLE_SCHEMA AS db, TABLE_NAME AS tbl, PRIVILEGE_TYPE AS privilege, IS_GRANTABLE AS grantable FROM information_schema.TABLE_PRIVILEGES WHERE GRANTEE = ?",[grantee]);
   const required=new Set(tables.flatMap(table=>["SELECT","INSERT","UPDATE","DELETE"].map(privilege=>table+":"+privilege)));
   let extraTables=0;
   for(const row of inventory){
    if(row.db!==schema||row.grantable!=="NO"||!required.delete(String(row.tbl)+":"+String(row.privilege)))extraTables++;
   }
   const [global]=await connection.query<RowDataPacket[]>("SELECT PRIVILEGE_TYPE AS privilege, IS_GRANTABLE AS grantable FROM information_schema.USER_PRIVILEGES WHERE GRANTEE = ?",[grantee]);
   const [schemas]=await connection.query<RowDataPacket[]>("SELECT PRIVILEGE_TYPE AS privilege FROM information_schema.SCHEMA_PRIVILEGES WHERE GRANTEE = ?",[grantee]);
   const [columns]=await connection.query<RowDataPacket[]>("SELECT PRIVILEGE_TYPE AS privilege FROM information_schema.COLUMN_PRIVILEGES WHERE GRANTEE = ?",[grantee]);
   const extraGlobal=global.filter(row=>row.privilege!=="USAGE"||row.grantable!=="NO").length;
   console.log("Grant inventory: expected table permissions="+(40-required.size)+"/40; unexpected table permissions="+extraTables+"; unexpected global="+extraGlobal+"; schema="+schemas.length+"; column="+columns.length+".");
   if(extraTables||required.size||extraGlobal||schemas.length||columns.length)throw Error("unexpected structured privilege inventory");
   // SHOW GRANTS additionally covers dynamic privileges, routine grants and
   // role assignments. Validate the privilege/scope prefix without parsing
   // the account serialization. Never emit raw GRANT statements.
   const seen=new Set<string>();
   let usageCount=0,unknown=0;
   for(const line of rows){
    const prefix=line.trim().split(/\s+TO\s+/i)[0]??"";
    const normalized=prefix.replace(/[`']/g,"").replace(/\\_/g,"_").replace(/\s+/g," ").trim();
    if(/WITH\s+(GRANT|ADMIN)\s+OPTION/i.test(line)){unknown++;continue;}
    if(/^GRANT USAGE ON \*\.\*$/i.test(normalized)){usageCount++;continue;}
    const match=/^GRANT ([A-Z, ]+) ON (?:TABLE )?lingua_campus\.([A-Za-z0-9_]+)$/i.exec(normalized);
    if(!match||!tables.includes(match[2]!)||seen.has(match[2]!)||match[1]!.split(",").map(p=>p.trim().toUpperCase()).sort().join(",")!=="DELETE,INSERT,SELECT,UPDATE"){unknown++;continue;}
    seen.add(match[2]!);
   }
   console.log("Grant statements: scoped tables="+seen.size+"/10; USAGE="+usageCount+"; unrecognized="+unknown+".");
   if(unknown||seen.size!==tables.length||usageCount>1)throw Error("unrecognized grant shape");
   console.log("Verified 40 explicit non-delegable table privileges.");
  }
  if(fresh){
  if(lines.length!==1||!usage(lines[0]??""))throw Error("app has unexpected existing privileges");
  stage="initialize isolated schema";
  await migrate(drizzle(db),{migrationsFolder:".campus-bootstrap-migrations"});
  const [after]=await db.query<RowDataPacket[]>("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",[schema]);
  if(!tables.every(table=>after.some(row=>row.name===table)))throw Error("missing expected core table");
  stage="grant application DML per table";
  for(const table of tables)await db.query("GRANT SELECT, INSERT, UPDATE, DELETE ON `lingua_campus`.`"+table+"` TO 'lingua_campus_app'@'%'");
  }else{
   await verifyGrants(db,lines);
   const [migration]=await db.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM `__drizzle_migrations`");
   if(Number(migration[0]?.total)!==1)throw Error("unexpected migration history");
   console.log("Existing Campus schema detected; verification only, no DDL or grants executed.");
  }
  stage="verify application connection";
  const client=await mysql.createConnection({...app,connectTimeout:20000});
  try{
   const [current]=await client.query<RowDataPacket[]>("SELECT DATABASE() AS db, CURRENT_USER() AS account, CURRENT_ROLE() AS activeRole");
   if(current[0]?.db!==schema||current[0]?.account!==appUser+"@%")throw Error("unexpected app identity");
   if(current[0]?.activeRole!=="NONE")throw Error("unexpected active role");
   const [roles]=await client.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM information_schema.APPLICABLE_ROLES");
   if(Number(roles[0]?.total)!==0)throw Error("unexpected applicable role");
   const [effectiveGrants]=await client.query<RowDataPacket[]>("SHOW GRANTS");
   await verifyGrants(client,effectiveGrants.flatMap(row=>Object.values(row).map(String)));
   for(const table of tables)await client.query("SELECT 1 FROM `"+table+"` LIMIT 0");
   const [visible]=await client.query<RowDataPacket[]>("SHOW DATABASES");
   const names=visible.map(row=>String(Object.values(row)[0]));
   const systemSchemas=["information_schema","performance_schema","mysql","sys"];
   // Visibility alone does not establish data access; explicit grants, roles and
   // the structured privilege inventory above are the authorization checks.
   console.log("Additional visible schema names (metadata only): "+names.filter(name=>![schema,...systemSchemas].includes(name)).length);
   console.log("Visible system schemas: "+systemSchemas.filter(name=>names.includes(name)).join(", "));
  }finally{await client.end();}
  console.log("Campus bootstrap complete: ten core tables and isolated app connection verified.");
 }finally{await db.end();}
}
const safeMessages=new Set(["missing admin URL","missing app URL","missing CA","Invalid MySQL DATABASE_URL","MySQL URL requests an insecure TLS mode","Invalid MySQL port","DATABASE_SSL_CA_BASE64 is missing; enter the Aiven CA PEM or Base64","DATABASE_SSL_CA_BASE64 is invalid: expected the full CA PEM or Base64","Invalid database CA certificate","Invalid or expired database CA certificate","unexpected target","unexpected schema","database is not empty; manual review required","app has unexpected existing privileges","missing expected core table","unexpected app identity","unexpected visible schema","unexpected visible application schema","unexpected migration history","unexpected active role","unrecognized grant shape","unexpected grant scope or privilege","incomplete grant inventory","unexpected structured table privilege","incomplete structured table privilege inventory","unexpected structured privilege inventory","unexpected applicable role"]);
const safeCodes=new Set(["ENOTFOUND","EAI_AGAIN","ETIMEDOUT","ECONNREFUSED","ECONNRESET","ER_ACCESS_DENIED_ERROR","ER_BAD_DB_ERROR","ER_DBACCESS_DENIED_ERROR","ER_TABLEACCESS_DENIED_ERROR","ER_SPECIFIC_ACCESS_DENIED_ERROR","ER_CANNOT_USER","ER_NONEXISTING_GRANT","ER_PARSE_ERROR","HANDSHAKE_SSL_ERROR","CERT_HAS_EXPIRED","UNABLE_TO_VERIFY_LEAF_SIGNATURE","SELF_SIGNED_CERT_IN_CHAIN","ERR_TLS_CERT_ALTNAME_INVALID","PROTOCOL_CONNECTION_LOST"]);
main().catch((error:unknown)=>{
 const e=error as {message?:unknown;code?:unknown;cause?:{code?:unknown}};
 const code=typeof e?.code==="string"?e.code:typeof e?.cause?.code==="string"?e.cause.code:"";
 const reason=typeof e?.message==="string"&&safeMessages.has(e.message)?e.message:safeCodes.has(code)?code:"withheld";
 console.error("Campus bootstrap stopped at: "+stage+"; reason: "+reason+". No connection strings or raw SQL errors logged.");
 process.exitCode=1;
});
