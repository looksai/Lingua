import type {Pool,RowDataPacket} from "mysql2/promise";

const auditTables=[
  "communityModerationAudit",
  "communityPublicationAudit",
  "communityPublicationReports",
] as const;
type ConstraintRow=RowDataPacket&{tableName:string;columnName:string;deleteRule:string};

/**
 * Read-only laboratory preflight. This does not migrate, delete or change data.
 * An account erasure flow must not be shipped while these foreign keys can
 * reject a user deletion or silently destroy required audit evidence.
 */
export async function inspectCommunityDeletionConstraints(pool:Pool,schemaName:string){
  if(!/^[A-Za-z0-9_]{1,64}$/.test(schemaName))throw Error("Invalid schema");
  const [tables]=await pool.query<(RowDataPacket&{tableName:string})[]>(
    "SELECT TABLE_NAME AS tableName FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME IN (?,?,?)",
    [schemaName,...auditTables],
  );
  const names=new Set(tables.map(row=>row.tableName));
  const missingTables=auditTables.filter(name=>!names.has(name));
  const [references]=await pool.query<ConstraintRow[]>(
    `SELECT k.TABLE_NAME AS tableName,k.COLUMN_NAME AS columnName,
       r.DELETE_RULE AS deleteRule
       FROM information_schema.KEY_COLUMN_USAGE AS k
       INNER JOIN information_schema.REFERENTIAL_CONSTRAINTS AS r
         ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA
        AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME
        AND r.TABLE_NAME=k.TABLE_NAME
       WHERE k.TABLE_SCHEMA=? AND k.REFERENCED_TABLE_SCHEMA=?
         AND k.REFERENCED_TABLE_NAME='users'
         AND k.TABLE_NAME IN (?,?,?)
       ORDER BY k.TABLE_NAME,k.COLUMN_NAME`,
    [schemaName,schemaName,...auditTables],
  );
  const constraints=references.map(row=>({
    table:row.tableName,column:row.columnName,
    onDelete:row.deleteRule.toUpperCase(),
  }));
  const restrictive=constraints.filter(c=>c.onDelete==="RESTRICT"||c.onDelete==="NO ACTION");
  // This must remain a manual decision: permissive CASCADE does not prove
  // retention or legal compliance. Never infer production readiness here.
  return {missingTables,constraints,restrictive,requiresPolicyReview:true as const,
    deletionCanBeBlocked:missingTables.length>0||restrictive.length>0};
}
