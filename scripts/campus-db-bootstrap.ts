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
 const admin=buildMysqlPoolOptions(adminUrl,ca),app=buildMysqlPoolOptions(appUrl,ca);
 if(admin.database!==schema||app.database!==schema||admin.user!=="avnadmin"||app.user!==appUser||admin.host!==app.host||admin.port!==app.port||!admin.ssl||!app.ssl||!admin.host?.endsWith(".aivencloud.com"))throw Error("unexpected target");
 const db=await mysql.createConnection(admin);
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
main().catch(()=>{console.error("Campus bootstrap stopped at: "+stage+". Review before retrying; credentials and SQL errors withheld.");process.exitCode=1;});
