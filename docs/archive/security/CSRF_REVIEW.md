# CSRF Review

**Last Updated:** November 29, 2025

## Status Summary

| Finding                                  | Severity | Status   |
| ---------------------------------------- | -------- | -------- |
| Server actions bypass CSRF               | High     | ✅ FIXED |
| CRON_SECRET disables CSRF for all routes | Medium   | ✅ FIXED |
| GET-based unsubscribe state change       | Medium   | ✅ FIXED |
| GET-based share view increment           | Low      | ✅ FIXED |
| No regression tests                      | Low      | ✅ FIXED |
| No server action lint guard              | Low      | ✅ FIXED |
| Lint guard only scans lib/actions        | Low      | ✅ FIXED |
| No route handler location guard          | Low      | ✅ FIXED |

---

## Findings

### 1. Server actions bypass CSRF (High) - ✅ FIXED

**Original Problem**: The proxy (`proxy.ts:45-124`) only guards `/api/*` paths. Server actions (App Router POST endpoints that live under page URLs) never pass through it, so they skip `applyCsrfProtection`.

**Attack Vector**: A malicious site could craft a form that POSTs to a server action URL. Since server actions don't go through proxy.ts, no CSRF validation occurred:

```html
<!-- Attacker's site -->
<form action="https://nettrailers.app/settings/preferences" method="POST">
    <input type="hidden" name="enabled" value="false" />
    <button>Click for prize!</button>
</form>
<!-- Victim's browser sends cookies, server action executes -->
```

**Why This Was Dangerous**: The `toggleChildSafetyAction` server action could be triggered by a forged POST from another site, allowing attackers to disable child safety mode for logged-in users.

**How We Fixed It**: Added `validateServerActionOrigin()` function to `lib/csrfProtection.ts:198-225` that validates Origin/Referer headers directly in server actions. The function uses the same exact origin matching logic as the proxy.

```typescript
// lib/actions/childSafety.ts
import { headers } from 'next/headers'
import { validateServerActionOrigin } from '../csrfProtection'

export async function toggleChildSafetyAction(enabled: boolean): Promise<void> {
    const headersList = await headers()
    if (!validateServerActionOrigin(headersList)) {
        throw new Error('CSRF validation failed')
    }
    await setChildSafetyModeCookie(enabled)
}
```

**Why This Works**: Server actions receive the same Origin/Referer headers as regular requests. By validating these headers at the start of the action, cross-origin requests are rejected before any state changes occur. The attacker's forged request from `https://evil.com` will have `Origin: https://evil.com`, which fails validation.

**Pattern for New Server Actions**: Any new state-changing server action must:

1. Import `headers` from `next/headers`
2. Import `validateServerActionOrigin` from `lib/csrfProtection`
3. Call validation at the start of the action and throw if it fails

---

### 2. CRON_SECRET disables CSRF for all routes (Medium) - ✅ FIXED

**Original Problem**: `applyCsrfProtection` in `lib/csrfProtection.ts` treated any request bearing the `CRON_SECRET` as "server-to-server" and bypassed CSRF for all routes, not just cron endpoints.

**Attack Vector**: If CRON_SECRET leaked (logs, preview builds, third-party integrations), an attacker could bypass CSRF on ANY endpoint:

