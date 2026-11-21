CREATE TABLE `knowledgeItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`itemKey` varchar(180) NOT NULL,
	`kind` enum('word','phrase') NOT NULL,
	`text` text NOT NULL,
	`normalizedText` varchar(255) NOT NULL,
	`language` varchar(16) NOT NULL,
	`translation` text,
	`example` text,
	`pronunciation` text,
	`audioUrl` text,
	`sourceId` varchar(120),
	`sourceRecordId` varchar(180),
	`license` varchar(255),
	`curriculumAnchors` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledgeItems_id` PRIMARY KEY(`id`),
	CONSTRAINT `knowledgeItems_itemKey_unique` UNIQUE(`itemKey`)
);
--> statement-breakpoint
CREATE TABLE `reviewLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`knowledgeItemId` int NOT NULL,
	`rating` enum('again','hard','good','easy') NOT NULL,
	`quality` int NOT NULL,
	`previousState` enum('new','learning','review','relearning') NOT NULL,
	`nextState` enum('new','learning','review','relearning') NOT NULL,
	`previousDueAt` timestamp NOT NULL,
	`nextDueAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviewLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userKnowledgeStates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`knowledgeItemId` int NOT NULL,
	`state` enum('new','learning','review','relearning') NOT NULL DEFAULT 'new',
	`easeFactor` float NOT NULL DEFAULT 2.5,
	`intervalDays` int NOT NULL DEFAULT 0,
	`repetitions` int NOT NULL DEFAULT 0,
	`lapses` int NOT NULL DEFAULT 0,
	`dueAt` timestamp NOT NULL DEFAULT (now()),
	`lastReviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userKnowledgeStates_id` PRIMARY KEY(`id`),
	CONSTRAINT `userKnowledgeStates_user_item_unique` UNIQUE(`userId`,`knowledgeItemId`)
);
--> statement-breakpoint
CREATE INDEX `knowledgeItems_normalizedText_idx` ON `knowledgeItems` (`normalizedText`);--> statement-breakpoint
CREATE INDEX `reviewLogs_user_created_idx` ON `reviewLogs` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `userKnowledgeStates_dueAt_idx` ON `userKnowledgeStates` (`userId`,`dueAt`);