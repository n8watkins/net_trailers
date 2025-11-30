# CSRF Security Fix Changelog - November 29, 2025

## Summary

Comprehensive CSRF protection overhaul addressing three critical/high vulnerabilities discovered during security audit.

---

## Vulnerabilities Fixed

### 1. JWT Token Bypass (Critical)

**Location:** `lib/csrfProtection.ts:90-108`

**Problem:** The `isServerToServerCall()` function bypassed CSRF for any request with an Authorization header starting with `eyJ` (base64 JWT prefix), without verifying the token.

**Attack Vector:**

```javascript
fetch('/api/endpoint', {
    method: 'POST',
    headers: { Authorization: 'Bearer eyJfake' },
    credentials: 'include',
})
// CSRF bypassed - attacker's request succeeds
```

**Fix:** Removed the `eyJ` check entirely. Only verified `CRON_SECRET` can bypass CSRF.

---

### 2. Origin Prefix Matching Bypass (High)

**Location:** `lib/csrfProtection.ts:33-67`

**Problem:** Origin validation used `startsWith()`, allowing attackers to register look-alike domains.

**Attack Vector:**

```
Allowed origin: https://nettrailers.app
Attacker domain: https://nettrailers.app.attacker.com

// startsWith('https://nettrailers.app') returns true!
```

**Fix:** Changed to exact origin matching using `new URL().origin`:

```typescript
function parseOrigin(urlString: string): string | null {
    try {
        const url = new URL(urlString)
        return url.origin // Exact: scheme + host + port
    } catch {
        return null
    }
}

// Now uses exact matching
normalizedAllowedOrigins.includes(parsedOrigin)
```

---

### 3. Overly Broad Path Exemption (Medium)

**Location:** `proxy.ts:16`

**Problem:** All routes under `/api/cron/` were exempt from CSRF without any authentication.

**Attack Vector:**

```
Any new route at /api/cron/anything would be CSRF-vulnerable
if developer forgot to add authentication
```

**Fix:** Cron routes now **require** valid CRON_SECRET in the proxy:

```typescript
if (isCronRoute) {
    if (!hasCronSecret(request)) {
        return NextResponse.json(
            { error: 'Unauthorized - valid CRON_SECRET required' },
            { status: 401 }
        )
    }
}
```

---

## Files Changed

### Modified Files

| File                    | Changes                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| `lib/csrfProtection.ts` | Removed `eyJ` bypass, added `parseOrigin()` for exact matching   |
| `proxy.ts`              | Added `hasCronSecret()` validation, removed path-based exemption |

### Removed CSRF from Routes (Now Handled Globally)

1. `app/api/auth/verify-email/route.ts`
2. `app/api/auth/reset-password/route.ts`
3. `app/api/auth/send-password-reset/route.ts`
4. `app/api/auth/record-signup/route.ts`
5. `app/api/gemini/analyze/route.ts`
6. `app/api/smart-suggestions/route.ts`
7. `app/api/smart-suggestions/preview/route.ts`
8. `app/api/ai-suggestions/route.ts`
9. `app/api/shares/create/route.ts`
10. `app/api/admin/init-stats/route.ts`
11. `app/api/admin/reset-demo/route.ts`
12. `app/api/forum/send-reply-notification/route.ts`
13. `app/api/recommendations/preference-content/route.ts`

### Documentation Updated

| File                                              | Changes                                               |
| ------------------------------------------------- | ----------------------------------------------------- |
| `CLAUDE.md`                                       | Added CSRF Protection section with proxy.ts reference |
| `CSRF_STATUS.md`                                  | Updated with all three fixes and verification steps   |
| `docs/security/SECURITY-ASSESSMENT-2025-11-29.md` | Marked Issue 1 as FIXED with details                  |
| `docs/reference/NEXTJS_PROXY_REFERENCE.md`        | New file - Next.js 16+ proxy documentation            |

### Other Files

| File                                   | Changes                                                          |
| -------------------------------------- | ---------------------------------------------------------------- |
| `app/changelog/page-static-backup.tsx` | Renamed to `.tsx.bak` (pre-existing build error)                 |
| `constants/tourSteps.ts`               | Added `skippable` property to TourPane (pre-existing type error) |

---

## How CSRF Protection Works Now

```
Incoming POST/PUT/DELETE/PATCH to /api/*
                │
                ▼
┌───────────────────────────────────┐
│ Is it /api/cron/* ?               │
└───────────────────────────────────┘
        │ Yes                │ No
        ▼                    ▼
┌─────────────────┐  ┌─────────────────────────┐
│ Has valid       │  │ applyCsrfProtection()   │
│ CRON_SECRET?    │  │                         │
└─────────────────┘  │ 1. Parse Origin header  │
   │ No      │ Yes   │ 2. Extract exact origin │
   ▼         ▼       │ 3. Compare to allowlist │
┌──────┐  ┌──────┐   └─────────────────────────┘
│ 401  │  │ Pass │            │
└──────┘  └──────┘     Valid? │
                         │ No      │ Yes
                         ▼         ▼
                      ┌──────┐  ┌──────┐
                      │ 403  │  │ Pass │
                      │ CSRF │  └──────┘
                      └──────┘
```

---

## Verification Commands

```bash
# Confirm no eyJ check exists
grep -n "eyJ" lib/csrfProtection.ts
# Expected: No matches

# Confirm exact origin matching
grep -n "parseOrigin" lib/csrfProtection.ts
# Expected: Function definition and usage

# Confirm cron routes require secret
grep -n "hasCronSecret" proxy.ts
# Expected: Validation check in proxy function

# Verify build passes
npm run build
# Expected: Success
```

---

## Testing Checklist

- [x] Fake `eyJ` token is rejected by CSRF
- [x] Valid CRON_SECRET bypasses CSRF for cron routes
- [x] Invalid/missing CRON_SECRET returns 401 for cron routes
- [x] `https://allowed.com.attacker.com` is rejected
- [x] Exact origin `https://allowed.com` is accepted
- [x] Build passes with all changes

---

## References

- [Next.js Proxy Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- `docs/security/SECURITY-ASSESSMENT-2025-11-29.md` - Full security assessment
- `docs/reference/NEXTJS_PROXY_REFERENCE.md` - Next.js 16+ proxy reference
