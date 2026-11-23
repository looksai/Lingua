-- P0 learner memory: MySQL/Aiven (NOT PostgreSQL). MANUAL STAGING ONLY.
-- Prerequisites: approved 0005/0006 on TLS-verified target, table drift checked.
-- DO NOT use db:push or auto-run on production. Never run without founder/Deep review.
CREATE TABLE `learnerMemories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `fato` varchar(240) NOT NULL,
  `categoria` enum('profissao','objetivo','interesse','preferencia_estudo') NOT NULL,
  `origem` varchar(64) NOT NULL DEFAULT 'aluno_confirmou_no_chat',
  `factKey` varchar(64) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `learnerMemories_user_fact_unique` (`userId`,`factKey`),
  KEY `learnerMemories_user_recent_idx` (`userId`,`createdAt`,`id`),
  CONSTRAINT `learnerMemories_user_fk` FOREIGN KEY (`userId`)
    REFERENCES `users`(`id`) ON DELETE CASCADE
);
-- Check: SHOW CREATE TABLE learnerMemories; SHOW INDEX FROM learnerMemories;
-- Confirm per-account ownership, cascade delete, opt-in flow and rollback plan.
