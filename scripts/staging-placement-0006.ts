/** Migration 0006 for the exact Lingua Aiven staging MySQL. A push without
 * .ops/APPROVE_AIVEN_0006 is inspection-only. Never execute via a public route.
 * DO NOT print SQL, user data, secrets, host creds, or raw provider errors.
 */
import {existsSync,readFileSync} from "node:fs";
import mysql,{type RowDataPacket} from "mysql2/promise";
import {buildMysqlPoolOptions} from "../server/mysql-pool-options";
import {assertStagingTarget,STAGING_SCHEMA} from "./staging-aiven-guard";

const approval=new URL("../.ops/APPROVE_AIVEN_0006",import.meta.url);
const CONFIRM="APLICAR_0006_PLACEMENT_SOMENTE_LINGUA";
const targets=["learnerPlacementAnswers","learnerPlacementPlans"] as const;
let stage="startup";

async function listTables(conn:mysql.Connection):Promise<Set<string>>{
  const [rows]=await conn.query<RowDataPacket[]>(
    "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()");
  return new Set(rows.map(r=>String(r.name)));
}
async function inspectPrerequisites(conn:mysql.Connection,tables:Set<string>){
  const required=["users","localCredentials","knowledgeItems","userKnowledgeStates","reviewLogs",
    "learnerProfiles","introductoryResponses"];
  if(required.some(x=>!tables.has(x)))throw Error("Prerequisite schema missing");
  const [u]=await conn.query<RowDataPacket[]>(
    "SELECT COLUMN_TYPE AS kind,IS_NULLABLE AS nullable FROM information_schema.COLUMNS "+
    "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='id'");
  if(u.length!==1||u[0]?.kind!=="int"||u[0]?.nullable!=="NO")
    throw Error("Unexpected users PK type");
  const [p]=await conn.query<RowDataPacket[]>(
    "SELECT TABLE_NAME AS name,COLUMN_NAME AS col,DATA_TYPE AS kind FROM information_schema.COLUMNS "+
    "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('learnerProfiles','introductoryResponses')");
  if(!p.some(x=>x.name==="learnerProfiles"&&x.col==="userId"&&x.kind==="int")||
     !p.some(x=>x.name==="introductoryResponses"&&x.col==="userId"&&x.kind==="int"))
    throw Error("0005 column drift");
  const [fks]=await conn.query<RowDataPacket[]>(
    "SELECT k.TABLE_NAME AS name,k.COLUMN_NAME AS col,k.REFERENCED_TABLE_NAME AS refTable,"+
    "k.REFERENCED_COLUMN_NAME AS refCol,r.DELETE_RULE AS rule "+
    "FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r "+
    "ON k.CONSTRAINT_SCHEMA=r.CONSTRAINT_SCHEMA AND k.CONSTRAINT_NAME=r.CONSTRAINT_NAME "+
    "AND k.TABLE_NAME=r.TABLE_NAME WHERE k.TABLE_SCHEMA=DATABASE() "+
    "AND k.TABLE_NAME IN ('learnerProfiles','introductoryResponses') AND k.REFERENCED_TABLE_NAME IS NOT NULL");
  for(const table of ["learnerProfiles","introductoryResponses"])
    if(!fks.some(x=>x.name===table&&x.col==="userId"&&x.refTable==="users"&&x.refCol==="id"&&x.rule==="CASCADE"))
      throw Error("0005 owner FK drift");
  console.log("0005 and user auth/SRS prerequisites: verified.");
}
async function verify(conn:mysql.Connection){
  const [cols]=await conn.query<RowDataPacket[]>(
    "SELECT TABLE_NAME AS name,COLUMN_NAME AS col,DATA_TYPE AS kind "+
    "FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() "+
    "AND TABLE_NAME IN ('learnerPlacementAnswers','learnerPlacementPlans')");
  const needed:Array<[string,string,string]>=[
    ["learnerPlacementAnswers","id","int"],["learnerPlacementAnswers","userId","int"],
    ["learnerPlacementAnswers","taskId","varchar"],["learnerPlacementAnswers","answer","text"],
    ["learnerPlacementAnswers","modality","enum"],["learnerPlacementAnswers","createdAt","timestamp"],
    ["learnerPlacementPlans","userId","int"],["learnerPlacementPlans","planJson","text"],
    ["learnerPlacementPlans","source","enum"],["learnerPlacementPlans","version","int"],
    ["learnerPlacementPlans","createdAt","timestamp"],["learnerPlacementPlans","updatedAt","timestamp"],
  ];
  if(needed.some(([t,c,k])=>!cols.some(x=>x.name===t&&x.col===c&&x.kind===k)))
    throw Error("0006 columns mismatch");
  const [idx]=await conn.query<RowDataPacket[]>(
    "SELECT TABLE_NAME AS name,INDEX_NAME AS idx,COLUMN_NAME AS col,NON_UNIQUE AS nu,SEQ_IN_INDEX AS pos "+
    "FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() "+
    "AND TABLE_NAME IN ('learnerPlacementAnswers','learnerPlacementPlans')");
  function unique(table:string,key:string,cols:string[]){
    const entries=idx.filter(x=>x.name===table&&x.idx===key)
      .sort((a,b)=>Number(a.pos)-Number(b.pos));
    return entries.length===cols.length&&entries.every((x,i)=>x.col===cols[i]&&Number(x.nu)===0);
  }
  if(!unique("learnerPlacementAnswers","PRIMARY",["id"])||
     !unique("learnerPlacementAnswers","learnerPlacementAnswers_user_task_unique",["userId","taskId"])||
     !unique("learnerPlacementPlans","PRIMARY",["userId"]))throw Error("0006 index mismatch");
  const [fk]=await conn.query<RowDataPacket[]>(
    "SELECT k.TABLE_NAME AS name,k.COLUMN_NAME AS col,k.REFERENCED_TABLE_NAME AS refTable,"+
    "k.REFERENCED_COLUMN_NAME AS refCol,r.DELETE_RULE AS rule "+
    "FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r "+
    "ON k.CONSTRAINT_SCHEMA=r.CONSTRAINT_SCHEMA AND k.CONSTRAINT_NAME=r.CONSTRAINT_NAME "+
    "AND k.TABLE_NAME=r.TABLE_NAME WHERE k.TABLE_SCHEMA=DATABASE() "+
    "AND k.TABLE_NAME IN ('learnerPlacementAnswers','learnerPlacementPlans') AND k.REFERENCED_TABLE_NAME IS NOT NULL");
  for(const table of targets)
    if(!fk.some(x=>x.name===table&&x.col==="userId"&&x.refTable==="users"&&x.refCol==="id"&&x.rule==="CASCADE"))
      throw Error("0006 owner FK mismatch");
  console.log("0006 column/index/ownership checks: verified.");
}
async function main(){
  if(process.env.GITHUB_EVENT_NAME!=="push" ||
     process.env.GITHUB_REF!=="refs/heads/ops/aiven-0006-placement")
    throw Error("Ops branch push only");
  const approved=existsSync(approval);
  if(approved && readFileSync(approval,"utf8").trim()!==CONFIRM)throw Error("Wrong approval file");
  if(approved && process.env.LINGUA_STAGING_CONFIRMATION!==CONFIRM)
    throw Error("Explicit ops confirmation mismatch");
  const url=process.env.LINGUA_STAGING_DATABASE_URL,ca=process.env.LINGUA_STAGING_CA_BASE64;
  if(!url||!ca)throw Error("Staging secrets unavailable");
  assertStagingTarget(url);
  stage="connect";
  const conn=await mysql.createConnection({...buildMysqlPoolOptions(url,ca),
    multipleStatements:false,connectTimeout:15000});
  let locked=false;
  try{
    stage="identity";
    const [ident]=await conn.query<RowDataPacket[]>(
      "SELECT DATABASE() AS db,VERSION() AS version");
    if(ident[0]?.db!==STAGING_SCHEMA||!String(ident[0]?.version).startsWith("8.4."))
      throw Error("Unexpected staging database");
    const [tls]=await conn.query<RowDataPacket[]>("SHOW STATUS LIKE 'Ssl_cipher'");
    if(!String(tls[0]?.Value??""))throw Error("Missing TLS");
    stage="inspect";
    const existing=await listTables(conn);
    await inspectPrerequisites(conn,existing);
    const present=targets.filter(x=>existing.has(x));
    console.log("Aiven staging identity+TLS verified; 0006 tables:",present.length,"of 2; mode:",approved?"apply":"inspect");
    if(present.length===1)throw Error("Partial 0006 detected; manual reconciliation required");
    if(present.length===2){
      await verify(conn);
      console.log("0006 already applied; no changes");
      return;
    }
    if(!approved){
      console.log("0006 READ-ONLY INSPECTION COMPLETE; no schema changes");
      return;
    }
    stage="lock";
    const [rows]=await conn.query<RowDataPacket[]>(
      "SELECT GET_LOCK('lingua_staging_schema_bootstrap',15) AS ok");
    if(Number(rows[0]?.ok)!==1)throw Error("Schema lock unavailable");
    locked=true;
    stage="recheck";
    const fresh=await listTables(conn);
    await inspectPrerequisites(conn,fresh);
    if(targets.some(x=>fresh.has(x)))throw Error("0006 appeared during lock");
    const raw=readFileSync(new URL("../drizzle/0006_placement_staging.sql",import.meta.url),"utf8");
    const noComments=raw.replace(/^\s*--.*$/gm,"").trim();
    const stmts=noComments.split(/;\s*/).map(s=>s.trim()).filter(Boolean);
    if(stmts.length!==2||
       !/^CREATE TABLE `learnerPlacementAnswers`\s*\(/.test(stmts[0])||
       !/^CREATE TABLE `learnerPlacementPlans`\s*\(/.test(stmts[1])||
       stmts.some(s=>/\b(?:DROP\s+TABLE|ALTER\s+TABLE|INSERT\s+INTO|DELETE\s+FROM|TRUNCATE\s+TABLE)\b/i.test(s)))
      throw Error("0006 file not restricted to reviewed pair of CREATE TABLE");
    stage="apply";
    for(const statement of stmts)await conn.query(statement);
    stage="verify";
    const created=await listTables(conn);
    if(targets.some(x=>!created.has(x)))throw Error("0006 incomplete");
    await verify(conn);
    const [counts]=await conn.query<RowDataPacket[]>(
      "SELECT (SELECT COUNT(*) FROM learnerPlacementAnswers) AS answers, "+
      "(SELECT COUNT(*) FROM learnerPlacementPlans) AS plans");
    if(Number(counts[0]?.answers)!==0||Number(counts[0]?.plans)!==0)
      throw Error("0006 tables unexpectedly not empty");
    console.log("0006 APPLIED AND VERIFIED: two empty provisional placement tables; users and SRS untouched.");
  }finally{
    stage="close";
    if(locked)try{await conn.query("SELECT RELEASE_LOCK('lingua_staging_schema_bootstrap')");}catch{}
    await conn.end();
  }
}
main().catch(error=>{
  const code=typeof error==="object"&&error!==null&&"code" in error?String(error.code):"";
  const safe=new Set(["ER_PARSE_ERROR","ER_TABLE_EXISTS_ERROR","ER_NO_SUCH_TABLE","ER_CANNOT_ADD_FOREIGN",
    "ER_FK_INCOMPATIBLE_COLUMNS","ER_ACCESS_DENIED_ERROR","ER_LOCK_WAIT_TIMEOUT","ETIMEDOUT","ECONNREFUSED"]);
  console.error("0006 staging stopped at stage="+stage+"; mysql_code="+(safe.has(code)?code:"withheld")+
    ". Review schema before any retry; no secret/SQL printed.");
  process.exitCode=1;
});
