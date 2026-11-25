/**
 * Disposable CI MySQL integration exercise for privacy migration 0008.
 * NEVER runs against Aiven or a network database. No real learner accounts.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";
import { registerLocalUser } from "../server/auth-local";
import { readPrivacyPreferences, changePersonalMemoryPreference } from "../server/privacy-preferences";
import { autoSaveLearnerMemory, listLearnerMemories, saveLearnerMemory } from "../server/learner-memory";

const url = process.env.DATABASE_URL;
if (process.env.LINGUA_MYSQL_PRIVACY_QA !== "1" || !url) throw Error("Isolated MySQL QA gate missing");
const target = new URL(url);
if (!["127.0.0.1","localhost"].includes(target.hostname) || target.pathname !== "/lingua_privacy_qa")
  throw Error("Refusing non-disposable database connection");
const db = await mysql.createConnection({
  host: target.hostname, port:Number(target.port || 3306),
  user:decodeURIComponent(target.username), password:decodeURIComponent(target.password),
  database:"lingua_privacy_qa", multipleStatements:false
});
const sql = async (path:string) => (await readFile(new URL(path, import.meta.url),"utf8"))
  .split("\n").filter(line=>!line.trim().startsWith("--")).join("\n").trim();
const execute = async (path:string) => { await db.query(await sql(path)); };
const source = "Sou soldador e quero praticar entrevistas.";
const fact = { fato:"Sou soldador",categoria:"profissao" as const };
const accountA = "privacy-qa-a@synthetic.invalid";
const accountB = "privacy-qa-b@synthetic.invalid";
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

try {
  const [versionRows]=await db.query("SELECT VERSION() AS version");
  assert.match(String((versionRows as Array<{version:string}>)[0]?.version),/^8\.4\./,
    "Disposable privacy QA must match staging MySQL 8.4");
  await execute("../drizzle/0000_initial_users.sql");
  await execute("../drizzle/0003_local_credentials.sql");
  await execute("../drizzle/0007_learner_memories.sql");
  await execute("../drizzle/0008_privacy_preferences_DRAFT.sql");
  const a=await registerLocalUser(accountA,"synthetic-secure-password-a",true);
  const b=await registerLocalUser(accountB,"synthetic-secure-password-b",false);
  assert.deepEqual(await readPrivacyPreferences(a.id),{
    serviceAccepted:true,personalMemoryEnabled:true,legacyAccount:false
  });
  assert.equal((await readPrivacyPreferences(b.id)).personalMemoryEnabled,false);
  assert.deepEqual(await autoSaveLearnerMemory(a.id,fact,source),{saved:true});
  assert.deepEqual(await autoSaveLearnerMemory(b.id,fact,source),{saved:false});
  assert.equal((await listLearnerMemories(a.id)).length,1);
  assert.equal((await listLearnerMemories(b.id)).length,0);

  await changePersonalMemoryPreference(a.id,false);
  assert.deepEqual(await autoSaveLearnerMemory(a.id,{fato:"Quero estudar inglês",categoria:"objetivo"},"Quero estudar inglês"),{saved:false});
  await assert.rejects(saveLearnerMemory(a.id,{...fact,sourceMessage:source,consent:true}),/memory disabled/);
  assert.equal((await listLearnerMemories(a.id)).length,1,"opt-out does not silently delete previously saved facts");

  // A model response that started before revocation must not insert after it.
  await changePersonalMemoryPreference(a.id,true);
  const locked=await mysql.createConnection({
    host:target.hostname,port:Number(target.port||3306),user:decodeURIComponent(target.username),
    password:decodeURIComponent(target.password),database:"lingua_privacy_qa"
  });
  try {
    await locked.beginTransaction();
    await locked.query("SELECT userId FROM learnerPrivacyPreferences WHERE userId = ? FOR UPDATE",[a.id]);
    let finished=false;
    const late=autoSaveLearnerMemory(a.id,{fato:"Quero trabalhar no exterior",categoria:"objetivo"},"Quero trabalhar no exterior")
      .then(v=>{finished=true;return v;});
    await pause(150);
    assert.equal(finished,false,"the saving transaction must wait for locked choice");
    await locked.query("UPDATE learnerPrivacyPreferences SET personalMemoryEnabled=0 WHERE userId=?",[a.id]);
    await locked.commit();
    assert.deepEqual(await Promise.race([late,pause(7000).then(()=>{throw Error("Late memory transaction timeout");})]),{saved:false});
    assert.equal((await listLearnerMemories(a.id)).length,1);
  } finally { try{await locked.rollback();}catch{} await locked.end(); }

  // Older accounts do not gain automatic memory permission by being present.
  const legacy=await db.query("INSERT INTO users(openId,email,loginMethod) VALUES (?,?,?)",
    ["local:privacy-qa-legacy", "privacy-qa-legacy@synthetic.invalid","local"]);
  const legacyId=(legacy[0] as {insertId:number}).insertId;
  assert.deepEqual(await readPrivacyPreferences(legacyId),{
    serviceAccepted:false,personalMemoryEnabled:false,legacyAccount:true
  });
  assert.deepEqual(await autoSaveLearnerMemory(legacyId,fact,source),{saved:false});
  assert.deepEqual(await saveLearnerMemory(legacyId,{...fact,sourceMessage:source,consent:true}),{saved:true});
  assert.equal((await listLearnerMemories(legacyId)).length,1);
  assert.equal((await listLearnerMemories(b.id)).length,0);

  console.log("PASS disposable MySQL 0008: transactional signup, isolation, opt-out, direct-save block, in-flight lock, legacy behavior");
} finally {
  await db.end();
}

// The application uses a long-lived MySQL pool. A disposable one-shot CI
// process must exit explicitly after assertions pass, never wait on that pool.
process.exit(0);
