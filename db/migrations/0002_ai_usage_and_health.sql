CREATE TABLE IF NOT EXISTS `ai_health` (
	`id` text PRIMARY KEY NOT NULL,
	`ok` integer NOT NULL,
	`reason` text,
	`checkedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `ai_usage` (
	`key` text NOT NULL,
	`day` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`updatedAt` integer NOT NULL,
	PRIMARY KEY(`key`, `day`)
);
