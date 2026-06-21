-- De-dupe any pre-existing duplicate like/vote rows before adding the UNIQUE
-- indexes (a CREATE UNIQUE INDEX would otherwise fail). Keeps the earliest row
-- (MIN(rowid)) per (parent, user) pair. No-op when there are no duplicates.
DELETE FROM `comment_likes` WHERE `rowid` NOT IN (SELECT MIN(`rowid`) FROM `comment_likes` GROUP BY `commentId`, `userId`);--> statement-breakpoint
DROP INDEX `comment_likes_comment_user_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `comment_likes_comment_user_idx` ON `comment_likes` (`commentId`,`userId`);--> statement-breakpoint
DELETE FROM `poll_votes` WHERE `rowid` NOT IN (SELECT MIN(`rowid`) FROM `poll_votes` GROUP BY `pollId`, `userId`);--> statement-breakpoint
DROP INDEX `poll_votes_poll_user_idx`;--> statement-breakpoint
CREATE INDEX `poll_votes_user_idx` ON `poll_votes` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `poll_votes_poll_user_idx` ON `poll_votes` (`pollId`,`userId`);--> statement-breakpoint
DELETE FROM `ranking_likes` WHERE `rowid` NOT IN (SELECT MIN(`rowid`) FROM `ranking_likes` GROUP BY `rankingId`, `userId`);--> statement-breakpoint
DROP INDEX `ranking_likes_ranking_user_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `ranking_likes_ranking_user_idx` ON `ranking_likes` (`rankingId`,`userId`);--> statement-breakpoint
DELETE FROM `reply_likes` WHERE `rowid` NOT IN (SELECT MIN(`rowid`) FROM `reply_likes` GROUP BY `replyId`, `userId`);--> statement-breakpoint
DROP INDEX `reply_likes_reply_user_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `reply_likes_reply_user_idx` ON `reply_likes` (`replyId`,`userId`);--> statement-breakpoint
DELETE FROM `thread_likes` WHERE `rowid` NOT IN (SELECT MIN(`rowid`) FROM `thread_likes` GROUP BY `threadId`, `userId`);--> statement-breakpoint
DROP INDEX `thread_likes_thread_user_idx`;--> statement-breakpoint
CREATE INDEX `thread_likes_user_idx` ON `thread_likes` (`userId`);--> statement-breakpoint
CREATE UNIQUE INDEX `thread_likes_thread_user_idx` ON `thread_likes` (`threadId`,`userId`);
