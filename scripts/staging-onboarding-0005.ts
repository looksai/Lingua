/** Strictly isolated Aiven staging migration 0005. DDL requires an explicit approval marker. */
import { existsSync, readFileSync } from "node:fs";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { buildMysqlPoolOptions } from "../server/mysql-pool-options";
import { assertStagingTarget, STAGING_SCHEMA } from "./staging-aiven-guard";

const approval = new URL("../.ops/APPROVE_AIVEN_0005", import.meta.url);
const phrase = "APLICAR_0005_ONBOARDING_LINGUA";
const expected = ["learnerProfiles","introductoryResponses"] as const;
let stage = "setup";
async function tables(conn: mysql.Connection) {
  const [rows] = await conn.query<RowDataPacket[]>(
    "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()");
  return new Set(rows.map(x=>String(x.name)));
}
async function verify(conn: mysql.Connection) {
  const [cols] = await conn.query<RowDataPacket[]>(
    "SELECT TABLE_NAME AS name,COLUMN_NAME AS col,DATA_TYPE AS kind " +
    "FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() " +
    "AND TABLE_NAME IN ('learnerProfiles','introductoryResponses')");
  const requirements: Array<[string,string,string]> = [
    ["learnerProfiles","userId","int"],["learnerProfiles","interfaceLocale","varchar"],
    ["learnerProfiles","nativeLanguage","varchar"],["learnerProfiles","targetLanguage","varchar"],
    ["learnerProfiles","tutorName","varchar"],["learnerProfiles","tutorPersona","enum"],
    ["learnerProfiles","interest","enum"],["learnerProfiles","onboardingStatus","enum"],
    ["learnerProfiles","allowAIFeedback","int"],["learnerProfiles","createdAt","timestamp"],
    ["learnerProfiles","updatedAt","timestamp"],["introductoryResponses","id","int"],
    ["introductoryResponses","userId","int"],["introductoryResponses","taskId","varchar"],
    ["introductoryResponses","answer","text"],["introductoryResponses","tutorReply","varchar"],
    ["introductoryResponses","createdAt","timestamp"],
  ];
  if(requirements.some(([name,col,kind])=>!cols.some(x=>x.name===name&&x.col===col&&x.kind===kind)))
    throw new Error("0005 schema mismatch");
  const [idx] = await conn.query<RowDataPacket[]>(
    "SELECT TABLE_NAME AS name,INDEX_NAME AS idx,COLUMN_NAME AS col,NON_UNIQUE AS nu,SEQ_IN_INDEX AS pos " +
    "FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() " +
    "AND TABLE_NAME IN ('learnerProfiles','introductoryResponses')");
  function unique(table:string,key:string,columns:string[]) {
    const rows=idx.filter(x=>x.name===table&&x.idx===key).sort((a,b)=>Number(a.pos)-Number(b.pos));
    return rows.length===columns.length && rows.every((x,i)=>x.col===columns[i]&&Number(x.nu)===0);
  }
  if(!unique("learnerProfiles","PRIMARY",["userId"]) ||
     !unique("introductoryResponses","PRIMARY",["id"]) ||
     !unique("introductoryResponses","introductoryResponses_user_task_unique",["userId","taskId"]))
    throw new Error("0005 unique-index mismatch");
  const [fk]=await conn.query<RowDataPacket[]>(
    "SELECT k.TABLE_NAME AS name,k.COLUMN_NAME AS col,k.REFERENCED_TABLE_NAME AS refTable," +
    "k.REFERENCED_COLUMN_NAME AS refCol,r.DELETE_RULE AS rule " +
    "FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r " +
    "ON k.CONSTRAINT_SCHEMA=r.CONSTRAINT_SCHEMA AND k.CONSTRAINT_NAME=r.CONSTRAINT_NAME AND k.TABLE_NAME=r.TABLE_NAME " +
    "WHERE k.TABLE_SCHEMA=DATABASE() AND k.TABLE_NAME IN ('learnerProfiles','introductoryResponses') " +
    "AND k.REFERENCED_TABLE_NAME IS NOT NULL");
  for(const name of expected) {
    if(!fk.some(x=>x.name===name&&x.col==="userId"&&x.refTable==="users"&&x.refCol==="id"&&x.rule==="CASCADE"))
      throw new Error("0005 owner FK mismatch");
  }
  console.log("0005 columns, unique constraints and ownership FKs verified.");
}
async function run(){
  if(process.env.GITHUB_EVENT_NAME!=="push" ||
     process.env.GITHUB_REF!=="refs/heads/ops/aiven-0005-onboarding")
    throw new Error("Trusted staging ops branch only");
  const approved=existsSync(approval);
  if(approved && readFileSync(approval,"utf8").trim()!==phrase)
    throw new Error("Wrong approval marker");
  if(approved && process.env.LINGUA_STAGING_CONFIRMATION!==phrase)
    throw new Error("Approval environment mismatch");
  const url=process.env.LINGUA_STAGING_DATABASE_URL,ca=process.env.LINGUA_STAGING_CA_BASE64;
  if(!url||!ca)throw new Error("Missing Aiven staging secrets");
  assertStagingTarget(url);
  stage="connect";
  const conn=await mysql.createConnection({...buildMysqlPoolOptions(url,ca),
    multipleStatements:false,connectTimeout:15000});
  let locked=false;
  try{
    stage="identity";
    const [i]=await conn.query<RowDataPacket[]>("SELECT DATABASE() AS db, VERSION() AS version");
    if(i[0]?.db!==STAGING_SCHEMA||!String(i[0]?.version).startsWith("8.4."))
      throw new Error("Unexpected staging identity");
    const [tls]=await conn.query<RowDataPacket[]>("SHOW STATUS LIKE 'Ssl_cipher'");
    if(!String(tls[0]?.Value??""))throw new Error("Missing TLS");
    stage="inspect";
    const current=await tables(conn);
    const prerequisites=["users","localCredentials","knowledgeItems","userKnowledgeStates","reviewLogs"];
    if(prerequisites.some(t=>!current.has(t)))throw new Error("Prerequisite tables missing");
    const found=expected.filter(t=>current.has(t));
    console.log("Aiven identity, TLS, auth/SRS prerequisites: verified.");
    console.log("0005 existing tables:",found.length,"of 2; action:",approved?"migrate":"inspect");
    if(found.length===1)throw new Error("Partial 0005 detected; inspect manually");
    if(!approved){
      if(found.length===2)await verify(conn);
      console.log("READ-ONLY INSPECTION COMPLETE");
      return;
    }
    stage="lock";
    const [lock]=await conn.query<RowDataPacket[]>("SELECT GET_LOCK('lingua_staging_schema_bootstrap',15) AS ok");
    if(Number(lock[0]?.ok)!==1)throw new Error("Schema lock unavailable");
    locked=true;
    stage="recheck";
    const now=await tables(conn);
    if(prerequisites.some(t=>!now.has(t)))throw new Error("Prerequisites changed");
    const present=expected.filter(t=>now.has(t));
    if(present.length===1)throw new Error("Partial 0005 under lock");
    if(present.length===2){
      await verify(conn);
      console.log("0005 already applied; no changes");
      return;
    }
    const sql=readFileSync(new URL("../drizzle/0005_onboarding_jarvis.sql",import.meta.url),"utf8");
    const statements=sql.split(/;\s*(?:\r?\n|$)/).map(x=>x.trim()).filter(Boolean);
    if(statements.length!==2 || !statements[0].includes("CREATE TABLE `learnerProfiles`") ||
      !statements[1].includes("CREATE TABLE `introductoryResponses`"))
      throw new Error("0005 SQL is not the reviewed additive pair of CREATE TABLE statements");
    stage="apply";
    for(const statement of statements)await conn.query(statement);
    stage="verify";
    const done=await tables(conn);
    if(expected.some(t=>!done.has(t)))throw new Error("0005 not completed");
    await verify(conn);
    console.log("0005 APPLIED AND VERIFIED: two onboarding tables; no existing SRS or users modified.");
  }finally{
    stage="close";
    if(locked)try{await conn.query("SELECT RELEASE_LOCK('lingua_staging_schema_bootstrap')");}catch{}
    await conn.end();
  }
}
run().catch(error=>{
  const code=typeof error==="object"&&error!==null&&"code" in error?String(error.code):"";
  const allow=new Set(["ER_NO_SUCH_TABLE","ER_TABLE_EXISTS_ERROR","ER_PARSE_ERROR","ER_CANNOT_ADD_FOREIGN",
    "ER_FK_INCOMPATIBLE_COLUMNS","ER_ACCESS_DENIED_ERROR","ETIMEDOUT","ECONNREFUSED"]);
  console.error("0005 staging failure at stage="+stage+"; code="+(allow.has(code)?code:"withheld")+
    ". Review schema before retry. No credentials or SQL logged.");
  process.exitCode=1;
});