```javascript
// Attacker uses leaked CRON_SECRET to bypass CSRF on password reset
fetch('https://nettrailers.app/api/auth/reset-password', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LEAKED_CRON_SECRET}` },
    body: JSON.stringify({ email: 'victim@example.com' }),
})
// CSRF bypassed! Password reset proceeds.
```

**Why This Was Dangerous**: A single leaked secret could compromise the entire application's CSRF protection, not just cron jobs.

**How We Fixed It**: CRON_SECRET bypass is now handled in `proxy.ts:55-72` and restricted to `/api/cron/*` routes only. The check happens BEFORE calling `applyCsrfProtection`, and non-cron routes never see the CRON_SECRET bypass:

```typescript
// proxy.ts:55-72
const isCronRoute = pathname.startsWith('/api/cron/')

if (isCronRoute) {
    // Cron routes MUST have valid CRON_SECRET
    if (!hasCronSecret(request)) {
        return NextResponse.json(
            { error: 'Unauthorized - valid CRON_SECRET required' },
            { status: 401 }
        )
    }
    // Valid CRON_SECRET - skip CSRF check (cron routes only)
} else {
    // All other routes go through CSRF protection
    const csrfResponse = applyCsrfProtection(request)
    if (csrfResponse) return csrfResponse
}
```

**Why This Works**:

- Cron routes (`/api/cron/*`) require valid CRON_SECRET and skip Origin-based CSRF (appropriate for server-to-server calls)
- All other routes go through standard CSRF validation regardless of any Authorization header
- Even if CRON_SECRET leaks, it only works on `/api/cron/*` endpoints, limiting blast radius

---

### 3. GET-based unsubscribe state change (Medium) - ✅ FIXED

**Original Problem**: `/api/email/unsubscribe` used GET to perform state changes (disabling notifications). GET requests bypass CSRF protection in proxy.ts.

**Attack Vectors**:

- Email scanners pre-fetching links
- Slack/Discord link previews
- Browser `<link rel="prefetch">`
- Compromised email access

**How We Fixed It**: Converted to POST-with-confirmation-page pattern:

1. GET redirects to `/unsubscribe?token=xxx` confirmation page
2. User must click "Unsubscribe" button
3. Button sends POST to `/api/email/unsubscribe` (CSRF protected)

**Files Changed**:

- `app/api/email/unsubscribe/route.ts` - GET redirects, POST performs action
- `app/unsubscribe/page.tsx` - New confirmation page

---

### 4. No regression tests (Low) - ✅ FIXED

**Original Problem**: `__tests__` contained no coverage for CSRF protection logic.

**How We Fixed It**: Added comprehensive test suites:

| Test File                                     | Coverage                                          |
| --------------------------------------------- | ------------------------------------------------- |
| `__tests__/lib/csrfProtection.test.ts`        | 23 tests for origin validation, CSRF application  |
| `__tests__/proxy.test.ts`                     | 29 tests for cron auth, size limits, content-type |
| `__tests__/security/serverActionCsrf.test.ts` | 3 tests for server action lint guard              |

**Test Coverage**:

- `validateOrigin()` - Allowed origins, spoofed origins, subdomain attacks, prefix attacks
- `applyCsrfProtection()` - Safe methods skip, state-changing methods protected
- `validateServerActionOrigin()` - Headers object validation
- `proxy.ts` - CRON_SECRET validation, request size limits, content-type validation

---

### 5. No server action lint guard (Low) - ✅ FIXED

**Original Problem**: New server actions could be added without CSRF protection, with no automated detection.

**How We Fixed It**: Added `__tests__/security/serverActionCsrf.test.ts` that:

1. Scans `lib/actions/**/*.ts` for `'use server'` directive
2. Verifies `validateServerActionOrigin` is imported and called
3. Fails with clear fix instructions if violations found

**Why This Helps**: CI/CD will catch missing CSRF protection before code reaches production.

---

### 6. GET-based share view increment (Low) - ✅ FIXED

**Original Problem**: `/api/shares/[shareId]` GET handler called `incrementViewCount()`, a write operation. Since GET requests bypass CSRF checks, anyone could inflate view counts via img tags or prefetch.

**How We Fixed It**: Split into separate handlers:

- GET: Read-only, returns share data without incrementing views
- POST: Tracks views (CSRF protected by proxy.ts)
- Client calls POST after successful GET to track views

**Files Changed**:

- `app/api/shares/[shareId]/route.ts` - Added POST handler
- `app/shared/[shareId]/page.tsx` - Calls POST to track views

---

### 7. Lint guard only scans lib/actions (Low) - ✅ FIXED

**Original Problem**: Server action lint guard only searched `lib/actions/**/*.ts`. Server actions could be defined elsewhere (app/\*\*, components/\*\*) and bypass detection.

**How We Fixed It**: Expanded `__tests__/security/serverActionCsrf.test.ts` to:

1. Scan entire codebase: `{app,lib,components}/**/*.{ts,tsx}`
2. Smart detection: distinguishes state-changing actions from redirects/page renders
3. Exemptions: `@csrf-exempt` comment, redirect-only files, page components

**Example Exempted File**: `app/community/threads/[id]/page.tsx` uses `'use server'` but only contains a redirect, so it's correctly exempted.

---

### 8. No route handler location guard (Low) - ✅ FIXED

**Original Problem**: Route handlers (`route.ts`) with POST/PUT/DELETE/PATCH could be created outside `/api/*`, bypassing proxy.ts CSRF protection.

**How We Fixed It**: Added `__tests__/security/routeHandlerCsrf.test.ts` that:

1. Scans all `app/**/route.ts` files
2. Flags any with mutation methods that aren't under `app/api/`
3. Exemption via `@non-api-route-allowed` comment (requires manual CSRF)

**Why This Helps**: Prevents accidentally creating unprotected mutation routes.

---

## Questions Resolved

1. **How should server actions satisfy CSRF requirements?**
    - **Answer**: Server actions call `validateServerActionOrigin()` directly at the start of the action using `headers()` from `next/headers`. This is simpler than modifying the proxy matcher since server actions don't route through proxy.ts.

2. **Is there a legitimate case for using CRON_SECRET outside `/api/cron/*`?**
    - **Answer**: No. CRON_SECRET is now restricted to cron routes only. Other server-to-server integrations should use their own authentication mechanism.

---

## Files Changed

| File                                          | Change                                                     |
| --------------------------------------------- | ---------------------------------------------------------- |
| `lib/csrfProtection.ts`                       | Added `validateServerActionOrigin()` for server actions    |
| `lib/actions/childSafety.ts`                  | Added CSRF validation using `validateServerActionOrigin()` |
| `proxy.ts`                                    | CRON_SECRET bypass restricted to `/api/cron/*` only        |
| `app/api/email/unsubscribe/route.ts`          | GET redirects to confirmation, POST performs unsubscribe   |
| `app/unsubscribe/page.tsx`                    | New confirmation page for unsubscribe                      |
| `app/api/shares/[shareId]/route.ts`           | GET read-only, POST tracks views (CSRF protected)          |
| `app/shared/[shareId]/page.tsx`               | Calls POST to track views                                  |
| `__tests__/lib/csrfProtection.test.ts`        | 23 unit tests for CSRF protection                          |
| `__tests__/proxy.test.ts`                     | 29 integration tests for proxy                             |
| `__tests__/security/serverActionCsrf.test.ts` | 8 tests: lint guard for server action CSRF (whole repo)    |
| `__tests__/security/routeHandlerCsrf.test.ts` | 3 tests: lint guard for route handler locations            |
| `CONTRIBUTING.md`                             | Security guidelines for contributors                       |

---

## Verification

```bash
# Run all security tests (63 total)
npm test -- --testPathPatterns="csrf|proxy|serverAction|routeHandler"
# Expected: 63 tests pass (23 + 29 + 8 + 3)

# Confirm server action has CSRF protection
grep -n "validateServerActionOrigin" lib/actions/childSafety.ts
# Expected: Import and usage

# Confirm unsubscribe uses POST for state change
grep -n "export async function POST" app/api/email/unsubscribe/route.ts
# Expected: POST handler exists

# Confirm shares uses POST for view tracking
grep -n "export async function POST" "app/api/shares/[shareId]/route.ts"
# Expected: POST handler exists

# Lint guards catch missing protection
npm test -- --testPathPatterns="serverActionCsrf|routeHandlerCsrf"
# Expected: All tests pass

# Build passes
npm run build
# Expected: Success
```
