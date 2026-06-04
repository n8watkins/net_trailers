# Security Changelog

This document tracks the evolution of security improvements in NetTrailers.

---

## November 30, 2025 - Admin Credential Security Enhancement

### Security Improvements

1. **Server-Side Admin Credentials**
    - Moved `ADMIN_UID` from `NEXT_PUBLIC_ADMIN_UID` to server-side only
    - Moved `ADMIN_TOKEN` from `NEXT_PUBLIC_ADMIN_TOKEN` to server-side only
    - Admin credentials no longer bundled with client JavaScript
    - Reduces attack surface by limiting credential exposure

2. **Admin Authentication Hardening**
    - Fixed redirect loop in admin page authentication flow
    - Separated admin verification logic from routing logic
    - Added proper async/await handling for Firebase Auth timing
    - Implemented useRef to prevent duplicate verification checks
    - Enhanced logging for authentication debugging

### Impact

- **Before**: Admin UIDs were visible in client bundles and browser DevTools
- **After**: Admin verification happens server-side via `/api/admin/check` endpoint
- **Risk Reduction**: Attackers cannot discover admin UIDs through static analysis

### Files Changed

| File                 | Change                                       |
| -------------------- | -------------------------------------------- |
| `.env.example`       | Updated to show ADMIN_UID (server-side only) |
| `app/admin/page.tsx` | Fixed authentication flow and redirect logic |
| Multiple admin pages | Enhanced error handling and state management |

---

## November 29, 2025 - CSRF Hardening Complete

### Fixes Applied

1. **Removed JWT Bypass Vulnerability (Critical)**
    - `lib/csrfProtection.ts` had an `eyJ` check that allowed any fake JWT to bypass CSRF
    - Fix: Removed entirely; only CRON_SECRET is trusted for bypass

2. **Fixed Origin Prefix Matching (High)**
    - Origin validation used `startsWith()`, allowing `https://allowed.com.evil.com`
    - Fix: Changed to exact matching using `new URL().origin`

3. **Limited CRON_SECRET Blast Radius (Medium)**
    - CRON_SECRET bypass worked on all routes
    - Fix: Now only works on `/api/cron/*` routes

4. **Added Server Action CSRF Protection**
    - Server actions bypass `proxy.ts` and had no CSRF protection
    - Fix: Added `validateServerActionOrigin()` for server actions

5. **Fixed GET-Based State Changes**
    - `/api/email/unsubscribe` performed unsubscribe on GET
    - `/api/shares/[shareId]` incremented views on GET
    - Fix: Both now use POST for state changes, GET is read-only

6. **Added Automated Guards**
    - `serverActionCsrf.test.ts` - Scans for unprotected server actions
    - `routeHandlerCsrf.test.ts` - Ensures mutations are under `/api/*`

### Files Changed

| File                                 | Change                                      |
| ------------------------------------ | ------------------------------------------- |
| `proxy.ts`                           | Added global CSRF, CRON_SECRET validation   |
| `lib/csrfProtection.ts`              | Exact origin matching, server action helper |
| `lib/actions/childSafety.ts`         | Added CSRF validation                       |
| `app/api/email/unsubscribe/route.ts` | POST for state change                       |
| `app/api/shares/[shareId]/route.ts`  | POST for view tracking                      |
| `__tests__/security/*`               | New lint guards                             |

---

## November 27, 2025 - Initial Security Push

### Fixes Applied

1. **Admin Credential Exposure**
    - `NEXT_PUBLIC_ADMIN_UID` was in client bundles
    - Fix: Created `useAdminAuth` hook, server-side validation via `/api/admin/check`

2. **CSRF Coverage Gaps**
    - Many POST routes lacked CSRF protection
    - Fix: Added `applyCsrfProtection` to auth routes, forum routes

### Files Changed

| File                      | Change                             |
| ------------------------- | ---------------------------------- |
| `hooks/useAdminAuth.ts`   | New server-side admin verification |
| `app/admin/*/page.tsx`    | Use `useAdminAuth` hook            |
| `app/api/auth/*/route.ts` | Added CSRF protection              |
| `.env.example`            | Changed to server-only `ADMIN_UID` |

---

## Architecture Evolution

### Before (Pre-November 27)

```
Routes → No consistent CSRF protection
         Per-route protection was optional
         Admin credentials exposed client-side
```

### After November 27

```
Routes → Per-route CSRF via applyCsrfProtection()
         Still had gaps, JWT bypass vulnerability
         Admin credentials server-side
```

### After November 29 (Current)

```
Routes → Global CSRF via proxy.ts
         Exact origin matching
         CRON_SECRET limited to /api/cron/*
         Server actions protected
         Automated guards prevent regression
```

---

## Known Remaining Items

### Medium Priority (Not CSRF-related)

1. **Email Token Exposure** - Verification tokens readable by client
    - Recommendation: Hash tokens before storing

2. **Child Safety Client Control** - Query param can bypass filtering
    - Recommendation: Server-side enforcement from user profile

3. **Recommendation Feedback SDK** - Uses client SDK on server
    - Recommendation: Switch to Admin SDK

4. **In-Memory Rate Limiting** - Resets on cold start
    - Recommendation: Use Vercel KV or Redis

---

## Test Coverage

| Test File                  | Tests  | Purpose                  |
| -------------------------- | ------ | ------------------------ |
| `csrfProtection.test.ts`   | 23     | Origin validation        |
| `proxy.test.ts`            | 29     | Proxy middleware         |
| `serverActionCsrf.test.ts` | 8      | Server action lint guard |
| `routeHandlerCsrf.test.ts` | 3      | Route location guard     |
| **Total**                  | **63** |                          |

---

## References

- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
