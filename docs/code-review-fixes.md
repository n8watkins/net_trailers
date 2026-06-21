# Code-review fix list (post Firebase→Turso migration)

Findings from the final review of `6e854d3..HEAD`. Severity-ranked. Each item: **bug → fix → files**.
Verify after each batch: `npm run type-check && npm test`; full gate `npm run build`.
Deploy: push to `main` (auto-deploys) or `vercel --prod`.

> Status legend: ✅ done · 🟡 partial · ⬜ todo

> **All 10 numbered findings (#1–#10) are fixed** (commits f31c28f, 0d21f5b, 972d4b8
> on top of 8987a81). Safe cleanup items done; cosmetic-only refactors deferred (see
> the cleanup section). **⚠️ Action required:** the #9/#10 schema migration
> `db/migrations/0001_mean_shadowcat.sql` must be applied with `npm run db:migrate`
> **before** the Batch C code is deployed — the new like path relies on the new
> UNIQUE indexes for its conflict handling.

---

## 🔴 Critical / security

### #1 — Comment delete auth bypass ✅

**Bug:** `DELETE /api/rankings/comments/[commentId]` trusted `rankingOwnerId` from the request body; default `?? userId` made the check `comment.userId !== userId && rankingOwnerId !== userId` always pass → **any user could delete any comment**.
**Fix done:** `db/queries/rankingComments.ts deleteComment(userId, commentId)` now looks up the real ranking owner via `comment.rankingId`; route no longer reads the body; route param renamed `_request`.
**Remaining (cosmetic, ⬜):** drop the now-ignored `rankingOwnerId` arg from `stores/rankingStore.ts` (`deleteComment` action ~L532/542 body) and `components/rankings/CommentSection.tsx` (props L27/34/108). Harmless if left.

### #2 — `/api/profiles/[userId]` GET leaks private profiles ✅

**Bug:** GET is unauthenticated, calls `getProfile()` (raw row), strips only `email`, returns name/username/avatar/bio/genres/stats with **no `isPublic`/`visibility.enablePublicProfile` check** (doc comment lies).
**Fix:** make it owner-aware. Use `currentUserId()` (db/queries/\_helpers). If requester === `userId` → return full profile. Else if `profile.isPublic !== false && profile.visibility?.enablePublicProfile !== false` → return the public subset, else `404`.
**Files:** `app/api/profiles/[userId]/route.ts` (GET, ~L27–49).

### #3 — Upload DELETE ownership is a substring check ✅

**Bug:** `if (!url.includes(\`/uploads/${userId}/\`))` — a crafted `?x=/uploads/<myId>/` suffix on a victim URL passes → delete another user's blob.
**Fix:** `const path = new URL(url).pathname; if (!path.startsWith(\`/uploads/${userId}/\`)) return 403`.
**Files:** `app/api/upload/route.ts` (~L54).

---

## 🟠 Functional / integrity

### #4 — Poll single-choice not enforced → percentages >100% ✅

**Bug:** polls are always `isMultipleChoice=false`, but `castVote(pollId,userId,newOptionIds[])` increments **every** id in `newOptionIds` while `totalVotes` +1. Voting all options → ~300% sum. Ids aren't validated against the poll's options either.
**Fix (in `db/queries/polls.ts castVote`, after loading `poll`):** compute `validIds = poll.options.map(o=>o.id)`; `filtered = newOptionIds.filter(id=>validIds.includes(id))`; if `filtered.length===0` throw; if `!poll.isMultipleChoice && filtered.length>1` → keep only `[filtered[0]]` (or throw). Use `filtered` for the rest.
**Files:** `db/queries/polls.ts` (~L347–391); optionally mirror a guard in `app/api/polls/[id]/vote/route.ts`.

### #5 — `cron/social-digest` emails nobody (stale `ADMIN_UID` + admin-only default) ✅

