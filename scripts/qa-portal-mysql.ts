/**
 * Integration smoke test for draft community schema and public/private gates.
 * Refuses every DB except its synthetic loopback-only dedicated database.
 */
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import mysql from "mysql2/promise";
import {communityRouter} from "../server/community-router";
import {partnerRouter} from "../server/partner-router";

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
  const [linked] = await sqlConn.query("SELECT id FROM portalPartners WHERE slug='qa-verified'");
  const partnerId=(linked as Array<{id:number}>)[0].id;
  await sqlConn.query("UPDATE portalGroups SET partnerId=? WHERE id=?",[partnerId,privateGroup]);
  await sqlConn.query("INSERT INTO portalPartnerStaff(partnerId,userId,role) VALUES (?,?,?)",
    [partnerId,userB,"owner"]);
  const [partnerGroup] = await sqlConn.query("SELECT partnerId FROM portalGroups WHERE id=?",[privateGroup]);
  assert.equal((partnerGroup as Array<{partnerId:number}>)[0].partnerId,partnerId);
  // A partner-staff assignment NEVER creates personal Club access.
  const guest=communityRouter.createCaller({user:null} as never);
  assert.deepEqual((await guest.publicGroups()).map(g=>g.slug),["qa-public"]);
  assert.deepEqual((await guest.publicTopics({groupId:publicGroup})).map(t=>t.title),["Discussão aprovada"]);
  assert.deepEqual(await guest.publicTopics({groupId:privateGroup}),[]);
  assert.deepEqual((await guest.verifiedPartners()).map(p=>p.slug),["qa-verified"]);
  const accountB=communityRouter.createCaller({user:{id:userB,email:"portal-b@synthetic.invalid",role:"user"}} as never);
  await assert.rejects(accountB.moderationQueue({groupId:privateGroup}), (err:unknown)=>
    typeof err==="object"&&err!==null&&"code" in err&&err.code==="FORBIDDEN");
  const staffAdmin=communityRouter.createCaller({user:{id:userA,role:"admin",email:"portal-a@synthetic.invalid"}} as never);
  const queue=await staffAdmin.moderationQueue({groupId:publicGroup});
  assert.deepEqual(queue.pendingTopics.map(t=>t.title),["Aguardando moderação"]);
  await assert.rejects(accountB.groupTopics({groupId:privateGroup}), (err:unknown)=>
    typeof err==="object"&&err!==null&&"code" in err&&err.code==="FORBIDDEN");
  await sqlConn.query("INSERT INTO portalMembershipGrants(userId,kind,source,expiresAt) VALUES (?,?,?,DATE_ADD(NOW(),INTERVAL 30 DAY))",
    [userB,"academy","subscription"]);
  assert.equal((await accountB.groupTopics({groupId:privateGroup})).length,1);
  await sqlConn.query("UPDATE portalMembershipGrants SET state='revoked' WHERE userId=?",[userB]);
  await assert.rejects(accountB.groupTopics({groupId:privateGroup}), (err:unknown)=>
    typeof err==="object"&&err!==null&&"code" in err&&err.code==="FORBIDDEN");
  // Partner contact requires affirmative opt-in and a valid member grant.
  const req={headers:{origin:"http://localhost:3000",host:"localhost:3000"}};
  const member=partnerRouter.createCaller({user:{id:userA,role:"user"},req} as never);
  const company=partnerRouter.createCaller({user:{id:userB,role:"user"},req} as never);
  await assert.rejects(member.sendInquiry({partnerId,message:"Gostaria de informações sobre os serviços.",consentToShareMessage:true}),
    (err:unknown)=>typeof err==="object"&&err!==null&&"code" in err&&err.code==="FORBIDDEN");
  await sqlConn.query("INSERT INTO portalMembershipGrants(userId,kind,source) VALUES (?,?,?)",
    [userA,"club","purchase"]);
  await assert.rejects(member.sendInquiry({partnerId,message:"Gostaria de informações sobre os serviços.",consentToShareMessage:false as true}),
    (err:unknown)=>typeof err==="object"&&err!==null&&"code" in err&&err.code==="BAD_REQUEST");
  assert.equal((await member.sendInquiry({partnerId,message:"Gostaria de informações sobre os serviços.",consentToShareMessage:true})).received,true);
  assert.equal((await company.inbox({partnerId})).length,1);
  assert.equal((await company.inbox({partnerId}))[0].message,"Gostaria de informações sobre os serviços.");
  assert.equal(Object.keys((await company.inbox({partnerId}))[0]).includes("userId"),false);
  await assert.rejects(member.inbox({partnerId}),
    (err:unknown)=>typeof err==="object"&&err!==null&&"code" in err&&err.code==="FORBIDDEN");

  await sqlConn.query("INSERT INTO portalPartners(slug,displayName,description,verificationState) VALUES (?,?,?,?)",
    ["qa-second","Segunda organização sintética","Cadastro de QA","verified"]);
  const [otherRows]=await sqlConn.query("SELECT id FROM portalPartners WHERE slug='qa-second'");
  const otherId=(otherRows as Array<{id:number}>)[0].id;
  await sqlConn.query("INSERT INTO portalPartnerStaff(partnerId,userId,role) VALUES (?,?,?)",[otherId,userA,"owner"]);
  assert.equal((await member.inbox({partnerId:otherId})).length,0);
  await assert.rejects(company.inbox({partnerId:otherId}),
    (err:unknown)=>typeof err==="object"&&err!==null&&"code" in err&&err.code==="FORBIDDEN");
  await company.submitProfileEdit({partnerId,description:"Uma nova descrição institucional revisável, apenas para o teste descartável."});
  const beforeApproval=await member.publicProfile({slug:"qa-verified"});
  assert.equal(beforeApproval?.description,"apenas teste");
  const admin=partnerRouter.createCaller({user:{id:userA,role:"admin"},req} as never);
  await admin.approveProfileEdit({partnerId,approve:true});
  assert.match((await member.publicProfile({slug:"qa-verified"}))?.description??"",/revisável/);
  const live=await member.myInquiries();
  assert.equal(live.length,1);
  const roomId=live[0].id;
  assert.deepEqual((await member.roomMessages({inquiryId:roomId})).messages,[]);
  assert.equal((await member.sendRoomMessage({inquiryId:roomId,body:"Olá, gostaria de conversar sobre os requisitos."})).sent,true);
  assert.equal((await company.sendRoomMessage({inquiryId:roomId,body:"Recebemos sua mensagem e podemos conversar por aqui."})).sent,true);
  const exchange=(await member.roomMessages({inquiryId:roomId})).messages;
  assert.deepEqual(exchange.map(m=>m.senderKind),["member","partner"]);
  assert.equal(exchange[1].body,"Recebemos sua mensagem e podemos conversar por aqui.");
  assert.equal(Object.keys(exchange[0]).includes("senderUserId"),false);
  await assert.rejects(member.sendRoomMessage({inquiryId:roomId,body:"x"}),
    (err:unknown)=>typeof err==="object"&&err!==null&&"code" in err&&err.code==="BAD_REQUEST");
  await assert.rejects(member.sendRoomMessage({inquiryId:roomId+99999,body:"Sem autorização"}),
    (err:unknown)=>typeof err==="object"&&err!==null&&"code" in err&&err.code==="FORBIDDEN");

  // A staff account for a different company cannot read or send to this room.
  const outsider=partnerRouter.createCaller({user:{id:userA,role:"user"},req} as never);
  // Member A is entitled to this room, but cannot access a separate member's inquiry:
  await sqlConn.query("INSERT INTO portalPartnerInquiries(partnerId,userId,message,consentAt) VALUES (?,?,?,NOW())",
    [partnerId,userB,"Solicitação independente com autorização para teste"]);
  const [otherRoomRows]=await sqlConn.query(
    "SELECT id FROM portalPartnerInquiries WHERE userId=? ORDER BY id DESC LIMIT 1",[userB]);
  const otherRoomId=(otherRoomRows as Array<{id:number}>)[0].id;
  await sqlConn.query("INSERT INTO portalMembershipGrants(userId,kind,source) VALUES (?,?,?)",
    [userB,"club","purchase"]);
  const otherStaff=partnerRouter.createCaller({user:{id:userB,role:"user"},req} as never);
  const unauthorizedPartnerStaff=partnerRouter.createCaller({user:{id:userA,role:"user"},req} as never);
  await assert.rejects(unauthorizedPartnerStaff.roomMessages({inquiryId:otherRoomId}),
    (err:unknown)=>typeof err==="object"&&err!==null&&"code" in err&&err.code==="FORBIDDEN");
  assert.equal((await otherStaff.roomMessages({inquiryId:otherRoomId})).messages.length,0);

  const inquiries=await member.myInquiries();
  assert.equal(inquiries.length,1);
  await member.withdrawInquiry({inquiryId:inquiries[0].id});
  assert.equal((await company.inbox({partnerId})).length,1,"other still-open inquiry remains");
  await assert.rejects(company.roomMessages({inquiryId:roomId}),
    (err:unknown)=>typeof err==="object"&&err!==null&&"code" in err&&err.code==="FORBIDDEN");
  await assert.rejects(member.sendRoomMessage({inquiryId:roomId,body:"Não pode ser enviado após retirada."}),
    (err:unknown)=>typeof err==="object"&&err!==null&&"code" in err&&err.code==="FORBIDDEN");
  assert.equal((await member.myInquiries())[0].state,"withdrawn");
  await assert.rejects(member.sendInquiry({partnerId:otherId+999,message:"Quero atendimento da organização inexistente.",consentToShareMessage:true}),
    (err:unknown)=>typeof err==="object"&&err!==null&&"code" in err&&err.code==="NOT_FOUND");
  console.log("PASS opt-in business contact: member gate, consent, partner isolation, approval, withdrawal");
  console.log("PASS disposable community MySQL 0009: published public only, no private leak, partner verification, member revocation");
}finally{await sqlConn.end();}
process.exit(0);
