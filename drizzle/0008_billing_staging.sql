-- DRAFT: 0008 billing schema for future staging review. DO NOT APPLY.
-- Never use db:push; must verify 0007, target identity, CA, backup and payment privacy.
-- Billing data and trial quota are separate from tutor memory, SRS and CSLE.
CREATE TABLE `billingCustomers` (
  `userId` int NOT NULL,
  `stripeCustomerId` varchar(80) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`),
  UNIQUE KEY `billingCustomers_stripeCustomerId_unique` (`stripeCustomerId`),
  CONSTRAINT `billingCustomers_user_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
CREATE TABLE `billingSubscriptions` (
  `stripeSubscriptionId` varchar(100) NOT NULL,
  `userId` int NOT NULL,
  `stripePriceId` varchar(100) NOT NULL,
  `currency` varchar(3) NOT NULL,
  `status` varchar(32) NOT NULL,
  `currentPeriodEnd` timestamp NULL DEFAULT NULL,
  `paidThroughAt` timestamp NULL DEFAULT NULL,
  `cancelAtPeriodEnd` int NOT NULL DEFAULT 0,
  `lastSyncedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`stripeSubscriptionId`),
  KEY `billingSubscriptions_user_status_idx` (`userId`,`status`),
  CONSTRAINT `billingSubscriptions_user_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
CREATE TABLE `stripeWebhookEvents` (
  `stripeEventId` varchar(100) NOT NULL,
  `eventType` varchar(100) NOT NULL,
  `eventCreatedAt` timestamp NOT NULL,
  `status` enum('processing','done','failed') NOT NULL,
  `receivedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`stripeEventId`)
);
CREATE TABLE `tutorTrialState` (
  `userId` int NOT NULL,
  `trialStartedAt` timestamp NULL DEFAULT NULL,
  `trialEndsAt` timestamp NULL DEFAULT NULL,
  `successfulReplies` int NOT NULL DEFAULT 0,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`),
  CONSTRAINT `tutorTrialState_user_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
CREATE TABLE `tutorUsage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `interactionId` varchar(120) NOT NULL,
  `kind` enum('chat','asr','tts') NOT NULL,
  `state` enum('reserved','succeeded','failed') NOT NULL DEFAULT 'reserved',
  `countable` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `completedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tutorUsage_user_interaction_unique` (`userId`,`interactionId`),
  KEY `tutorUsage_user_created_idx` (`userId`,`createdAt`),
  CONSTRAINT `tutorUsage_user_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
-- Current schema is a review candidate. No runtime route writes to these tables.
