# CSRF Protection Status

**Last Updated:** November 29, 2025
**Status:** All CSRF vulnerabilities remediated

---

## Current Architecture

```
Incoming Request to /api/*
          │
          ▼
┌─────────────────────────────────────┐
│           proxy.ts                   │
│  (Next.js 16+ global middleware)     │
├─────────────────────────────────────┤
│ Is /api/cron/* route?               │
│   YES → Require CRON_SECRET         │
│   NO  → Continue to CSRF check      │
├─────────────────────────────────────┤
│ Is safe method (GET/HEAD/OPTIONS)?  │
│   YES → Pass through                │
│   NO  → Validate Origin/Referer     │
├─────────────────────────────────────┤
│ Additional checks:                   │
│   • Request body size limits        │
│   • Content-Type validation         │
└─────────────────────────────────────┘
```

---

## Protection Layers

### Layer 1: Global Proxy (`proxy.ts`)

All `/api/*` requests pass through the proxy which:

- **Validates Origin/Referer** on POST/PUT/DELETE/PATCH requests
- **Requires CRON_SECRET** for `/api/cron/*` routes (all HTTP methods)
- **Enforces size limits** (500KB JSON, 1MB other)
- **Validates Content-Type** for POST/PUT/PATCH

### Layer 2: Origin Validation (`lib/csrfProtection.ts`)

- **Exact origin matching** using `new URL().origin`
- **Prevents subdomain attacks** (`https://app.attacker.com` blocked)
- **Prevents prefix attacks** (`https://allowed.com.evil.com` blocked)
- **Rejects null origin** (file:// form submissions)

### Layer 3: Server Action Protection

Server actions bypass `proxy.ts`, so they must call `validateServerActionOrigin()`:

```typescript
// lib/actions/childSafety.ts
export async function toggleChildSafetyAction(enabled: boolean): Promise<void> {
    const headersList = await headers()
    if (!validateServerActionOrigin(headersList)) {
        throw new Error('CSRF validation failed')
    }
    await setChildSafetyModeCookie(enabled)
}
```

### Layer 4: Automated Guards

| Test File                                     | Purpose                                  |
| --------------------------------------------- | ---------------------------------------- |
| `__tests__/lib/csrfProtection.test.ts`        | Origin validation, CSRF application      |
| `__tests__/proxy.test.ts`                     | Proxy middleware, cron auth, size limits |
| `__tests__/security/serverActionCsrf.test.ts` | Lint guard for server actions            |
| `__tests__/security/routeHandlerCsrf.test.ts` | Route handler location guard             |

---

## Key Files

| File                         | Purpose                                       |
| ---------------------------- | --------------------------------------------- |
| `proxy.ts`                   | Global CSRF enforcement for `/api/*`          |
| `lib/csrfProtection.ts`      | Origin validation logic, server action helper |
| `lib/actions/childSafety.ts` | Example server action with CSRF protection    |

---

## Route Protection Summary

### Authenticated Routes (11 routes using `withAuth`)

Protected by both CSRF (proxy) and Firebase ID token verification:

- `/api/shares/create`, `/api/shares/[shareId]`, `/api/shares/user`
- `/api/recommendations/personalized`, `/api/recommendations/feedback`
- `/api/collections/duplicate`, `/api/generate-collection-name`
- `/api/email/send-pilot`, `/api/auth/send-email-verification`
- `/api/generate-ranking-content`, `/api/shares/[shareId]/toggle`

### Admin Routes (6 routes using `validateAdminRequest`)

Protected by CSRF + Firebase Auth + admin UID check:

- `/api/admin/activity`, `/api/admin/init-stats`, `/api/admin/reset-demo`
- `/api/admin/trending-stats`, `/api/admin/users`, `/api/admin/check`

### Cron Routes (CRON_SECRET required)

- `/api/cron/update-trending` - Uses CRON_SECRET OR admin auth

### Public POST Routes (CSRF protected, no auth required)

- `/api/auth/send-password-reset` - Rate limited
- `/api/auth/reset-password` - Token validated
- `/api/auth/verify-email` - Token validated
- `/api/gemini/analyze` - Rate limited
- `/api/smart-suggestions/*` - Rate limited
- `/api/ai-suggestions` - Rate limited
- `/api/email/unsubscribe` - Token validated
- `/api/shares/[shareId]` (POST) - View tracking

---

## Verification

```bash
# Run all CSRF tests (63 total)
npm test -- --testPathPatterns="csrf|proxy|serverAction|routeHandler"

# Verify no eyJ bypass exists
grep -n "eyJ" lib/csrfProtection.ts
# Expected: No matches

# Verify exact origin matching
grep -n "parseOrigin" lib/csrfProtection.ts
# Expected: Function definition and usage

# Verify cron routes require CRON_SECRET
grep -n "hasCronSecret" proxy.ts
# Expected: Validation in proxy function
```

---

## Adding New Routes

### For API Routes (`app/api/**/route.ts`)

1. Place under `app/api/` to get automatic CSRF protection
2. Use `withAuth()` if authentication required
3. No manual CSRF code needed - proxy handles it

### For Server Actions (`'use server'` files)

1. Import `validateServerActionOrigin` from `lib/csrfProtection`
2. Call validation at the start of state-changing functions:

```typescript
'use server'
import { headers } from 'next/headers'
import { validateServerActionOrigin } from '@/lib/csrfProtection'

export async function myAction(data: any) {
    const headersList = await headers()
    if (!validateServerActionOrigin(headersList)) {
        throw new Error('CSRF validation failed')
    }
    // ... action logic
}
```

---

## Related Documentation

- `SECURITY_CHANGELOG.md` - Evolution of security fixes
- `CRON_SECRET_SCOPE.md` - CRON_SECRET usage guidelines
