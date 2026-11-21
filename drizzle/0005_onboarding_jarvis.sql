-- MANUAL / REVIEWED ONLY. Do not deploy automatically or run db:push on staging.
-- Apply after 0003_local_credentials.sql; verify backup, schema drift and ROLLBACK plan.
-- Old experimental PR #14's migration 0004 was NOT merged and MUST NOT be used.
CREATE TABLE `learnerProfiles` (
  `userId` int NOT NULL,
  `interfaceLocale` varchar(16) NOT NULL DEFAULT 'pt-BR',
  `nativeLanguage` varchar(16) NOT NULL DEFAULT 'pt',
  `targetLanguage` varchar(16) NOT NULL DEFAULT 'en',
  `tutorName` varchar(40) NOT NULL DEFAULT 'Seu tutor',
  `tutorPersona` enum('welcoming','direct','curious','neutral') NOT NULL DEFAULT 'welcoming',
  `interest` enum('curiosity','travel','work','technology','everyday') NOT NULL DEFAULT 'curiosity',
  `allowAIFeedback` int NOT NULL DEFAULT 0,
  `onboardingStatus` enum('started','deferred','complete') NOT NULL DEFAULT 'started',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`),
  CONSTRAINT `learnerProfiles_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE TABLE `introductoryResponses` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `taskId` varchar(64) NOT NULL,
  `answer` text NOT NULL,
  `tutorReply` varchar(400) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `introductoryResponses_user_task_unique` (`userId`, `taskId`),
  CONSTRAINT `introductoryResponses_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
