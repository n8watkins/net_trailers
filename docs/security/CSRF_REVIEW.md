# CSRF Review

## Status Summary

| Finding                                  | Severity | Status   |
| ---------------------------------------- | -------- | -------- |
| Server actions bypass CSRF               | High     | ✅ FIXED |
| CRON_SECRET disables CSRF for all routes | Medium   | ✅ FIXED |
| No regression tests                      | Low      | ⏳ Open  |

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

### 3. No regression tests (Low) - ⏳ Open

**Problem**: `__tests__` contains no coverage for `parseOrigin`, `validateOrigin`, `validateServerActionOrigin`, or proxy enforcement.

**Risk**: Without tests, future refactors could reintroduce vulnerabilities without detection.

**Recommended Tests**:

| Test Target                    | Test Cases                                                   |
| ------------------------------ | ------------------------------------------------------------ |
| `parseOrigin()`                | Valid URLs return exact origin; invalid URLs return null     |
| `validateOrigin()`             | Allowed origins pass; attacker domains (prefix attacks) fail |
| `validateServerActionOrigin()` | Same validation logic with Headers object                    |
| `proxy.ts` CRON routes         | Valid CRON_SECRET passes; missing/invalid returns 401        |
| `proxy.ts` non-cron routes     | CSRF validation applied; CRON_SECRET ignored                 |

---

## Questions Resolved

1. **How should server actions satisfy CSRF requirements?**
    - **Answer**: Server actions call `validateServerActionOrigin()` directly at the start of the action using `headers()` from `next/headers`. This is simpler than modifying the proxy matcher since server actions don't route through proxy.ts.

2. **Is there a legitimate case for using CRON_SECRET outside `/api/cron/*`?**
    - **Answer**: No. CRON_SECRET is now restricted to cron routes only. Other server-to-server integrations should use their own authentication mechanism.

---

## Files Changed

| File                         | Change                                                     |
| ---------------------------- | ---------------------------------------------------------- |
| `lib/csrfProtection.ts`      | Added `validateServerActionOrigin()` for server actions    |
| `lib/actions/childSafety.ts` | Added CSRF validation using `validateServerActionOrigin()` |
| `proxy.ts`                   | CRON_SECRET bypass restricted to `/api/cron/*` only        |

---

## Verification

```bash
# Confirm server action has CSRF protection
grep -n "validateServerActionOrigin" lib/actions/childSafety.ts
# Expected: Import and usage on lines 12, 22

# Confirm validateServerActionOrigin exists
grep -n "validateServerActionOrigin" lib/csrfProtection.ts
# Expected: Function definition at line 198

# Confirm CRON_SECRET restricted to cron routes
grep -n "isCronRoute" proxy.ts
# Expected: Conditional check at line 55

# Build passes
npm run build
# Expected: Success
```
