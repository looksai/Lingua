-- DRAFT 0010. Do not apply until PRs 75-79 and draft 0009 reviewed and staged.
-- Context-only native placements; no profiling or behavioral ad tracking.
CREATE TABLE `portalPartnerAds` (
 `id` int NOT NULL AUTO_INCREMENT,
 `partnerId` int NOT NULL,
 `createdByUserId` int NOT NULL,
 `placement` enum('portal-home','portal-partners') NOT NULL,
 `title` varchar(120) NOT NULL,
 `body` varchar(600) NOT NULL,
 `destinationUrl` varchar(1000) NOT NULL,
 `state` enum('pending','approved','rejected','paused') NOT NULL DEFAULT 'pending',
 `startsAt` timestamp NULL DEFAULT NULL,
 `endsAt` timestamp NULL DEFAULT NULL,
 `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
 `reviewedByUserId` int NULL DEFAULT NULL,
 PRIMARY KEY(`id`),
 KEY `portalPartnerAds_placement_state_window`(`placement`,`state`,`startsAt`,`endsAt`),
 KEY `portalPartnerAds_partner_created`(`partnerId`,`createdAt`),
 CONSTRAINT `portalPartnerAds_partner_fk` FOREIGN KEY(`partnerId`) REFERENCES `portalPartners`(`id`) ON DELETE CASCADE,
 CONSTRAINT `portalPartnerAds_author_fk` FOREIGN KEY(`createdByUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
 CONSTRAINT `portalPartnerAds_reviewer_fk` FOREIGN KEY(`reviewedByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
-- Approval state is administrative publication permission, not billing entitlement.
-- Real advertiser subscription/invoice enforcement must be added before public launch.
