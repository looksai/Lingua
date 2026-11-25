/**
 * Manual, metadata-only Aiven staging inspector.
 *
 * NEVER modifies the DB: uses only SELECT and SHOW and starts a read-only
 * transaction, under the existing exact host/port/schema and verified TLS.
 * Execution is constrained to a manually approved workflow on main.
 * Deliberately does not SELECT student, learner-memory or institutional rows.
 */
import mysql, {type RowDataPacket} from "mysql2/promise";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import {buildMysqlPoolOptions} from "../server/mysql-pool-options";
import {assertStagingTarget,STAGING_SCHEMA} from "./staging-aiven-guard";

const EXPECTED_TABLES=[
  "users","localCredentials","learnerMemories",
  "learnerPrivacyPreferences","portalMembershipGrants","portalGroups",
  "portalGroupModerators","portalTopics","portalReplies",
  "portalPartners","portalPartnerStaff","portalPartnerInquiries",
  "portalInquiryMessages","portalPartnerAds",
] as const;
const DETAIL_TABLES=[
  "learnerPrivacyPreferences","portalMembershipGrants","portalGroups",
  "portalPartners","portalPartnerInquiries","portalInquiryMessages",
  "portalPartnerAds",
] as const;

/**
 * Require a dedicated account that has only read-level privileges. Any
 * unrecognized role delegation, GRANT OPTION or administrative privilege fails
 * closed. The grant text must never be printed in CI logs.
 */
export function assertReadOnlyGrants(grants:readonly string[]):void{
  if(grants.length===0)throw new Error("Read-only credential grants cannot be verified");
  for(const grant of grants){
    const normalized=grant.trim().toUpperCase();
    // Accept a narrow set of MySQL SHOW GRANTS shapes, not arbitrary roles.
    // USAGE is connection permission only; SELECT is needed for metadata.
    if(!/^GRANT (?:USAGE|SELECT|SELECT, SHOW VIEW|SHOW VIEW, SELECT|SHOW VIEW) ON /.test(normalized) ||
       !normalized.includes(" TO ") ||
       /\bWITH\s+GRANT\s+OPTION\b|\bWITH\s+ADMIN\s+OPTION\b/.test(normalized)){
      throw new Error("Read-only credential has unsupported or elevated grants");
    }
  }
  if(!grants.some(g=>/\bSELECT\b/i.test(g)))
    throw new Error("Read-only credential lacks SELECT grant");
}

