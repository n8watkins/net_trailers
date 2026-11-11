CREATE TABLE IF NOT EXISTS `admin_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actorId` text NOT NULL,
	`actorEmail` text,
	`action` text NOT NULL,
	`details` text,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `admin_audit_created_idx` ON `admin_audit` (`createdAt`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `cron_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`job` text NOT NULL,
	`trigger` text NOT NULL,
	`scope` text NOT NULL,
	`startedAt` integer NOT NULL,
	`finishedAt` integer,
	`ok` integer,
	`summary` text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `cron_runs_job_started_idx` ON `cron_runs` (`job`,`startedAt`);--> statement-breakpoint
ALTER TABLE `session` ADD `createdAt` integer;--> statement-breakpoint
ALTER TABLE `user` ADD `createdAt` integer;--> statement-breakpoint
ALTER TABLE `user` ADD `lastLoginAt` integer;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `user_activity_ts_idx` ON `user_activity` (`timestamp`);--> statement-breakpoint
-- Backfill the new user dates from profiles, the only earlier source.
UPDATE `user` SET `createdAt` = (SELECT `createdAt` FROM `profiles` WHERE `profiles`.`userId` = `user`.`id`) WHERE `createdAt` IS NULL;--> statement-breakpoint
UPDATE `user` SET `lastLoginAt` = (SELECT `lastLoginAt` FROM `profiles` WHERE `profiles`.`userId` = `user`.`id`) WHERE `lastLoginAt` IS NULL;
