-- Lingua staging read-only migration inventory.
-- DO NOT modify this script to apply DDL; run only on the specifically
-- identified staging database, with a read-only database user.
SELECT DATABASE() AS current_database, CURRENT_USER() AS current_user;
SELECT table_name, engine, table_rows
FROM information_schema.tables
WHERE table_schema=DATABASE()
  AND table_name IN (
    'users','localCredentials','learnerMemories','learnerPrivacyPreferences',
    'portalMembershipGrants','portalGroups','portalGroupModerators',
    'portalTopics','portalReplies','portalPartners','portalPartnerStaff',
    'portalPartnerInquiries','portalInquiryMessages','portalPartnerAds',
    '__drizzle_migrations'
  )
ORDER BY table_name;
SELECT table_name,column_name,column_type,is_nullable,column_default
FROM information_schema.columns
WHERE table_schema=DATABASE()
  AND table_name IN (
    'learnerPrivacyPreferences','portalMembershipGrants','portalGroups',
    'portalPartners','portalPartnerInquiries','portalInquiryMessages','portalPartnerAds'
  )
ORDER BY table_name,ordinal_position;
SELECT table_name,constraint_name,constraint_type
FROM information_schema.table_constraints
WHERE table_schema=DATABASE()
  AND table_name IN (
    'learnerPrivacyPreferences','portalMembershipGrants','portalGroups',
    'portalPartners','portalPartnerInquiries','portalInquiryMessages','portalPartnerAds'
  )
ORDER BY table_name,constraint_name;
-- Intentionally does not SELECT customer rows, credentials, personal messages,
-- consent records, commercial requests, or internal memory data.
