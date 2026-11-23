-- MIGRATION 0007: ADDITIVE AIVEN STAGING ONLY. DO NOT AUTO-APPLY.
-- Apply only after Deep/founder audit, Aiven target verification, TLS and backup.
-- Never call pnpm db:push. Learner memory ≠ SRS, official competence or CSLE.
CREATE TABLE `learnerMemories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `fato` varchar(220) NOT NULL,
  `categoria` enum('profession','goal','interest','preference') NOT NULL,
  `origem` enum('student_confirmed_chat') NOT NULL,
  `factHash` varchar(64) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `learnerMemories_owner_hash_unique` (`userId`,`factHash`),
  KEY `learnerMemories_owner_created_idx` (`userId`,`createdAt`),
  CONSTRAINT `learnerMemories_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
-- Verify SHOW CREATE TABLE learnerMemories, fresh empty row count, FK,
-- owner-scoped indexes, unchanged 0005/0006 tables; do not claim executed.
