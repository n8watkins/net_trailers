# CRON Secret Scope Audit

## Status: ✅ FIXED (2025-11-29)

The CRON_SECRET bypass has been removed from `applyCsrfProtection()`. CRON_SECRET now only works for `/api/cron/*` routes via `proxy.ts`.

---

## Original Problem

`docs/security/CSRF_REVIEW.md` marked the CRON_SECRET bypass as fixed by limiting the check to `/api/cron/*` inside `proxy.ts`. However, the legacy bypass still lived in `applyCsrfProtection()` (`lib/csrfProtection.ts`), so any API route that used the proxy still skipped CSRF whenever the `Authorization` header contained the secret.

**Attack Vector**: A leaked CRON_SECRET could disable CSRF on **all** POST/PUT/DELETE endpoints, not just cron jobs:

```javascript
// Attacker uses leaked CRON_SECRET on non-cron endpoint
fetch('https://nettrailers.app/api/auth/reset-password', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LEAKED_CRON_SECRET}` },
    body: JSON.stringify({ email: 'victim@example.com' }),
})
// CSRF bypassed on password reset!
```

---

## How We Fixed It

1. **Removed `isServerToServerCall()` from `applyCsrfProtection()`** - The function no longer checks for CRON_SECRET at all.

2. **Removed dead code** - Deleted `isServerToServerCall()`, `isValidCronSecret()`, and `CRON_SECRET` constant from `lib/csrfProtection.ts` since they're no longer needed.

3. **CRON_SECRET handling is now ONLY in `proxy.ts`** - The secret is validated using timing-safe comparison only for `/api/cron/*` routes.

**Before (vulnerable):**

```
Request to /api/auth/reset-password with CRON_SECRET
    → proxy.ts: not a cron route, calls applyCsrfProtection()
    → applyCsrfProtection(): sees CRON_SECRET, bypasses CSRF ❌
```

**After (fixed):**

```
Request to /api/auth/reset-password with CRON_SECRET
    → proxy.ts: not a cron route, calls applyCsrfProtection()
    → applyCsrfProtection(): ignores CRON_SECRET, validates Origin/Referer ✅
```

---

## Files Changed

| File                    | Change                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------- |
| `lib/csrfProtection.ts` | Removed `isServerToServerCall()`, `isValidCronSecret()`, `CRON_SECRET`, and crypto import |
| `proxy.ts`              | No change - already handles CRON_SECRET correctly for `/api/cron/*` only                  |

---

## Verification

```bash
# Confirm isServerToServerCall is gone
grep -n "isServerToServerCall" lib/csrfProtection.ts
# Expected: No matches

# Confirm isValidCronSecret is gone
grep -n "isValidCronSecret" lib/csrfProtection.ts
# Expected: No matches

# Confirm CRON_SECRET not referenced
grep -n "CRON_SECRET" lib/csrfProtection.ts
# Expected: Only in comments explaining it's handled in proxy.ts

# Confirm proxy.ts still validates cron routes
grep -n "hasCronSecret\|isCronRoute" proxy.ts
# Expected: Both present for cron route handling

# Build passes
npm run build
# Expected: Success
```

---

## Action Items

| Task                                                              | Owner    | Status  |
| ----------------------------------------------------------------- | -------- | ------- |
| Drop `isServerToServerCall()` bypass from `applyCsrfProtection()` | Security | ✅ DONE |
| Confirm cron routes continue to work via `proxy.ts` secret check  | Platform | ✅ DONE |
| Add Jest tests for CSRF helpers and proxy behavior                | QA       | ⏳ Open |
