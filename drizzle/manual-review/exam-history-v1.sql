-- REVIEW CANDIDATE ONLY. Apply in the disposable lab first.
-- No destructive operations. Production application requires schema/backup review.
CREATE TABLE `examGoals` (
 `userId` int NOT NULL PRIMARY KEY,
 `variant` enum('ielts-academic','ielts-general') NOT NULL,
 `targetBandHalfSteps` int NULL,
 `targetDate` varchar(10) NULL,
 `updatedAtMs` bigint NOT NULL,
 CONSTRAINT `examGoals_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
CREATE TABLE `examCompletedActivities` (
 `id` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
 `userId` int NOT NULL,
 `attemptId` varchar(36) NOT NULL,
 `variant` enum('ielts-academic','ielts-general') NOT NULL,
 `skill` enum('reading','listening') NOT NULL,
 `exerciseId` varchar(80) NOT NULL,
 `contentVersion` varchar(80) NOT NULL,
 `mode` enum('practice','timed') NOT NULL,
 `correct` int NOT NULL,
 `total` int NOT NULL,
 `receiptJson` text NULL,
 `completedAtMs` bigint NOT NULL,
 CONSTRAINT `examCompletedActivities_owner_attempt` UNIQUE (`userId`,`attemptId`),
 INDEX `examCompletedActivities_owner_recent` (`userId`,`completedAtMs`,`id`),
 CONSTRAINT `examCompletedActivities_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
CREATE TABLE `examActiveAttempts` (
 `userId` int NOT NULL PRIMARY KEY,
 `attemptId` varchar(36) NOT NULL,
 `variant` enum('ielts-academic','ielts-general') NOT NULL,
 `skill` enum('reading','listening') NOT NULL,
 `mode` enum('practice','timed') NOT NULL,
 `exerciseId` varchar(80) NOT NULL,
 `contentVersion` varchar(80) NOT NULL,
 `deadlineMs` bigint NOT NULL,
 CONSTRAINT `examActiveAttempts_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
