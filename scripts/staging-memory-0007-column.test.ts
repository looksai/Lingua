import { describe, expect, it } from "vitest";
import { signedIntUserIdColumn, describeUserIdColumn } from "./staging-memory-0007-column";

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
