import type {Pool,RowDataPacket} from "mysql2/promise";
type Column={name:string;type:string;nullable:string;extra:string};
type Table={name:string;engine:string};
type Index={tableName:string;indexName:string;nonUnique:number;position:number;columnName:string};
type Foreign={tableName:string;columnName:string;referencedTable:string;referencedColumn:string;deleteRule:string;localSchema:number};
type Snapshot={tables:Table[];columns:Record<string,Column[]>;indexes:Index[];foreign:Foreign[]};
const variants="enum('ielts-academic','ielts-general')",skills="enum('reading','listening')",modes="enum('practice','timed')";
const specs:Record<string,[string,string,boolean?,string?][]>={
 examItineraries:[["userId","int"],["revision","varchar(36)"],["bookmarkJson","text"],["savedAtMs","bigint"]],
 examGoals:[["userId","int"],["variant",variants],["targetBandHalfSteps","int",true],["targetDate","varchar(10)",true],["updatedAtMs","bigint"]],
 examCompletedActivities:[["id","int",false,"auto_increment"],["userId","int"],["attemptId","varchar(36)"],["variant",variants],["skill",skills],["exerciseId","varchar(80)"],["contentVersion","varchar(80)"],["mode",modes],["correct","int"],["total","int"],["receiptJson","text",true],["completedAtMs","bigint"]],
 examActiveAttempts:[["userId","int"],["attemptId","varchar(36)"],["variant",variants],["skill",skills],["mode",modes],["exerciseId","varchar(80)"],["contentVersion","varchar(80)"],["deadlineMs","bigint"]]
};
const names=Object.keys(specs);
function normalizeType(type:string){return type.toLowerCase().replace(/^(int|bigint)\(\d+\)$/,"$1");}
function hasIndex(s:Snapshot,table:string,columns:string[],unique:boolean,primary=false){
 const grouped=new Map<string,Index[]>();
 for(const row of s.indexes.filter(i=>i.tableName===table)){
  const group=grouped.get(row.indexName)??[];group.push(row);grouped.set(row.indexName,group);
 }
 return [...grouped.entries()].some(([name,rows])=>(!primary||name==="PRIMARY")&&rows.every(r=>Number(r.nonUnique)===(unique?0:1))&&JSON.stringify(rows.sort((a,b)=>a.position-b.position).map(r=>r.columnName))===JSON.stringify(columns));
}
export function assessExamSchema(s:Snapshot,requireItinerary=false){
 const issues:string[]=[];
 const user=s.columns.users?.find(c=>c.name==="id");
 if(!s.tables.some(t=>t.name==="users"&&t.engine?.toLowerCase()==="innodb")||!user||normalizeType(user.type)!=="int"||user.nullable!=="NO"||!hasIndex(s,"users",["id"],true,true))issues.push("users.id: requires signed INT primary key in InnoDB");
 const present=names.filter(n=>s.tables.some(t=>t.name===n));
 if(issues.length===0&&present.length===0)return {status:"absent" as const,issues};
 const required=names.filter(n=>n!=="examItineraries"||requireItinerary);
 if(required.some(n=>!present.includes(n)))issues.push("exam tables: partial or missing migration");
 for(const name of present){
  if(!s.tables.some(t=>t.name===name&&t.engine?.toLowerCase()==="innodb"))issues.push(name+": requires InnoDB");
  const columns=s.columns[name]??[],expected=specs[name]!;
  if(columns.length!==expected.length)issues.push(name+": unexpected column count");
  for(const [column,type,nullable,extra] of expected){
   const actual=columns.find(c=>c.name===column);
   if(!actual||normalizeType(actual.type)!==type||actual.nullable!==(nullable?"YES":"NO")||actual.extra!==(extra??""))issues.push(name+"."+column+": incompatible column");
  }
  if(!hasIndex(s,name,[name==="examCompletedActivities"?"id":"userId"],true,true))issues.push(name+": missing primary key");
  if(!s.foreign.some(f=>f.tableName===name&&f.columnName==="userId"&&f.referencedTable==="users"&&f.referencedColumn==="id"&&f.deleteRule==="CASCADE"&&Number(f.localSchema)===1))issues.push(name+": missing local cascading user FK");
 }
 if(present.includes("examCompletedActivities")){
  if(!hasIndex(s,"examCompletedActivities",["userId","attemptId"],true))issues.push("examCompletedActivities: missing owner-attempt uniqueness");
  if(!hasIndex(s,"examCompletedActivities",["userId","completedAtMs","id"],false))issues.push("examCompletedActivities: missing recent history index");
 }
 return {status:issues.length?"incompatible" as const:"compatible" as const,issues};
}
/** Only metadata in the currently selected schema. No student table reads or writes. */
export async function inspectExamSchema(pool:Pool,requireItinerary=false){
 const conn=await pool.getConnection();
 try{
  const args=["users",...names];
  const filter="TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (?,?,?,?,?)";
  const [tables]=await conn.execute<RowDataPacket[]>("SELECT TABLE_NAME AS name, ENGINE AS engine FROM information_schema.TABLES WHERE "+filter,args);
  const [columns]=await conn.execute<RowDataPacket[]>("SELECT TABLE_NAME AS tableName, COLUMN_NAME AS name, COLUMN_TYPE AS type, IS_NULLABLE AS nullable, EXTRA AS extra FROM information_schema.COLUMNS WHERE "+filter,args);
  const [indexes]=await conn.execute<RowDataPacket[]>("SELECT TABLE_NAME AS tableName, INDEX_NAME AS indexName, NON_UNIQUE AS nonUnique, SEQ_IN_INDEX AS position, COLUMN_NAME AS columnName FROM information_schema.STATISTICS WHERE "+filter,args);
  const [foreign]=await conn.execute<RowDataPacket[]>(`SELECT k.TABLE_NAME AS tableName,k.COLUMN_NAME AS columnName,k.REFERENCED_TABLE_NAME AS referencedTable,k.REFERENCED_COLUMN_NAME AS referencedColumn,r.DELETE_RULE AS deleteRule,(k.REFERENCED_TABLE_SCHEMA=DATABASE()) AS localSchema FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME AND r.TABLE_NAME=k.TABLE_NAME WHERE k.TABLE_SCHEMA=DATABASE() AND k.TABLE_NAME IN (?,?,?,?,?) AND k.REFERENCED_TABLE_NAME IS NOT NULL`,args);
  const byTable:Record<string,Column[]>={};
  for(const row of columns)(byTable[row.tableName]??=[]).push({name:row.name,type:row.type,nullable:row.nullable,extra:row.extra});
  return assessExamSchema({tables:tables as unknown as Table[],columns:byTable,indexes:indexes as unknown as Index[],foreign:foreign as unknown as Foreign[]},requireItinerary);
 }finally{conn.release();}
}
