CREATE TABLE `account` (
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`providerAccountId` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `providerAccountId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `admin_emails` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`subject` text,
	`sentCount` integer DEFAULT 0 NOT NULL,
	`failedCount` integer DEFAULT 0 NOT NULL,
	`targetFilter` text,
	`sentAt` integer NOT NULL,
	`sentBy` text
);
--> statement-breakpoint
CREATE TABLE `child_safety_pins` (
	`userId` text PRIMARY KEY NOT NULL,
	`pinHash` text NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `comment_likes` (
	`id` text PRIMARY KEY NOT NULL,
	`commentId` text NOT NULL,
	`userId` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `comment_likes_comment_user_idx` ON `comment_likes` (`commentId`,`userId`);--> statement-breakpoint
CREATE TABLE `content_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`contentId` text NOT NULL,
	`contentType` text NOT NULL,
	`reportedBy` text NOT NULL,
	`reporterName` text,
	`reason` text NOT NULL,
	`details` text,
	`createdAt` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`reviewedBy` text,
	`reviewedAt` integer,
	FOREIGN KEY (`reportedBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `content_reports_reporter_idx` ON `content_reports` (`reportedBy`);--> statement-breakpoint
CREATE TABLE `interaction_summary` (
	`userId` text PRIMARY KEY NOT NULL,
	`totalInteractions` integer DEFAULT 0 NOT NULL,
	`genrePreferences` text,
	`topContentIds` text,
	`lastUpdated` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `interactions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`contentId` integer NOT NULL,
	`mediaType` text NOT NULL,
	`interactionType` text NOT NULL,
	`genreIds` text,
	`timestamp` integer NOT NULL,
	`trailerDuration` integer,
	`searchQuery` text,
	`collectionId` text,
	`source` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `interactions_user_idx` ON `interactions` (`userId`);--> statement-breakpoint
CREATE INDEX `interactions_user_ts_idx` ON `interactions` (`userId`,`timestamp`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`title` text,
	`message` text,
	`isRead` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`data` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`userId`);--> statement-breakpoint
CREATE INDEX `notifications_user_created_idx` ON `notifications` (`userId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `poll_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`pollId` text NOT NULL,
	`userId` text NOT NULL,
	`optionIds` text NOT NULL,
	`votedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `poll_votes_poll_user_idx` ON `poll_votes` (`pollId`,`userId`);--> statement-breakpoint
CREATE TABLE `polls` (
	`id` text PRIMARY KEY NOT NULL,
	`question` text NOT NULL,
	`description` text,
	`category` text NOT NULL,
	`userId` text NOT NULL,
	`userName` text,
	`userAvatar` text,
	`createdAt` integer NOT NULL,
	`expiresAt` integer,
	`options` text NOT NULL,
	`totalVotes` integer DEFAULT 0 NOT NULL,
	`isMultipleChoice` integer DEFAULT false NOT NULL,
	`allowAddOptions` integer DEFAULT false NOT NULL,
	`isHidden` integer DEFAULT false NOT NULL,
	`tags` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `polls_user_idx` ON `polls` (`userId`);--> statement-breakpoint
CREATE INDEX `polls_category_created_idx` ON `polls` (`category`,`createdAt`);--> statement-breakpoint
CREATE TABLE `profiles` (
	`userId` text PRIMARY KEY NOT NULL,
	`email` text,
	`displayName` text,
	`username` text,
	`avatarUrl` text,
	`avatarSource` text,
	`description` text,
	`favoriteGenres` text,
	`rankingsCount` integer DEFAULT 0 NOT NULL,
	`publicCollectionsCount` integer DEFAULT 0 NOT NULL,
	`totalLikes` integer DEFAULT 0 NOT NULL,
	`totalViews` integer DEFAULT 0 NOT NULL,
	`isPublic` integer DEFAULT false NOT NULL,
	`visibility` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`lastLoginAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profiles_username_unique` ON `profiles` (`username`);--> statement-breakpoint
CREATE INDEX `profiles_username_idx` ON `profiles` (`username`);--> statement-breakpoint
CREATE TABLE `ranking_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`rankingId` text NOT NULL,
	`userId` text NOT NULL,
	`userName` text,
	`userAvatar` text,
	`type` text DEFAULT 'ranking' NOT NULL,
	`positionNumber` integer,
	`text` text NOT NULL,
	`parentCommentId` text,
	`likes` integer DEFAULT 0 NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ranking_comments_ranking_idx` ON `ranking_comments` (`rankingId`);--> statement-breakpoint
CREATE INDEX `ranking_comments_user_idx` ON `ranking_comments` (`userId`);--> statement-breakpoint
CREATE TABLE `ranking_likes` (
	`id` text PRIMARY KEY NOT NULL,
	`rankingId` text NOT NULL,
	`userId` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ranking_likes_ranking_user_idx` ON `ranking_likes` (`rankingId`,`userId`);--> statement-breakpoint
CREATE TABLE `rankings` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`userName` text,
	`userAvatar` text,
	`userUsername` text,
	`title` text NOT NULL,
	`description` text,
	`rankedItems` text NOT NULL,
	`isPublic` integer DEFAULT false NOT NULL,
	`itemCount` integer DEFAULT 0 NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`likes` integer DEFAULT 0 NOT NULL,
	`comments` integer DEFAULT 0 NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`contentIds` text,
	`contentTitles` text,
	`shareSettings` text,
	`sharedLinkId` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `rankings_user_idx` ON `rankings` (`userId`);--> statement-breakpoint
CREATE INDEX `rankings_public_created_idx` ON `rankings` (`isPublic`,`createdAt`);--> statement-breakpoint
CREATE TABLE `reply_likes` (
	`id` text PRIMARY KEY NOT NULL,
	`replyId` text NOT NULL,
	`userId` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reply_likes_reply_user_idx` ON `reply_likes` (`replyId`,`userId`);--> statement-breakpoint
CREATE TABLE `session` (
	`sessionToken` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `shares` (
	`id` text PRIMARY KEY NOT NULL,
	`collectionId` text NOT NULL,
	`userId` text NOT NULL,
	`collectionName` text,
	`itemCount` integer DEFAULT 0 NOT NULL,
	`createdAt` integer NOT NULL,
	`expiresAt` integer,
	`isActive` integer DEFAULT true NOT NULL,
	`viewCount` integer DEFAULT 0 NOT NULL,
	`lastViewedAt` integer,
	`allowDuplicates` integer DEFAULT false NOT NULL,
	`settings` text,
	`snapshot` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `shares_user_idx` ON `shares` (`userId`);--> statement-breakpoint
CREATE INDEX `shares_active_idx` ON `shares` (`isActive`);--> statement-breakpoint
CREATE TABLE `signup_log` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text,
	`email` text,
	`timestamp` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `signup_log_user_idx` ON `signup_log` (`userId`);--> statement-breakpoint
CREATE TABLE `thread_likes` (
	`id` text PRIMARY KEY NOT NULL,
	`threadId` text NOT NULL,
	`userId` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `thread_likes_thread_user_idx` ON `thread_likes` (`threadId`,`userId`);--> statement-breakpoint
CREATE TABLE `thread_replies` (
	`id` text PRIMARY KEY NOT NULL,
	`threadId` text NOT NULL,
	`userId` text NOT NULL,
	`userName` text,
	`userAvatar` text,
	`content` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer,
	`isEdited` integer DEFAULT false NOT NULL,
	`likes` integer DEFAULT 0 NOT NULL,
	`parentReplyId` text,
	`mentions` text,
	`images` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `thread_replies_thread_idx` ON `thread_replies` (`threadId`);--> statement-breakpoint
CREATE INDEX `thread_replies_user_idx` ON `thread_replies` (`userId`);--> statement-breakpoint
CREATE TABLE `threads` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`category` text NOT NULL,
	`userId` text NOT NULL,
	`userName` text,
	`userAvatar` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	`isPinned` integer DEFAULT false NOT NULL,
	`isLocked` integer DEFAULT false NOT NULL,
	`views` integer DEFAULT 0 NOT NULL,
	`replyCount` integer DEFAULT 0 NOT NULL,
	`lastReplyAt` integer,
	`lastReplyBy` text,
	`tags` text,
	`likes` integer DEFAULT 0 NOT NULL,
	`images` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `threads_user_idx` ON `threads` (`userId`);--> statement-breakpoint
CREATE INDEX `threads_category_created_idx` ON `threads` (`category`,`createdAt`);--> statement-breakpoint
CREATE TABLE `user_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`type` text NOT NULL,
	`timestamp` integer NOT NULL,
	`referenceId` text,
	`referenceType` text,
	`preview` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_activity_user_idx` ON `user_activity` (`userId`);--> statement-breakpoint
CREATE INDEX `user_activity_user_ts_idx` ON `user_activity` (`userId`,`timestamp`);--> statement-breakpoint
CREATE TABLE `user_badges` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text,
	`color` text,
	`unlockedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_badges_user_idx` ON `user_badges` (`userId`);--> statement-breakpoint
CREATE TABLE `user_follows` (
	`id` text PRIMARY KEY NOT NULL,
	`followerId` text NOT NULL,
	`followingId` text NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`followerId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`followingId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_follows_follower_idx` ON `user_follows` (`followerId`);--> statement-breakpoint
CREATE INDEX `user_follows_following_idx` ON `user_follows` (`followingId`);--> statement-breakpoint
CREATE INDEX `user_follows_pair_idx` ON `user_follows` (`followerId`,`followingId`);--> statement-breakpoint
CREATE TABLE `user_preferences` (
	`userId` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`emailVerified` integer,
	`image` text,
	`githubLogin` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verificationToken` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
--> statement-breakpoint
CREATE TABLE `watch_history` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`contentId` integer NOT NULL,
	`mediaType` text NOT NULL,
	`watchedAt` integer NOT NULL,
	`content` text,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `watch_history_user_idx` ON `watch_history` (`userId`);--> statement-breakpoint
CREATE INDEX `watch_history_user_watched_idx` ON `watch_history` (`userId`,`watchedAt`);