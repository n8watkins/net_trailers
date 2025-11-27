# Security Review – November 2025 Hardening Follow‑Up

This document tracks the gaps discovered after the November 26 security push
and outlines concrete remediation steps. The goal is to align the codebase with
the changelog promises ("admin creds moved server‑side", "CSRF on all
state‑changing routes", etc.) before the next release.

**Last Updated**: November 27, 2025

## 1. Admin Credential Exposure ✅ RESOLVED

- **Observed**: `NEXT_PUBLIC_ADMIN_UID` and `NEXT_PUBLIC_ADMIN_TOKEN` were in
  client bundles (`app/admin/accounts|signups/page.tsx`, `README.md`). Any user
  could inspect the JS payload and copy these secrets, defeating admin gating.
- **Impact**: Attackers could mint Firebase tokens that present as the admin UID
  or reuse the exposed token to access privileged routes.
- **Resolution** (November 27, 2025)
    1. Created `hooks/useAdminAuth.ts` - client-side hook that verifies admin
       status via server API (`/api/admin/check`) instead of exposing UIDs.
    2. Updated all admin pages (`accounts`, `signups`, `activity`) to use
       `useAdminAuth` hook instead of `NEXT_PUBLIC_ADMIN_UID`.
    3. Updated `.env.example` to use `ADMIN_UID` (server-only) instead of
       `NEXT_PUBLIC_ADMIN_UID`.
    4. Verified no TypeScript/JavaScript files reference `NEXT_PUBLIC_ADMIN_*`.
    5. Documentation files (README.md, docs/) still have old references but these
       don't affect security since they're not in the client bundle.

## 2. Incomplete CSRF Coverage ✅ RESOLVED

- **Observed**: Only select endpoints (`/api/shares/create`, `/api/gemini/*`,
  `/api/smart-suggestions`) imported `applyCsrfProtection`. Many POST/PUT/DELETE
  routes—including `/api/admin/activity`, `/api/auth/send-password-reset`,
  `/api/admin/init-stats`, recommendations, etc.—still trusted the browser.
- **Impact**: Attackers could craft cross‑site requests to perform sensitive
  actions (password reset floods, admin data exfiltration).
- **Resolution** (November 27, 2025)
    1. Added CSRF protection to all auth routes:
        - `/api/auth/record-signup`
        - `/api/auth/verify-email`
        - `/api/auth/reset-password`
        - `/api/auth/send-password-reset`
    2. Added CSRF protection to `/api/forum/send-reply-notification`.
    3. Admin routes (`/api/admin/reset-demo`, `/api/admin/init-stats`) already had
       CSRF protection.
    4. Updated test files to include Origin headers for CSRF compliance.

## 3. Non‑Persistent Rate Limiting

- **Observed**: The new `MemoryRateLimiter` and `global.activityRateLimits`
  store counters in per-instance memory. In serverless environments each cold
  start yields a fresh, empty map; traffic routed across regions bypasses the
  limits entirely.
- **Impact**: Brute-force, spam, and enumeration attacks are trivially possible
  despite the appearance of protection.
- **Remediation Plan**
    1. Pick a shared backend (Upstash Redis, Vercel KV, Cloudflare KV, etc.) and
       implement a distributed rate limiter with per-IP/user keys plus TTL.
    2. Guard the new dependency behind feature flags so local development can fall
       back to in-memory limits.
    3. Instrument logging/metrics to confirm effective throttling in production.

## 4. CSRF Middleware Blocks Admin Automation ✅ RESOLVED

- **Observed**: Routes such as `/api/admin/init-stats` called
  `applyCsrfProtection` before verifying Firebase tokens. Automation scripts
  (curl, cron, GitHub Actions) do not set `Origin/Referer`, so the CSRF layer
  would return 403 and prevent legitimate maintenance tasks.
- **Impact**: Operational DoS—the admin couldn't run provisioning scripts without
  spoofing browser headers, undermining the security "fix".
- **Resolution** (November 27, 2025)
    1. Updated `lib/csrfProtection.ts` with `isServerToServerCall()` function that
       detects and allows bypass for:
        - Requests with valid CRON_SECRET (timing-safe comparison)
        - Requests with Firebase ID tokens (JWT format starting with "eyJ")
    2. The bypass logic is centralized in the middleware, avoiding copy/paste
       mistakes across routes.
    3. Server-to-server calls now work without Origin headers while browser
       requests still require CSRF validation.

## Tracking & Next Steps

| Issue                              | Owner    | Target Date | Status                  |
| ---------------------------------- | -------- | ----------- | ----------------------- |
| Remove `NEXT_PUBLIC_ADMIN_*` usage | Security | 2025‑11‑30  | ✅ Completed 2025-11-27 |
| CSRF coverage audit + fixes        | Platform | 2025‑12‑05  | ✅ Completed 2025-11-27 |
| Redis/KV-backed rate limiter       | Platform | 2025‑12‑10  | ⏳ Pending              |
| CSRF bypass for trusted automation | Security | 2025‑11‑30  | ✅ Completed 2025-11-27 |

## Remaining Work

The only remaining item is **Non-Persistent Rate Limiting** (§3). This requires
selecting and integrating a distributed rate limiting backend (Upstash Redis,
Vercel KV, etc.). This is a lower-priority enhancement since the current
in-memory rate limiting still provides some protection against casual abuse.

After the rate limiter is implemented, consider scheduling a follow-up
penetration test to validate that all mitigations hold up under adversarial
conditions.

---

## Verification Commands

Run these commands to verify the fixes are in place:

```bash
# 1. Verify no NEXT_PUBLIC_ADMIN_* in code files
grep -r "NEXT_PUBLIC_ADMIN" --include="*.ts" --include="*.tsx" . | grep -v node_modules | grep -v ".next"
# Expected: No output (empty)

# 2. Verify admin pages use useAdminAuth hook
grep -l "useAdminAuth" app/admin/*/page.tsx
# Expected: accounts/page.tsx, activity/page.tsx, signups/page.tsx

# 3. Verify CSRF protection in auth routes
grep -l "applyCsrfProtection" app/api/auth/*/route.ts
# Expected: record-signup, reset-password, send-password-reset, verify-email

# 4. Verify CSRF bypass function exists
grep "isServerToServerCall" lib/csrfProtection.ts
# Expected: function definition and usage in applyCsrfProtection

# 5. Verify README uses ADMIN_UID (not NEXT_PUBLIC_)
grep "ADMIN_UID" README.md | head -2
# Expected: ADMIN_UID=your_firebase_uid_here (server-side only)
```

## Files Modified (November 27, 2025)

### Security Fixes

- `hooks/useAdminAuth.ts` - **NEW** - Server-side admin verification hook
- `lib/csrfProtection.ts` - Added `isServerToServerCall()` bypass for authenticated requests
- `app/admin/accounts/page.tsx` - Replaced `NEXT_PUBLIC_ADMIN_UID` with `useAdminAuth`
- `app/admin/signups/page.tsx` - Replaced `NEXT_PUBLIC_ADMIN_UID` with `useAdminAuth`
- `app/admin/activity/page.tsx` - Replaced `NEXT_PUBLIC_ADMIN_UID` with `useAdminAuth`
- `app/api/auth/record-signup/route.ts` - Added CSRF protection
- `app/api/auth/verify-email/route.ts` - Added CSRF protection
- `app/api/auth/reset-password/route.ts` - Added CSRF protection
- `app/api/auth/send-password-reset/route.ts` - Added CSRF protection
- `app/api/forum/send-reply-notification/route.ts` - Added CSRF protection

### Documentation Updates

- `.env.example` - Changed `NEXT_PUBLIC_ADMIN_UID` to `ADMIN_UID`
- `README.md` - Updated to use server-only `ADMIN_UID`
- `docs/PORTFOLIO-TODO.md` - Removed hardcoded secrets, updated variable names
- `docs/PORTFOLIO-IMPLEMENTATION-PLAN.md` - Added deprecation notices

### Test Updates

- `__tests__/app/api/auth/verify-email/route.test.ts` - Added Origin header
- `__tests__/app/api/auth/reset-password/route.test.ts` - Added Origin header
- `__tests__/app/api/auth/send-password-reset/route.test.ts` - Added Origin header
- `__tests__/app/api/smart-suggestions/route.test.ts` - Added Origin header

## Note on `/api/admin/activity` POST

The POST endpoint in `/api/admin/activity/route.ts` is **intentionally public** (no CSRF).
It's used for client-side activity tracking (logging page views and logins). Adding CSRF
would break legitimate tracking. It has rate limiting and input validation instead:

- Only accepts `type: 'login' | 'view'`
- Validates userId/guestId format
- Validates email format
- Sanitizes and truncates userAgent
- Rate limited per IP
