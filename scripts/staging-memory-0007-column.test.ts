import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { signedIntUserIdColumn, describeUserIdColumn, memory0007CreateStatement } from "./staging-memory-0007-column";

const correct={columnName:"id",dataType:"int",columnType:"int",nullable:"NO"};
describe("Aiven 0007 users.id FK preflight",()=>{
  it("accepts signed INT schema with deterministic aliases",()=>{
    expect(signedIntUserIdColumn(correct)).toBe(true);
    expect(signedIntUserIdColumn({...correct,columnType:"int(11)"})).toBe(true);
    expect(signedIntUserIdColumn({...correct,dataType:"INT",columnType:"INT"})).toBe(true);
  });
  it("rejects unsigned, bigint, nullability, and missing aliases",()=>{
    expect(signedIntUserIdColumn({...correct,columnType:"int unsigned"})).toBe(false);
    expect(signedIntUserIdColumn({...correct,dataType:"bigint",columnType:"bigint"})).toBe(false);
    expect(signedIntUserIdColumn({...correct,nullable:"YES"})).toBe(false);
    expect(signedIntUserIdColumn({COLUMN_NAME:"id",DATA_TYPE:"int",COLUMN_TYPE:"int"} as never)).toBe(false);
    expect(signedIntUserIdColumn(undefined)).toBe(false);
  });
  it("reports only bounded schema type metadata for inspection",()=>{
    expect(describeUserIdColumn(correct)).toContain("dataType=int");
    expect(describeUserIdColumn({...correct,columnType:"secret://bad"})).not.toContain("secret://bad");
  });
});

describe("Aiven 0007 single approved DDL",()=>{
  it("accepts the checked-in migration and ignores SHOW CREATE TABLE review comments",()=>{
    const sql=readFileSync(new URL("../drizzle/0007_learner_memories.sql", import.meta.url),"utf8");
    const stmt=memory0007CreateStatement(sql);
    expect(stmt.startsWith("CREATE TABLE ")).toBe(true);
    expect((stmt.match(/\bCREATE\s+TABLE\b/gi)??[]).length).toBe(1);
    expect(stmt.includes("SHOW CREATE TABLE")).toBe(false);
  });
  it("blocks additional statements and unrelated migrations",()=>{
    const valid="CREATE TABLE \x60learnerMemories\x60 (\x60id\x60 int NOT NULL);";
    expect(memory0007CreateStatement("-- SHOW CREATE TABLE\n"+valid)).toBe(valid);
    expect(()=>memory0007CreateStatement(valid+" DROP TABLE \x60users\x60;")).toThrow();
    expect(()=>memory0007CreateStatement("DROP TABLE users;")).toThrow();
    expect(()=>memory0007CreateStatement("CREATE TABLE \x60elsewhere\x60 (\x60id\x60 int);")).toThrow();
  });
});