export type MetadataReport={
  engine:"mysql";
  mysqlVersionMajorMinor:string;
  schema:string;
  tlsVerified:true;
  tableCount:number;
  present:string[];
  absent:string[];
  journal:{
    present:boolean;
    columns:string[];
    migrationCount:number|null;
    truncated:boolean;
    // Ledger IDs/timestamps are technical metadata; never include user rows.
    entries:Array<{id:number,createdAt:number|null}>;
  };
  columnMetadata:Array<{table:string,column:string,type:string,nullable:boolean}>;
  foreignKeys:Array<{table:string,name:string,target:string}>;
  remoteMigrationApproved:false;
};
type TableRow={tableName:string};
type ColumnRow={tableName:string,columnName:string,columnType:string,isNullable:string};
type ConstraintRow={tableName:string,constraintName:string,targetTable:string};
type JournalRow={id:number;createdAt:number|null};
type ReporterInput={
  version:string,sslCipher:string,tables:TableRow[],columns:ColumnRow[],
  constraints:ConstraintRow[],journalColumns:string[],journal:JournalRow[]|null,
  journalTotal:number|null,
};
export function makeSafeMetadataReport(input:ReporterInput):MetadataReport{
  if(!/^8\.4\./.test(input.version)||!input.sslCipher)
    throw new Error("Unexpected database version or missing TLS");
  const existing=new Set(input.tables.map(t=>t.tableName));
  if(!existing.has("users"))throw new Error("Missing staging users table");
  const allowed=new Set<string>(DETAIL_TABLES);
  // No values, names, emails or message content from any application table.
  return {
    engine:"mysql",mysqlVersionMajorMinor:"8.4",schema:STAGING_SCHEMA,tlsVerified:true,
    tableCount:existing.size,
    present:EXPECTED_TABLES.filter(t=>existing.has(t)),
    absent:EXPECTED_TABLES.filter(t=>!existing.has(t)),
    journal:{
      present:existing.has("__drizzle_migrations"),
      columns:input.journalColumns.filter(c=>["id","hash","created_at"].includes(c)),
      migrationCount:input.journalTotal,
      truncated:input.journalTotal!==null && input.journalTotal>(input.journal?.length??0),
      entries:input.journal??[],
    },
    columnMetadata:input.columns.filter(c=>allowed.has(c.tableName))
      .map(c=>({table:c.tableName,column:c.columnName,
        type:c.columnType,nullable:c.isNullable==="YES"})),
    foreignKeys:input.constraints.filter(c=>allowed.has(c.tableName))
      .map(c=>({table:c.tableName,name:c.constraintName,target:c.targetTable})),
    remoteMigrationApproved:false,
  };
}
function safeMessage(error:unknown){
  const message=error instanceof Error?error.message:"";
  const allowed=["Unexpected database version or missing TLS","Missing staging users table",
    "Read-only staging connection secrets not configured","Workflow must be invoked manually from main",
    "Unexpected Aiven database identity","Staging TLS verification failed",
    "Unexpected migration history column layout",
    "Unexpected migration history count",
    "Read-only credential grants cannot be verified",
    "Read-only credential has unsupported or elevated grants",
    "Read-only credential lacks SELECT grant"];
  return allowed.includes(message)?message:"internal database error (details suppressed)";
}
async function main(){
  if(process.env.GITHUB_EVENT_NAME!=="workflow_dispatch" ||
     process.env.GITHUB_REF!=="refs/heads/main")
    throw new Error("Workflow must be invoked manually from main");
  const url=process.env.LINGUA_STAGING_READONLY_DATABASE_URL;
  const ca=process.env.LINGUA_STAGING_READONLY_CA_BASE64;
  if(!url||!ca)throw new Error("Read-only staging connection secrets not configured");
  assertStagingTarget(url);
  const connection=await mysql.createConnection({
    ...buildMysqlPoolOptions(url,ca),multipleStatements:false,connectTimeout:15000,
  });
  try{
    // MySQL will reject DDL/DML in a READ ONLY transaction. All queries
    // below are fixed statements without user-provided identifiers.
    // Never reuse application/write-capable credentials for the inspector.
    // Do not log SHOW GRANTS output; it may contain account identifiers.
    const [grantRows]=await connection.query<RowDataPacket[]>("SHOW GRANTS FOR CURRENT_USER()");
    assertReadOnlyGrants(grantRows.map(row=>String(Object.values(row)[0]??"")));
    await connection.query("START TRANSACTION READ ONLY");
    const [identity]=await connection.query<RowDataPacket[]>(
      "SELECT DATABASE() AS db, VERSION() AS version");
    if(identity[0]?.db!==STAGING_SCHEMA)throw new Error("Unexpected Aiven database identity");
    const [cipher]=await connection.query<RowDataPacket[]>("SHOW STATUS LIKE 'Ssl_cipher'");
    if(!cipher[0]?.Value)throw new Error("Staging TLS verification failed");
    const [tables]=await connection.query<RowDataPacket[]>(
      "SELECT TABLE_NAME AS tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME");
    const [columns]=await connection.query<RowDataPacket[]>(
      `SELECT TABLE_NAME AS tableName,COLUMN_NAME AS columnName,
        COLUMN_TYPE AS columnType,IS_NULLABLE AS isNullable
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN
        ('learnerPrivacyPreferences','portalMembershipGrants','portalGroups',
         'portalPartners','portalPartnerInquiries','portalInquiryMessages',
         'portalPartnerAds')
        ORDER BY TABLE_NAME,ORDINAL_POSITION`);
    const [constraints]=await connection.query<RowDataPacket[]>(
      `SELECT TABLE_NAME AS tableName,CONSTRAINT_NAME AS constraintName,
        REFERENCED_TABLE_NAME AS targetTable
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
          AND TABLE_NAME IN ('learnerPrivacyPreferences','portalMembershipGrants',
          'portalGroups','portalPartners','portalPartnerInquiries',
          'portalInquiryMessages','portalPartnerAds')
        ORDER BY TABLE_NAME,CONSTRAINT_NAME`);
    const journalPresent=tables.some(row=>row.tableName==="__drizzle_migrations");
    let journalColumns:string[]=[];
    let journal:JournalRow[]|null=null;
    let journalTotal:number|null=null;
    if(journalPresent){
      const [cols]=await connection.query<RowDataPacket[]>(
        "SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='__drizzle_migrations'");
      journalColumns=cols.map(c=>String(c.name));
      const names=new Set(journalColumns);
      if(!names.has("id")||!names.has("created_at"))
        throw new Error("Unexpected migration history column layout");
      const [totalRows]=await connection.query<RowDataPacket[]>(
        "SELECT COUNT(*) AS total FROM __drizzle_migrations");
      journalTotal=Number(totalRows[0]?.total);
      if(!Number.isSafeInteger(journalTotal)||journalTotal<0)
        throw new Error("Unexpected migration history count");
      const [items]=await connection.query<RowDataPacket[]>(
        "SELECT id,created_at AS createdAt FROM __drizzle_migrations ORDER BY id LIMIT 1000");
      journal=items.map(item=>({
        id:Number(item.id),createdAt:item.createdAt===null?null:Number(item.createdAt),
      }));
    }
    const report=makeSafeMetadataReport({
      version:String(identity[0]?.version??""),sslCipher:String(cipher[0].Value),
      tables:tables as TableRow[],columns:columns as ColumnRow[],
      constraints:constraints as ConstraintRow[],
      journalColumns,journal,journalTotal,
    });
    await connection.query("COMMIT");
    console.log("READ-ONLY staging schema inventory (no student records):");
    console.log(JSON.stringify(report,null,2));
    console.log("REMOTE MIGRATION NOT APPROVED: compare journal and backup externally.");
  }catch(error){
    try{await connection.query("ROLLBACK");}catch{/* close connection anyway */}
    throw error;
  }finally{await connection.end();}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  main().catch(error=>{
    console.error("Staging read-only inspection aborted:",safeMessage(error));
    process.exitCode=1;
  });
}
