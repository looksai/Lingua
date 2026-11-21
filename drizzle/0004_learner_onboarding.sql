-- First-contact learner state. Additive; never backfills or copies demonstration progress.
-- Apply only through the guarded Aiven 0004 workflow after manual inspection.
CREATE TABLE `learnerProfiles` (
  `userId` int NOT NULL,
  `displayName` varchar(80) NOT NULL,
  `studyGoal` varchar(24) NOT NULL,
  `priorExposure` varchar(24) NOT NULL,
  `baselineScore` int NULL,
  `baselineTotal` int NULL,
  `baselineCompletedAt` timestamp NULL DEFAULT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`),
  CONSTRAINT `learnerProfiles_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `learnerLessonResults` (
  `userId` int NOT NULL,
  `lessonKey` varchar(64) NOT NULL,
  `bestScore` int NOT NULL DEFAULT 0,
  `total` int NOT NULL,
  `completedAt` timestamp NULL DEFAULT NULL,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`, `lessonKey`),
  CONSTRAINT `learnerLessonResults_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
