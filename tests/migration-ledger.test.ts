import {describe,it,expect} from "vitest";
import {inspectMigrationInventory, migrationInventoryFromRepo} from "../scripts/qa-migration-ledger";
import {join} from "node:path";

const journal={entries:[{idx:0,tag:"0000_initial_users"},{idx:1,tag:"0001_great_maggott"},{idx:2,tag:"0002_p0_review_idempotency"}]};
const files=[
  "0000_initial_users.sql","0001_great_maggott.sql","0002_p0_review_idempotency.sql",
  "0003_local_credentials.sql","0005_onboarding_jarvis.sql","0006_placement_staging.sql",
  "0007_learner_memories.sql","0008_privacy_preferences_DRAFT.sql",
  "0009_portal_community_DRAFT.sql","0010_partner_ads_DRAFT.sql",
];
describe("migration journal preflight is conservative",()=>{
  it("records the known ledger mismatch and refuses deployment authorization",()=>{
    const report=inspectMigrationInventory(files,journal);
    expect(report.remoteMigrationApproved).toBe(false);
    expect(report.manual).toEqual(["0003_local_credentials","0005_onboarding_jarvis",
      "0006_placement_staging","0007_learner_memories"]);
    expect(report.drafts).toHaveLength(3);
    expect(report.orphanJournalEntries).toEqual([]);
    expect(report.unclassified).toEqual([]);
    expect(report.blockers.length).toBeGreaterThan(0);
  });
  it("flags a newly added unreviewed migration",()=>{
    const result=inspectMigrationInventory([...files,"0011_unreviewed.sql"],journal);
    expect(result.unclassified).toEqual(["0011_unreviewed"]);
    expect(result.remoteMigrationApproved).toBe(false);
  });
  it("flags journal entries whose SQL is missing",()=>{
    const result=inspectMigrationInventory(files,{entries:[
      ...journal.entries,{idx:3,tag:"0012_missing_sql"},
    ]});
    expect(result.orphanJournalEntries).toEqual(["0012_missing_sql"]);
    expect(result.remoteMigrationApproved).toBe(false);
  });
  it("reads actual repo history without using database credentials",async()=>{
    const report=await migrationInventoryFromRepo(join(process.cwd()));
    expect(report.tracked).toContain("0000_initial_users");
    expect(report.manual).toContain("0007_learner_memories");
    expect(report.drafts).toContain("0010_partner_ads_DRAFT");
    expect(report.remoteMigrationApproved).toBe(false);
  });
});
