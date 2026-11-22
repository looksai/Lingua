-- MANUAL STAGING-ONLY migration. NEVER apply automatically or use db:push.
-- Prerequisite: verified 0005 onboarding schema on the intended TLS-verified Aiven staging DB.
-- Inspect target identity and existing objects first; explicit founder/Deep authorization required.
-- Running again without reviewing existing schema drift is NOT authorized.
CREATE TABLE `learnerPlacementAnswers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `taskId` varchar(40) NOT NULL,
  `answer` text NOT NULL,
  `modality` enum('text','asr_text') NOT NULL DEFAULT 'text',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `learnerPlacementAnswers_user_task_unique` (`userId`,`taskId`),
  CONSTRAINT `learnerPlacementAnswers_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
CREATE TABLE `learnerPlacementPlans` (
  `userId` int NOT NULL,
  `planJson` text NOT NULL,
  `source` enum('groq_suggestion','rule_based') NOT NULL,
  `version` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`),
  CONSTRAINT `learnerPlacementPlans_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
-- Verification after approval: SHOW CREATE TABLE for both; unique per user/task,
-- cascade user deletion, no foreign keys into SRS or official evidence tables.
-- Before public use: account verification, privacy/export/deletion QA and versioned rubric audit.
