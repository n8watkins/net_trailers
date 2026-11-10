CREATE TABLE IF NOT EXISTS `rate_limits` (
	`key` text NOT NULL,
	`period` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`expiresAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	PRIMARY KEY(`key`, `period`)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `rate_limits_expires_idx` ON `rate_limits` (`expiresAt`);