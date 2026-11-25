/**
 * Disposable MySQL-only schema integrity checks for Lingua portal migrations.
 *
 * This utility does not create, alter or delete objects and refuses any
 * database other than the synthetic, loopback-only CI fixture.
 * It is intentionally NOT an Aiven/staging migrator.
 */
import assert from "node:assert/strict";
import mysql from "mysql2/promise";
export async function verifyPortalSchema(connection:mysql.Connection){
  const [[db]] = await connection.query<mysql.RowDataPacket[]>("SELECT DATABASE() AS db");
  assert.equal(db.db,"lingua_portal_qa","Refusing to validate an unrelated database");
  const [tables] = await connection.query<mysql.RowDataPacket[]>(`SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE()`);
  const names=new Set(tables.map(t=>t.TABLE_NAME??t.table_name));
  const required=[
    "users","localCredentials","learnerMemories","learnerPrivacyPreferences",
    "portalMembershipGrants","portalGroups","portalGroupModerators",
    "portalTopics","portalReplies","portalPartners","portalPartnerStaff",
    "portalPartnerInquiries","portalInquiryMessages","portalPartnerAds",
  ];
  for(const name of required)assert.ok(names.has(name),"Missing required table: "+name);
  const [constraints] = await connection.query<mysql.RowDataPacket[]>(`
    SELECT table_name,constraint_name FROM information_schema.table_constraints
    WHERE table_schema=DATABASE() AND constraint_type='FOREIGN KEY'`);
  const constraintsByTable=new Map<string,Set<string>>();
  for(const c of constraints){
    const table=String(c.TABLE_NAME??c.table_name),name=String(c.CONSTRAINT_NAME??c.constraint_name);
    if(!constraintsByTable.has(table))constraintsByTable.set(table,new Set());
    constraintsByTable.get(table)!.add(name);
  }
  for(const [table,cons] of Object.entries({
    learnerPrivacyPreferences:["learnerPrivacyPreferences_user_fk"],
    portalMembershipGrants:["portalMembershipGrants_user_fk"],
    portalTopics:["portalTopics_group_fk","portalTopics_author_fk"],
    portalReplies:["portalReplies_topic_fk","portalReplies_author_fk"],
    portalPartnerInquiries:["portalPartnerInquiries_partner_fk","portalPartnerInquiries_user_fk"],
    portalInquiryMessages:["portalInquiryMessages_room_fk","portalInquiryMessages_author_fk"],
    portalPartnerAds:["portalPartnerAds_partner_fk","portalPartnerAds_author_fk"],
  })){
    for(const constraint of cons)assert.ok(constraintsByTable.get(table)?.has(constraint),
      "Missing FK: "+table+"."+constraint);
  }
  const [columns]=await connection.query<mysql.RowDataPacket[]>(`
    SELECT table_name,column_name,column_default,is_nullable FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name IN
    ('portalTopics','portalReplies','portalPartners','portalPartnerAds','portalMembershipGrants')`);
  const byColumn=new Map(columns.map(c=>[
    String(c.TABLE_NAME??c.table_name)+"."+String(c.COLUMN_NAME??c.column_name),c
  ]));
  for(const key of ["portalTopics.state","portalReplies.state","portalPartners.verificationState",
      "portalPartnerAds.state","portalMembershipGrants.state"]){
    assert.ok(byColumn.has(key),"Missing moderation/status default column: "+key);
  }
  // Verify unique group/partner routes and review-by-default semantics.
  const [indexes]=await connection.query<mysql.RowDataPacket[]>(`
    SELECT table_name,index_name,non_unique
    FROM information_schema.statistics
    WHERE table_schema=DATABASE() AND table_name IN ('portalGroups','portalPartners')`);
  for(const [table,index] of [
    ["portalGroups","portalGroups_slug_unique"],
    ["portalPartners","portalPartners_slug_unique"],
  ]){
    assert.ok(indexes.some(row=>
      String(row.TABLE_NAME??row.table_name)===table &&
      String(row.INDEX_NAME??row.index_name)===index &&
      Number(row.NON_UNIQUE??row.non_unique)===0
    ),"Missing unique public route index: "+table+"."+index);
  }
  const expectedDefaults:Record<string,string>={
    "portalTopics.state":"pending",
    "portalReplies.state":"pending",
    "portalPartners.verificationState":"pending",
    "portalPartnerAds.state":"pending",
    "portalMembershipGrants.state":"active",
  };
  for(const [key,expected] of Object.entries(expectedDefaults)){
    const record=byColumn.get(key);
    assert.equal(String(record?.COLUMN_DEFAULT??record?.column_default),expected,
      "Unsafe default state on "+key);
  }
  // Fresh migration MUST NOT silently seed memberships, advertisements or organizations.
  for(const table of ["portalMembershipGrants","portalPartners","portalPartnerAds"]){
    const [rows]=await connection.query<mysql.RowDataPacket[]>(`SELECT COUNT(*) AS total FROM \`${table}\``);
    assert.equal(Number(rows[0].total),0,"Fresh migration must not seed "+table);
  }
}
