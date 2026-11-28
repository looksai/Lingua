import mysql from "mysql2/promise";
import {buildMysqlPoolOptions} from "../server/mysql-pool-options";
import {inspectExamSchema} from "../server/exam-schema-preflight";

async function main(){
 if(process.argv.length!==3||process.argv[2]!=="--read-only"){
  console.error("Usage: pnpm exec tsx scripts/exam-schema-preflight.ts --read-only");
  process.exitCode=2;return;
 }
 let pool:ReturnType<typeof mysql.createPool>|undefined;
 try{
  pool=mysql.createPool(buildMysqlPoolOptions(process.env.DATABASE_URL??"",process.env.DATABASE_SSL_CA_BASE64));
  const report=await inspectExamSchema(pool,process.env.LINGUA_EXAM_ITINERARY_ENABLED==="true");
  console.log(JSON.stringify(report));
  if(report.status==="incompatible")process.exitCode=1;
 }catch{
  console.error("Schema inspection failed. Check connection, TLS and metadata visibility. No migration was attempted.");
  process.exitCode=1;
 }finally{if(pool)await pool.end();}
}
void main();
