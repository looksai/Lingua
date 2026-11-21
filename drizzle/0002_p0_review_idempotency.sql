-- Lingua P0 additive migration. Apply ONLY after DB backup + staging validation.
-- No CREATE/ALTER automatically run by this patch.
ALTER TABLE `reviewLogs` ADD COLUMN `operationId` varchar(180) NULL;
--> statement-breakpoint
-- Legacy operations were not assigned IDs by the client. Preserve history,
-- but NEVER claim these synthetic IDs make historical requests idempotent.
UPDATE `reviewLogs` SET `operationId` = CONCAT('legacy-', `id`) WHERE `operationId` IS NULL;
--> statement-breakpoint
ALTER TABLE `reviewLogs` MODIFY COLUMN `operationId` varchar(180) NOT NULL;
--> statement-breakpoint
ALTER TABLE `reviewLogs` ADD COLUMN `stateId` int NULL;
--> statement-breakpoint
ALTER TABLE `reviewLogs` ADD COLUMN `appliedAtMs` bigint NULL;
--> statement-breakpoint
ALTER TABLE `reviewLogs` ADD COLUMN `resultJson` text NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `reviewLogs_user_operation_unique` ON `reviewLogs` (`userId`,`operationId`);