**Bug:** `adminOnly = param==='true' || param===null` (defaults true on the scheduled run) and gates on `process.env.ADMIN_UID` — **removed** in the migration (now `ADMIN_GITHUB_LOGIN`). Unset → everyone `continue`d → digest never sends; notifications never marked `emailSent`.
**Fix:** default `adminOnly=false` (scheduled run emails all eligible users). For the explicit `adminOnly=true` test mode, resolve the admin user id from `ADMIN_GITHUB_LOGIN` (`select id from user where githubLogin = ADMIN_GITHUB_LOGIN`) instead of `ADMIN_UID`. Keep the `CRON_SECRET` gate.
**Files:** `app/api/cron/social-digest/route.ts` (~L129–151). **Also audit** `app/api/cron/update-trending/route.ts` and `app/api/cron/refresh-collection-cache/route.ts` and `app/api/email/send-pilot/route.ts` / `test-weekly-digest/route.ts` for the same stale `ADMIN_UID`.

### #6 — Magic-link "check your inbox" shown even when send fails ✅

**Bug:** `signIn('email',{redirect:false})` resolves `{ok:false,error}` on a Brevo failure (doesn't throw); `signInWithEmail` discards it → `AuthModal` always shows success.
**Fix:** `const res = await signIn('email', { email, redirect:false, callbackUrl: window.location.href }); if (res?.error) throw new Error(res.error)`.
**Files:** `hooks/useAuth.tsx` (`signInWithEmail`, ~L89–95).

### #7 — `deleteUserAccount` orphans other users' rows ✅

**Bug:** deletes the user's threads/polls/rankings by `userId`, but **other users'** replies/likes/comments/votes referencing those deleted ids survive (libSQL doesn't run FK cascade per-request). Also misses `signupLog` (PII) and `content_reports.reviewedBy`.
**Fix:** before deleting the user's own threads/polls/rankings, collect their ids and delete dependents by parent id (reuse per-entity helpers `deleteThread(id)` / `deletePoll(id)` / `deleteRankingWithCascade(id)` in a loop, OR `inArray` deletes on `threadReplies/threadLikes/replyLikes` by threadId, `pollVotes` by pollId, `rankingComments/rankingLikes/commentLikes` by rankingId/commentId). Add `tx.delete(signupLog).where(eq(signupLog.userId,userId))` and null/clear `content_reports.reviewedBy`.
**Files:** `db/queries/account.ts` (`deleteUserAccount`). Root cause noted: `db/index.ts` doesn't enable `PRAGMA foreign_keys` (unreliable on Turso HTTP anyway) → explicit deletes are the right pattern, just must be complete.

### #8 — Account cap (`MAX_TOTAL_ACCOUNTS`) no longer enforced ✅

**Bug:** `utils/accountLimits.ts` `canCreateAccount()`/`recordAccountCreation()` have **zero callers**; `auth.ts` has no gate → unlimited signups (the cost guard is dead).
**Fix:** add a `callbacks.signIn({ user })` in `auth.ts`: `count(*) from user`; if `>= MAX_TOTAL_ACCOUNTS` AND this user has no existing `account` row (i.e. a new signup) → return `false` to block. Existing users still sign in. (`MAX_TOTAL_ACCOUNTS` is `NEXT_PUBLIC_MAX_TOTAL_ACCOUNTS`, default 50.)
**Files:** `auth.ts`; can delete `utils/accountLimits.ts` if unused after.

---

## 🟡 Lower-severity correctness + efficiency

### #9 — Like-counter race (check-then-act) + 4× duplication ✅

**Bug:** `likeThread`/`likeReply`/`likeRanking`/`commentLike` do `hasLiked?` then unconditional `likes = likes + 1`; concurrent double-POST inflates the denormalized counter past the actual junction-row count. Logic copy-pasted 4×.
**Fix:** add **unique indexes** on the junction tables (`thread_likes(threadId,userId)`, `reply_likes(replyId,userId)`, `ranking_likes(rankingId,userId)`, `comment_likes(commentId,userId)`) — change `index(...)` → `uniqueIndex(...)` in `db/schema.ts`, then `npm run db:generate && npm run db:migrate`. Then gate the increment: `const ins = await tx.insert(likeTable).values({...}).onConflictDoNothing().returning({id}); if (ins.length) tx.update(counter).set({likes: sql\`+1\`})`. Extract one `toggleLike({likeTable,userCol,targetCol,counterTable,counterCol}, userId, targetId)`in`db/queries/\_helpers.ts`.
**Files:** `db/schema.ts`, `db/queries/{threads,rankings,rankingComments}.ts`, `db/queries/\_helpers.ts`, new migration.

### #10 — `publicProfile` N+1 + `getLikedThreadIds` full scan ✅

**Bug:** `lib/publicProfile.ts` "polls voted" (~L311) and "threads voted" (~L376) do one `SELECT` per item (~50 sequential Turso round-trips/profile view). `db/queries/threads.ts getLikedThreadIds` (~L336) ignores its `threadIds` arg and fetches the user's entire like history on every forum-feed load.
**Fix:** batch with `inArray(polls.id, pollIds)` / `inArray(threads.id, threadIds)` then map. `getLikedThreadIds` → `and(eq(userId,...), inArray(threadId, threadIds))`. Add a **leading-`userId` index** on `thread_likes`/`poll_votes` (current composite indexes lead with threadId/pollId, unusable for the userId-only filters).
**Files:** `lib/publicProfile.ts`, `db/queries/threads.ts`, `db/schema.ts` (+migration).

---

## 🧹 Cleanup (non-blocking, do as a final pass)

Done in Batch D (commit pending):

- ✅ **`lib/email/email-validation.ts`:** dropped `allowedAttributes['*']:['title']`; only `a` carries `href`/`title` now (parity with old DOMPurify allowlist).
- ✅ **Dead code removed:** `services/authStorageService.ts updateUserDataField` (0 callers, full-blob RMW footgun); `utils/accountLimits.ts canCreateAccount`/`recordAccountCreation` (replaced by the inline cap in `auth.ts`); `hooks/useAuthData.ts softDeleteAccount`/`restoreAccount` (dead exports, `restoreAccount` always returned false).

Deferred — pure cosmetic churn / refactor, no behaviour change, not worth the regression risk on a live app:

- ⬜ **`withAdmin` HOF / `requireAdmin` helper:** still worth doing to kill the fragile `error.includes('not an administrator')` 401/403 ternary duplicated across **9 admin routes** (`admin/email/{send,preview,history}`, `admin/{activity,init-stats,reset-demo,trending-stats,users,users/filtered}`). Low impact (wrong status code only), high edit count.
- ⬜ **Shared `requestJson(input, init)`** beside `lib/authenticatedFetch.ts`; use in `stores/{rankingStore,forumStore,profileStore}.ts` (each re-implements it; `forumStore` reads skip the ok-check and mix `credentials`).
- ⬜ **`deleteUserData`≡`deleteUserAccount`** in `services/authStorageService.ts` — collapse (real account delete is `/api/user/delete-account`). Left in place; still referenced.
- ⬜ **Firebase-era naming:** `stores/createUserStore.ts` `enableFirebaseSync`/`syncWithFirebase`/`firebaseData` (rename to storage-neutral terms).
- ⬜ **`services/authStorageService.ts` cache:** `loadingPromises` + `userDataCache` double layer — likely only the TTL cache is needed.
- ⬜ **(also) Notifications poll payload:** `utils/firestore/notifications.ts` polls the full 50-item list every 30s; add `?since=<lastCreatedAt>` / unread-count probe.
- ⬜ **`auth.ts`:** Brevo provider is a hand-rolled `{type:'email', server:{}}` shim — fragile across NextAuth upgrades. `useAuth.tsx emailVerified` hardcoded `true` (fine; both providers verify).
- ⬜ **`userPreferences` whole-blob RMW:** small pref changes rewrite the whole JSON blob (last-writer-wins); revisit if collections grow large.

---

## Execution log

- ✅ Batch A security: #1 (incl. cosmetic), #2, #3 — commit `f31c28f`.
- ✅ Batch B integrity: #4, #5, #6, #7, #8 — commit `0d21f5b`.
- ✅ Batch C perf: #9, #10 (+migration `0001_mean_shadowcat.sql`) — commit `972d4b8`.
- ✅ Batch D cleanup: safe items done; cosmetic refactors deferred (above).

All batches verified with `npm run type-check` + `npx jest` (283 passing). **Before
deploying Batch C, run `npm run db:migrate`** to apply the unique-index migration —
it's the one remaining manual step (the commits are local; push when ready to deploy).
