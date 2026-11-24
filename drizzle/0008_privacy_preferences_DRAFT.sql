-- Draft only: manually reviewed MySQL/Aiven migration, never auto-run.
-- Check table absence and real environment before applying to staging.
-- Existing users intentionally have no preference row and require a transition decision.
CREATE TABLE `learnerPrivacyPreferences` (
  `userId` int NOT NULL,
  `policyVersion` int NOT NULL,
  `serviceAcceptedAt` timestamp NOT NULL,
  `personalMemoryEnabled` int NOT NULL DEFAULT 0,
  `memoryUpdatedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`userId`),
  CONSTRAINT `learnerPrivacyPreferences_user_fk`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
-- Rollback requires careful preservation of lawful records of choices;
-- do not drop blindly. No permission for data reuse/model training.
