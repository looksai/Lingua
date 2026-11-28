import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import {drizzle} from "drizzle-orm/mysql2";
import {eq} from "drizzle-orm";
import {users} from "../drizzle/schema";
import {saveExamGoal,readExamGoal,recordCompletedExamActivity,recentExamActivities,clearExamHistory} from "../server/exam-history-repository";
import type {CompletedExamActivity} from "../shared/exam-history-contract";
const LAB_URL="mysql://partner_lab:partner_lab@127.0.0.1:33316/partner_lab";
if(process.env.ACADEMY_MYSQL_LAB!=="1"||process.env.DATABASE_URL!==LAB_URL||process.env.NODE_ENV!=="development"||process.env.DATABASE_SSL_CA_BASE64)throw Error("Refusing to run outside disposable loopback lab");
const pools=[mysql.createPool(LAB_URL),mysql.createPool(LAB_URL)];
const [a,b]=pools.map(client=>drizzle({client}));
const ids:number[]=[];
try{
 for(const openId of ["exam-history-lab-a","exam-history-lab-b"]){
  await a.insert(users).values({openId});
  const [row]=await a.select({id:users.id}).from(users).where(eq(users.openId,openId));
  assert.ok(row);ids.push(row.id);
 }
 const [one,two]=ids;
 assert.equal(await readExamGoal(a,one),null);
 await saveExamGoal(a,one,{variant:"ielts-academic",targetBandHalfSteps:14,targetDate:"2027-05-15"});
 assert.equal((await readExamGoal(b,one))?.targetBandHalfSteps,14);
 assert.equal(await readExamGoal(b,two),null);
 await saveExamGoal(b,one,{variant:"ielts-general",targetBandHalfSteps:12,targetDate:null});
 assert.equal((await readExamGoal(a,one))?.variant,"ielts-general");
 await assert.rejects(saveExamGoal(a,one,{variant:"ielts-general",targetBandHalfSteps:19,targetDate:null}));
 const activity:CompletedExamActivity={attemptId:"00000000-0000-4000-8000-000000000001",variant:"ielts-academic",skill:"reading",mode:"practice",exerciseId:"qa-reading",contentVersion:"qa-v1",correct:3,total:4,completedAtMs:Date.now()};
 const receipts=await Promise.all(Array.from({length:8},(_,i)=>recordCompletedExamActivity(i%2?a:b,one,activity)));
 assert.ok(receipts.every(r=>r.correct===3));
 assert.equal((await recentExamActivities(b,one)).length,1);
 assert.equal((await recordCompletedExamActivity(b,one,{...activity,correct:0})).correct,3);
 assert.deepEqual(await recentExamActivities(b,two),[]);
 await assert.rejects(recordCompletedExamActivity(a,one,{...activity,correct:5}));
 await recordCompletedExamActivity(b,two,{...activity,correct:1});
 await clearExamHistory(a,one);
 assert.deepEqual(await recentExamActivities(b,one),[]);
 assert.equal(await readExamGoal(b,one),null);
 assert.equal((await recentExamActivities(b,two))[0]?.correct,1);
 console.log("PASS exam history: durable goals, concurrent idempotency, ownership, invalid metadata, isolated deletion");
}finally{for(const id of ids)await a.delete(users).where(eq(users.id,id));await Promise.all(pools.map(p=>p.end()));}
