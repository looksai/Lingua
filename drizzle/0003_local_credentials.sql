-- Independent authentication: existing users.id remains the learning owner.
-- Manual guarded migration ONLY after 0000, 0001 and 0002.
CREATE TABLE `localCredentials` (
  `userId` int NOT NULL,
  `email` varchar(320) NOT NULL,
  `passwordHash` varchar(255) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`userId`),
  UNIQUE KEY `localCredentials_email_unique` (`email`),
  CONSTRAINT `localCredentials_user_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
