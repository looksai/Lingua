import {describe,it,expect} from "vitest";
import {makeSafeMetadataReport} from "../scripts/staging-aiven-readonly-portal-inventory";
const input={
  version:"8.4.6",sslCipher:"TLS_AES_256_GCM_SHA384",
  tables:[{tableName:"users"},{tableName:"learnerMemories"},
    {tableName:"portalGroups"},{tableName:"__drizzle_migrations"}],
  columns:[{tableName:"portalGroups",columnName:"slug",columnType:"varchar(80)",isNullable:"NO"},
    {tableName:"users",columnName:"email",columnType:"varchar(320)",isNullable:"YES"}],
  constraints:[{tableName:"portalGroups",constraintName:"portalGroups_partner_fk",targetTable:"portalPartners"},
    {tableName:"users",constraintName:"private_email_constraint",targetTable:"other"}],
  journalColumns:["id","hash","created_at"],journal:[{id:1,createdAt:1788785580464}],
};
describe("staging metadata report is safe by construction",()=>{
  it("only exposes allowlisted portal schema metadata and never student fields",()=>{
    const result=makeSafeMetadataReport(input);
    expect(result.schema).toBe("defaultdb");
    expect(result.remoteMigrationApproved).toBe(false);
    expect(result.absent).toContain("portalPartnerAds");
    expect(result.columnMetadata).toEqual([{table:"portalGroups",column:"slug",type:"varchar(80)",nullable:false}]);
    expect(result.foreignKeys).toEqual([{table:"portalGroups",name:"portalGroups_partner_fk",target:"portalPartners"}]);
    expect(JSON.stringify(result)).not.toContain("email");
    expect(result.journal.entries).toEqual([{id:1,createdAt:1788785580464}]);
  });
  it("refuses missing TLS or different server major/minor",()=>{
    expect(()=>makeSafeMetadataReport({...input,sslCipher:""})).toThrow();
    expect(()=>makeSafeMetadataReport({...input,version:"8.0.37"})).toThrow();
  });
  it("refuses missing account table even when portal tables exist",()=>{
    expect(()=>makeSafeMetadataReport({...input,tables:[{tableName:"portalGroups"}]})).toThrow();
  });
  it("handles absent ledger without inferring migration completion",()=>{
    const result=makeSafeMetadataReport({...input,tables:[{tableName:"users"}],journal:null,journalColumns:[]});
    expect(result.journal.present).toBe(false);
    expect(result.journal.migrationCount).toBeNull();
    expect(result.remoteMigrationApproved).toBe(false);
  });
});
