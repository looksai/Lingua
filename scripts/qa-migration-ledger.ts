/**
 * Repo-only migration ledger preflight. Never connects to MySQL, Render or Aiven.
 * This script intentionally FAILS CLOSED for any attempt to declare the current
 * journal safe for remote migration. It does not apply or modify migrations.
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export type MigrationInventory = {
  tracked: string[];
  manual: string[];
  drafts: string[];
  orphanJournalEntries: string[];
  unclassified: string[];
  remoteMigrationApproved: false;
  blockers: string[];
};
type Journal = {entries:Array<{tag:string,idx:number}>};

export function inspectMigrationInventory(filenames:readonly string[], journal:Journal):MigrationInventory{
  const entries=journal.entries.map(x=>x.tag);
  const tracked=new Set(entries);
  const sql=filenames.filter(x=>/^\d{4}_.+\.sql$/.test(x));
  const stems=sql.map(x=>x.replace(/\.sql$/,""));
  const expectedManual=new Set([
    "0003_local_credentials",
    "0005_onboarding_jarvis",
    "0006_placement_staging",
    "0007_learner_memories",
  ]);
  const expectedDraft=new Set([
    "0008_privacy_preferences_DRAFT",
    "0009_portal_community_DRAFT",
    "0010_partner_ads_DRAFT",
  ]);
  const orphanJournalEntries=entries.filter(tag=>!stems.includes(tag));
  const manual=stems.filter(x=>expectedManual.has(x) && !tracked.has(x));
  const drafts=stems.filter(x=>expectedDraft.has(x) && !tracked.has(x));
  const unclassified=stems.filter(x=>!tracked.has(x)&&!expectedManual.has(x)&&!expectedDraft.has(x));
  const blockers=[
    "Histórico versionado não comprova o estado do ledger no Aiven de staging.",
    ...(orphanJournalEntries.length?["Journal contém entradas sem SQL correspondente."]:[]),
    ...(unclassified.length?["Migrações SQL não classificadas exigem revisão."]:[]),
    ...(manual.length?["Há scripts manuais fora do journal Drizzle."]:[]),
    ...(drafts.length?["Migrações DRAFT fora do journal não podem ser aplicadas automaticamente."]:[]),
    "Backup restaurável e inventário remoto read-only ainda não foram verificados.",
  ];
  return {tracked:entries,manual,drafts,orphanJournalEntries,unclassified,
    remoteMigrationApproved:false,blockers};
}

export async function migrationInventoryFromRepo(root:string):Promise<MigrationInventory>{
  const dir=join(root,"drizzle");
  const files=await readdir(dir);
  const journal=JSON.parse(await readFile(join(dir,"meta","_journal.json"),"utf8")) as Journal;
  return inspectMigrationInventory(files,journal);
}

async function main(){
  const root=join(dirname(fileURLToPath(import.meta.url)),"..");
  const report=await migrationInventoryFromRepo(root);
  // Expected baseline is deliberate: edits to the tracked journal or migration
  // set must get an explicit migration governance review and test update.
  const expectedTracked=["0000_initial_users","0001_great_maggott","0002_p0_review_idempotency"];
  const expectedManual=["0003_local_credentials","0005_onboarding_jarvis",
    "0006_placement_staging","0007_learner_memories"];
  const expectedDraft=["0008_privacy_preferences_DRAFT","0009_portal_community_DRAFT",
    "0010_partner_ads_DRAFT"];
  const same=(a:readonly string[],b:readonly string[])=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
  if(!same(report.tracked,expectedTracked)||!same(report.manual,expectedManual)||
      !same(report.drafts,expectedDraft)||report.orphanJournalEntries.length||
      report.unclassified.length){
    process.stderr.write("MIGRATION BASELINE DRIFT: manual review required; never auto-apply to Aiven.\n"+
      JSON.stringify(report,null,2)+"\n");
    process.exitCode=1;
    return;
  }
  process.stdout.write("Migration repo baseline checked; remote migration remains BLOCKED.\n"+
    JSON.stringify(report,null,2)+"\n");
}
if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])){
  await main();
}
