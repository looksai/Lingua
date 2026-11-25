-- DRAFT 0009 — Lingua community foundation, manual staging review only.
-- NO automatic rollout; do not apply before privacy migration 0008 and backup verification.
-- No inferred entitlements and no grant backfill for existing accounts.
CREATE TABLE `portalMembershipGrants` (
 `id` int NOT NULL AUTO_INCREMENT,
 `userId` int NOT NULL,
 `kind` enum('academy','club') NOT NULL,
 `source` enum('subscription','purchase','loyalty','staff') NOT NULL,
 `state` enum('active','revoked','expired') NOT NULL DEFAULT 'active',
 `expiresAt` timestamp NULL DEFAULT NULL,
 `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(`id`),
 KEY `portalMembershipGrants_user_state`(`userId`,`state`),
 CONSTRAINT `portalMembershipGrants_user_fk` FOREIGN KEY(`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
CREATE TABLE `portalGroups` (
 `id` int NOT NULL AUTO_INCREMENT,
 `slug` varchar(80) NOT NULL,
 `title` varchar(140) NOT NULL,
 `description` varchar(500) NOT NULL,
 `visibility` enum('public','private') NOT NULL DEFAULT 'private',
 `academyAllowed` int NOT NULL DEFAULT 0,
 `state` enum('draft','active','hidden') NOT NULL DEFAULT 'draft',
 `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(`id`),
 UNIQUE KEY `portalGroups_slug_unique`(`slug`)
);
CREATE TABLE `portalGroupModerators` (
 `groupId` int NOT NULL,
 `userId` int NOT NULL,
 PRIMARY KEY(`groupId`,`userId`),
 CONSTRAINT `portalGroupModerators_group_fk` FOREIGN KEY(`groupId`) REFERENCES `portalGroups`(`id`) ON DELETE CASCADE,
 CONSTRAINT `portalGroupModerators_user_fk` FOREIGN KEY(`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
CREATE TABLE `portalTopics` (
 `id` int NOT NULL AUTO_INCREMENT,
 `groupId` int NOT NULL,
 `authorUserId` int NOT NULL,
 `title` varchar(160) NOT NULL,
 `body` text NOT NULL,
 `state` enum('pending','published','hidden') NOT NULL DEFAULT 'pending',
 `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(`id`),
 KEY `portalTopics_group_state_created`(`groupId`,`state`,`createdAt`),
 CONSTRAINT `portalTopics_group_fk` FOREIGN KEY(`groupId`) REFERENCES `portalGroups`(`id`) ON DELETE CASCADE,
 CONSTRAINT `portalTopics_author_fk` FOREIGN KEY(`authorUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
CREATE TABLE `portalReplies` (
 `id` int NOT NULL AUTO_INCREMENT,
 `topicId` int NOT NULL,
 `authorUserId` int NOT NULL,
 `body` text NOT NULL,
 `state` enum('pending','published','hidden') NOT NULL DEFAULT 'pending',
 `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(`id`),
 KEY `portalReplies_topic_state_created`(`topicId`,`state`,`createdAt`),
 CONSTRAINT `portalReplies_topic_fk` FOREIGN KEY(`topicId`) REFERENCES `portalTopics`(`id`) ON DELETE CASCADE,
 CONSTRAINT `portalReplies_author_fk` FOREIGN KEY(`authorUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
CREATE TABLE `portalPartners` (
 `id` int NOT NULL AUTO_INCREMENT,
 `slug` varchar(80) NOT NULL,
 `displayName` varchar(160) NOT NULL,
 `description` text NOT NULL,
 `draftDescription` text NULL,
 `verificationState` enum('pending','verified','suspended') NOT NULL DEFAULT 'pending',
 `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(`id`),
 UNIQUE KEY `portalPartners_slug_unique`(`slug`)
);
CREATE TABLE `portalPartnerInquiries` (
 `id` int NOT NULL AUTO_INCREMENT,
 `partnerId` int NOT NULL,
 `userId` int NOT NULL,
 `message` varchar(1500) NOT NULL,
 `consentAt` timestamp NOT NULL,
 `state` enum('new','closed','withdrawn') NOT NULL DEFAULT 'new',
 `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(`id`),
 KEY `portalPartnerInquiries_partner_state`(`partnerId`,`state`),
 CONSTRAINT `portalPartnerInquiries_partner_fk` FOREIGN KEY(`partnerId`) REFERENCES `portalPartners`(`id`) ON DELETE CASCADE,
 CONSTRAINT `portalPartnerInquiries_user_fk` FOREIGN KEY(`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
-- Establish ownership without assuming every public group belongs to a business.
ALTER TABLE `portalGroups`
 ADD COLUMN `partnerId` int NULL DEFAULT NULL,
 ADD KEY `portalGroups_partner_idx`(`partnerId`),
 ADD CONSTRAINT `portalGroups_partner_fk` FOREIGN KEY (`partnerId`) REFERENCES `portalPartners`(`id`) ON DELETE SET NULL;
CREATE TABLE `portalPartnerStaff` (
 `partnerId` int NOT NULL,
 `userId` int NOT NULL,
 `role` enum('owner','editor') NOT NULL,
 `state` enum('active','revoked') NOT NULL DEFAULT 'active',
 PRIMARY KEY(`partnerId`,`userId`),
 CONSTRAINT `portalPartnerStaff_partner_fk` FOREIGN KEY (`partnerId`) REFERENCES `portalPartners`(`id`) ON DELETE CASCADE,
 CONSTRAINT `portalPartnerStaff_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
-- No emails or private learner memories copied into partner accounts.
-- Rollback must be migration-specific, with explicit preservation of paid grants.
