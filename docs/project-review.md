# NetTrailer – Security & Reliability Review

This document captures the most critical issues discovered during the repository audit. Items are ordered by the ratio of impact (risk if unresolved) to effort (relative ease of remediation).

## Prioritization Matrix

| # | Area | Impact | Effort | Why it matters |
|---|------|--------|--------|----------------|
| 1 | Firestore utilities on server routes | High | Medium | Cron/share flows fail today because server handlers import browser-only SDK helpers. |
| 2 | Share utilities mixing Admin + browser APIs | High | Medium | Passing an Admin DB into client helpers throws, so share APIs are broken. |
| 3 | Unauthenticated AI row generator | Medium/High | Low | Anyone can burn Gemini quota and we log user prompts verbatim. |
| 4 | Email pilot endpoint (open relay) | Medium | Low | Public callers can send unlimited email via Resend, risking spam complaints and cost. |
| 5 | Certification cache timers in serverless | Medium | Low | Every lambda import leaks a `setInterval`, keeping functions hot and costly. |
| 6 | Cron job scans entire `users` collection | Medium | Medium | Re-enabling cron would read every user doc each run—too slow and expensive. |

## Detailed Findings & Recommended Fixes

### 1. Firestore Admin/Client Mismatch in Server Routes
- **Files**: `app/api/cron/update-collections/route.ts`, `app/api/shares/*`, `utils/firestore/customRows.ts`, `utils/firestore/notifications.ts`
- **Problem**: Server-only handlers import helpers that always pull in the browser Firestore SDK (`db` from `firebase.ts`). The browser SDK cannot authenticate inside serverless routes, so Firestore rules deny access and the code silently fails.
- **Solution**:
  1. Refactor each Firestore helper into a pure “core” that accepts a Firestore adapter (interface exposing `doc`, `getDoc`, `setDoc`, etc.).
  2. Default the adapter to the browser SDK for client code, but allow server routes to pass `getAdminDb()` so the operations run with service credentials.
  3. Add guards to prevent server routes from importing client-only modules (e.g., export admin-aware helpers from a separate entry point) and add integration tests for cron/share flows.

### 2. Share Utilities Use Browser SDK With Admin DB
- **Files**: `utils/firestore/shares.ts`, `app/api/shares/*`
- **Problem**: The share helpers import `doc/getDoc/updateDoc` from `firebase/firestore` then cast the incoming Admin DB (`Firestore` from `firebase-admin`) with `as any`. That combination throws at runtime, so the API routes can’t read or write share docs.
- **Solution**:
  1. Introduce helper functions (e.g., `getDocRef(db, path)`) with implementations for both environments, or split the module into `shares.client.ts` and `shares.admin.ts`.
  2. Update API routes to import the admin version and add tests that hit the route with a mocked Admin DB to ensure share creation/toggle/delete works end-to-end.

### 3. Unauthenticated AI Row Generator Logs Sensitive Data
- **Files**: `app/api/generate-row/route.ts`
- **Problem**: The endpoint is wide open, calls Gemini on every request, and logs full prompts/results. Attackers can burn through the API quota, and logs may capture sensitive user queries.
- **Solution**:
  1. Require Firebase auth (via `withAuth`) or an internal service token for guest flows.
  2. Add rate limiting (Redis/Edge middleware) before calling Gemini; reject abusive IPs quickly.
  3. Wrap verbose logging in `if (process.env.NODE_ENV === 'development')` and redact user text in production logs.

### 4. Email Pilot Endpoint Acts as an Open Relay
- **Files**: `app/api/email/send-pilot/route.ts`
- **Problem**: Any caller can POST an arbitrary `email` and trigger a Resend delivery. This can be abused to spam users, exhaust quotas, or hurt sender reputation.
- **Solution**:
  1. Protect the route with `withAuth` or require a signed secret header.
  2. Enforce per-user/day quotas (store counters in Redis/Firestore) before fetching TMDB or calling Resend.
  3. Sanitize logs and return generic errors to avoid leaking delivery status.

### 5. Certification Cache Interval Leaks in Serverless
- **Files**: `utils/certificationCache.ts`
- **Problem**: The module registers `setInterval(clearExpired, 10min)` during import. In serverless environments every invocation spawns a new interval that never gets cleaned up, preventing instances from idling and inflating cost.
- **Solution**:
  1. Only start the interval in long-lived environments (`if (typeof window !== 'undefined')` or when running inside the dev server).
  2. For server-side caching needs, expose explicit `start()`/`stop()` helpers that cron jobs can call, rather than auto-starting on import.
  3. Add a small test that imports the module in a mocked serverless context and asserts no interval is scheduled.

### 6. Cron Job Scans Entire Users Collection
- **Files**: `app/api/cron/update-collections/route.ts`
- **Problem**: Once `AUTO_UPDATE_CRON_ENABLED` is flipped, the cron handler reads every user document on each run, then processes collections sequentially. This will exceed the 60s Vercel limit and produce massive read bills as the user base grows.
- **Solution**:
  1. Maintain a separate index (e.g., `autoUpdateSubscriptions`) listing only user IDs that have auto-update enabled, so the cron job can page through a small subset.
  2. Process users in bounded batches with `Promise.allSettled` + concurrency limits, persisting cursors/last-run timestamps so the job can resume across invocations.
  3. Emit metrics (duration, read count) so we can observe when scaling adjustments are needed.

---
Focusing on issues 1–3 immediately restores broken server functionality and closes the largest abuse vectors. Items 4–6 tighten operational safeguards and keep infrastructure costs predictable.
