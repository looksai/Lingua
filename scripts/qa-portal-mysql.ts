/**
 * Integration smoke test for draft community schema and public/private gates.
 * Refuses every DB except its synthetic loopback-only dedicated database.
 */
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import mysql from "mysql2/promise";
import {communityRouter} from "../server/community-router";

const dbUrl=process.env.DATABASE_URL;
if(process.env.LINGUA_PORTAL_MYSQL_QA!=="1" || !dbUrl)throw Error("Disposable MySQL QA not authorized");
const url=new URL(dbUrl);
if(!["localhost","127.0.0.1"].includes(url.hostname)||url.pathname!=="/lingua_portal_qa")
  throw Error("Refusing non-disposable database");
const sqlConn=await mysql.createConnection({host:url.hostname,port:Number(url.port||3306),
  user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),
  database:"lingua_portal_qa",multipleStatements:false});
async function migrate(path:string){
  const source=await readFile(new URL(path,import.meta.url),"utf8");
  const statements=source.split("\n").filter(line=>!line.trim().startsWith("--")).join("\n")
    .split(";").map(statement=>statement.trim()).filter(Boolean);
  for(const stmt of statements)
    await sqlConn.query(stmt);
}
try{
  await migrate("../drizzle/0000_initial_users.sql");
  await migrate("../drizzle/0009_portal_community_DRAFT.sql");
  await sqlConn.query("INSERT INTO users(openId,email,loginMethod) VALUES (?,?,?)",
    ["qa-portal-a","portal-a@synthetic.invalid","local"]);
  await sqlConn.query("INSERT INTO users(openId,email,loginMethod) VALUES (?,?,?)",
    ["qa-portal-b","portal-b@synthetic.invalid","local"]);
  const [users] = await sqlConn.query("SELECT id FROM users ORDER BY id");
  const userA=(users as Array<{id:number}>)[0].id;
  const userB=(users as Array<{id:number}>)[1].id;
  await sqlConn.query("INSERT INTO portalGroups(slug,title,description,visibility,state) VALUES (?,?,?,?,?)",
    ["qa-public","Grupo público","Informações gerais","public","active"]);
  await sqlConn.query("INSERT INTO portalGroups(slug,title,description,visibility,state,academyAllowed) VALUES (?,?,?,?,?,?)",
    ["qa-private","Grupo fechado","Somente membros","private","active",1]);
  const [groups]=await sqlConn.query("SELECT id,visibility FROM portalGroups ORDER BY id");
  const publicGroup=(groups as Array<{id:number}>)[0].id;
  const privateGroup=(groups as Array<{id:number}>)[1].id;
  await sqlConn.query("INSERT INTO portalTopics(groupId,authorUserId,title,body,state) VALUES (?,?,?,?,?)",
    [publicGroup,userA,"Discussão aprovada","Conteúdo público","published"]);
  await sqlConn.query("INSERT INTO portalTopics(groupId,authorUserId,title,body) VALUES (?,?,?,?)",
    [publicGroup,userA,"Aguardando moderação","Ainda não público"]);
  await sqlConn.query("INSERT INTO portalTopics(groupId,authorUserId,title,body,state) VALUES (?,?,?,?,?)",
    [privateGroup,userA,"Segredo do grupo","Não expor","published"]);
  await sqlConn.query("INSERT INTO portalPartners(slug,displayName,description,verificationState) VALUES (?,?,?,?)",
    ["qa-verified","Parceiro sintético aprovado","apenas teste","verified"]);
  await sqlConn.query("INSERT INTO portalPartners(slug,displayName,description) VALUES (?,?,?)",
    ["qa-pending","Parceiro pendente","não público"]);
  const guest=communityRouter.createCaller({user:null} as never);
  assert.deepEqual((await guest.publicGroups()).map(g=>g.slug),["qa-public"]);
  assert.deepEqual((await guest.publicTopics({groupId:publicGroup})).map(t=>t.title),["Discussão aprovada"]);
  assert.deepEqual(await guest.publicTopics({groupId:privateGroup}),[]);
  assert.deepEqual((await guest.verifiedPartners()).map(p=>p.slug),["qa-verified"]);
  const accountB=communityRouter.createCaller({user:{id:userB,email:"portal-b@synthetic.invalid",role:"user"}} as never);
  await assert.rejects(accountB.groupTopics({groupId:privateGroup}), (err:unknown)=>
    typeof err==="object"&&err!==null&&"code" in err&&err.code==="FORBIDDEN");
  await sqlConn.query("INSERT INTO portalMembershipGrants(userId,kind,source,expiresAt) VALUES (?,?,?,DATE_ADD(NOW(),INTERVAL 30 DAY))",
    [userB,"academy","subscription"]);
  assert.equal((await accountB.groupTopics({groupId:privateGroup})).length,1);
  await sqlConn.query("UPDATE portalMembershipGrants SET state='revoked' WHERE userId=?",[userB]);
  await assert.rejects(accountB.groupTopics({groupId:privateGroup}), (err:unknown)=>
    typeof err==="object"&&err!==null&&"code" in err&&err.code==="FORBIDDEN");
  console.log("PASS disposable community MySQL 0009: published public only, no private leak, partner verification, member revocation");
}finally{await sqlConn.end();}
process.exit(0);
