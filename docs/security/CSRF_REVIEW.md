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

**Problem**: The proxy (`proxy.ts:45-124`) only guards `/api/*` paths. Server actions (App Router POST endpoints that live under page URLs) never pass through it, so they skip `applyCsrfProtection`.

**Example**: `toggleChildSafetyAction` (`lib/actions/childSafety.ts`) - The client settings page (`app/settings/preferences/page.tsx`) calls this action when toggling child safety mode.

**Fix Applied**: Added `validateServerActionOrigin()` function to `lib/csrfProtection.ts` and applied it directly in the server action:

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

**Pattern for New Server Actions**: Any new state-changing server action must:

1. Import `headers` from `next/headers`
2. Import `validateServerActionOrigin` from `lib/csrfProtection`
3. Call validation at the start of the action and throw if it fails

---

### 2. CRON_SECRET disables CSRF for all routes (Medium) - ✅ FIXED

**Problem**: `applyCsrfProtection` treated any request bearing the `CRON_SECRET` as "server-to-server" and bypassed CSRF for all routes.

**Fix Applied**: CRON_SECRET bypass is now restricted to `/api/cron/*` routes only in `proxy.ts`:

```typescript
// proxy.ts
if (isCronRoute) {
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

---

### 3. No regression tests (Low) - ⏳ Open

**Problem**: `__tests__` contains no coverage for `parseOrigin`, `validateOrigin`, `validateServerActionOrigin`, or proxy enforcement.

**Recommended Tests**:

- `parseOrigin`: Verify exact origin extraction (scheme + host + port)
- `validateOrigin` / `validateServerActionOrigin`: Test allowed vs rejected origins
- Proxy behavior: CRON_SECRET required for `/api/cron/*`, rejected elsewhere
- Server action protection: Origin validation throws on invalid origins

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
# Expected: Import and usage

# Confirm validateServerActionOrigin exists
grep -n "validateServerActionOrigin" lib/csrfProtection.ts
# Expected: Function definition

# Confirm CRON_SECRET restricted to cron routes
grep -n "isCronRoute" proxy.ts
# Expected: Conditional check before CRON_SECRET validation
```
