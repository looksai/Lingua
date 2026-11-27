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
  stage="verify target and empty database";
  const [identity]=await db.query<RowDataPacket[]>("SELECT DATABASE() AS db");
  if(identity[0]?.db!==schema)throw Error("unexpected schema");
  const [before]=await db.query<RowDataPacket[]>("SHOW FULL TABLES");
  if(before.length!==0)throw Error("database is not empty; manual review required");
  stage="verify restricted app account";
  const [grants]=await db.query<RowDataPacket[]>("SHOW GRANTS FOR 'lingua_campus_app'@'%'");
  const lines=grants.flatMap(row=>Object.values(row).map(String));
  if(lines.length!==1||!/^GRANT USAGE ON \*\.\* TO /i.test(lines[0]??"")||/WITH GRANT OPTION/i.test(lines[0]??""))throw Error("app has unexpected existing privileges");
  stage="initialize isolated schema";
  await migrate(drizzle(db),{migrationsFolder:".campus-bootstrap-migrations"});
  const [after]=await db.query<RowDataPacket[]>("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",[schema]);
  if(!tables.every(table=>after.some(row=>row.name===table)))throw Error("missing expected core table");
  stage="grant application DML per table";
  for(const table of tables)await db.query("GRANT SELECT, INSERT, UPDATE, DELETE ON `lingua_campus`.`"+table+"` TO 'lingua_campus_app'@'%'");
  stage="verify application connection";
  const client=await mysql.createConnection(app);
  try{
   const [current]=await client.query<RowDataPacket[]>("SELECT DATABASE() AS db, CURRENT_USER() AS account");
   if(current[0]?.db!==schema||current[0]?.account!==appUser+"@%")throw Error("unexpected app identity");
   for(const table of tables)await client.query("SELECT 1 FROM `"+table+"` LIMIT 0");
   const [visible]=await client.query<RowDataPacket[]>("SHOW DATABASES");
   if(visible.some(row=>!["information_schema",schema].includes(String(Object.values(row)[0]))))throw Error("unexpected visible schema");
  }finally{await client.end();}
  console.log("Campus bootstrap complete: ten core tables and isolated app connection verified.");
 }finally{await db.end();}
}
const safeMessages=new Set(["missing admin URL","missing app URL","missing CA","Invalid MySQL DATABASE_URL","MySQL URL requests an insecure TLS mode","Invalid MySQL port","DATABASE_SSL_CA_BASE64 is missing; enter the Aiven CA PEM or Base64","DATABASE_SSL_CA_BASE64 is invalid: expected the full CA PEM or Base64","Invalid database CA certificate","Invalid or expired database CA certificate","unexpected target","unexpected schema","database is not empty; manual review required","app has unexpected existing privileges","missing expected core table","unexpected app identity","unexpected visible schema"]);
const safeCodes=new Set(["ENOTFOUND","EAI_AGAIN","ETIMEDOUT","ECONNREFUSED","ECONNRESET","ER_ACCESS_DENIED_ERROR","ER_BAD_DB_ERROR","ER_DBACCESS_DENIED_ERROR","ER_TABLEACCESS_DENIED_ERROR","ER_SPECIFIC_ACCESS_DENIED_ERROR","ER_CANNOT_USER","ER_NONEXISTING_GRANT","ER_PARSE_ERROR","HANDSHAKE_SSL_ERROR","CERT_HAS_EXPIRED","UNABLE_TO_VERIFY_LEAF_SIGNATURE","SELF_SIGNED_CERT_IN_CHAIN","ERR_TLS_CERT_ALTNAME_INVALID","PROTOCOL_CONNECTION_LOST"]);
main().catch((error:unknown)=>{
 const e=error as {message?:unknown;code?:unknown;cause?:{code?:unknown}};
 const code=typeof e?.code==="string"?e.code:typeof e?.cause?.code==="string"?e.cause.code:"";
 const reason=typeof e?.message==="string"&&safeMessages.has(e.message)?e.message:safeCodes.has(code)?code:"withheld";
 console.error("Campus bootstrap stopped at: "+stage+"; reason: "+reason+". No connection strings or raw SQL errors logged.");
 process.exitCode=1;
});
