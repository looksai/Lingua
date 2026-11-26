import assert from "node:assert/strict";
import mysql,{type RowDataPacket} from "mysql2/promise";
import {drizzle} from "drizzle-orm/mysql2";
import {reserveAcademyBudget} from "../server/academy-budget-repository";

const LAB_URL="mysql://partner_lab:partner_lab@127.0.0.1:33316/partner_lab";
if(process.env.ACADEMY_MYSQL_LAB!=="1"||process.env.DATABASE_URL!==LAB_URL||
  process.env.NODE_ENV!=="development"||process.env.DATABASE_SSL_CA_BASE64)
  throw Error("Refusing to run outside disposable loopback lab");
const pools=[mysql.createPool(LAB_URL),mysql.createPool(LAB_URL)];
const [a,b]=pools.map(client=>drizzle({client}));
const now=1700000000000, day=86400000;
const limits={global:5,perUser:3};
try{
  // Only the fresh CI fixture may be modified.
  const [initial]=await pools[0].execute<RowDataPacket[]>("SELECT COUNT(*) AS n FROM academyBudgetCounters");
  assert.equal(Number(initial[0].n),0);
  const result=await Promise.all(Array.from({length:10},(_,i)=>reserveAcademyBudget(i%2?a:b,42,1,limits,now)));
  assert.equal(result.filter(Boolean).length,3);
  const global=await Promise.all(Array.from({length:8},(_,i)=>reserveAcademyBudget(i%2?a:b,43+i,1,limits,now)));
  assert.equal(global.filter(Boolean).length,2);
  assert.equal(await reserveAcademyBudget(a,42,1,limits,now),false);
  // New pool and new process-local state cannot restore already spent quota.
  const restarted=mysql.createPool(LAB_URL);
  try{assert.equal(await reserveAcademyBudget(drizzle({client:restarted}),99,1,limits,now),false);}
  finally{await restarted.end();}
  assert.equal(await reserveAcademyBudget(a,42,1,limits,now-day),false);
  assert.equal(await reserveAcademyBudget(a,42,2,limits,now+day),true);
  assert.equal(await reserveAcademyBudget(b,42,2,limits,now+day),false);
  assert.equal(await reserveAcademyBudget(b,42,1,limits,now+day),true);
  assert.equal(await reserveAcademyBudget(b,43,2,limits,now+day),true);
  assert.equal(await reserveAcademyBudget(b,44,1,limits,now+day),false);
  assert.equal(await reserveAcademyBudget(a,0,1,limits,now+day),false);
  assert.equal(await reserveAcademyBudget(a,42,1,{global:0,perUser:3},now+2*day),false);
  const [rows]=await pools[0].execute<RowDataPacket[]>("SELECT used FROM academyBudgetCounters WHERE scopeId=0");
  assert.equal(Number(rows[0].used),5);
  console.log("PASS durable quota: concurrent account/global limits, restart, rollover, rollback, invalid input, zero ceiling");
}finally{await Promise.all(pools.map(p=>p.end()));}
