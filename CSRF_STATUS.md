# CSRF Middleware – Status Update

## Status: FIXED (2025-11-29)

The CSRF bypass vulnerabilities have been fixed.

## What Was Fixed

### 1. Removed `eyJ` JWT Bypass

The `eyJ` JWT bypass in `isServerToServerCall()` has been **removed**. The function now only trusts verified `CRON_SECRET`.

### 2. Fixed Origin Prefix Matching Bypass

**Problem**: Origin validation used `startsWith`, allowing attackers to bypass with:

- `https://nettrailers.app.attacker.com`

**Fix**: Now uses exact origin matching via `new URL().origin`:

```typescript
function parseOrigin(urlString: string): string | null {
    try {
        const url = new URL(urlString)
        return url.origin // Returns exact scheme + host + port
    } catch {
        return null
    }
}

// Comparison is now exact match, not prefix
if (parsedOrigin && normalizedAllowedOrigins.includes(parsedOrigin)) {
    return true
}
```

### 3. Tightened Cron Route Exemption

**Problem**: Any route under `/api/cron/` was exempt from CSRF without verification.

**Fix**: Cron routes now **MUST** have valid CRON_SECRET:

```typescript
if (isCronRoute) {
    // Cron routes MUST have valid CRON_SECRET
    if (!hasCronSecret(request)) {
        return NextResponse.json(
            { error: 'Unauthorized - valid CRON_SECRET required' },
            { status: 401 }
        )
    }
    // Valid CRON_SECRET - skip CSRF check
}
```

## Verification

```bash
# Confirm no eyJ check exists
grep -n "eyJ" lib/csrfProtection.ts
# Returns: No matches

# Confirm exact origin matching
grep -n "parseOrigin" lib/csrfProtection.ts
# Returns: parseOrigin function and usage

# Confirm cron routes require secret
grep -n "hasCronSecret" proxy.ts
# Returns: validation check
```

### 4. Server Action CSRF Protection

**Problem**: Server actions (App Router) don't go through `proxy.ts`, bypassing CSRF protection.

**Fix**: Added `validateServerActionOrigin()` function and applied it directly in server actions:

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

## How CSRF Works Now

1. **API routes** (POST/PUT/DELETE/PATCH to `/api/*`) go through `proxy.ts`
2. **Cron routes** (`/api/cron/*`) MUST have valid CRON_SECRET or get 401
3. **All other API routes** go through `applyCsrfProtection()` in proxy
4. **Server actions** call `validateServerActionOrigin()` directly
5. **Origin validation** uses exact matching (scheme + host + port)
6. **Fake JWT attack**: `Authorization: Bearer eyJfake` does NOT bypass CSRF
7. **Domain spoofing**: `https://allowed.com.attacker.com` does NOT bypass CSRF

## Files Changed

- `lib/csrfProtection.ts` - Removed `eyJ` bypass, exact origin matching, added `validateServerActionOrigin()`
- `lib/actions/childSafety.ts` - Added CSRF validation for server action
- `proxy.ts` - Global CSRF protection, mandatory CRON_SECRET for cron routes
- 13 API route files - Removed redundant per-route CSRF checks

## References

- `docs/security/SECURITY-ASSESSMENT-2025-11-29.md` - Full security assessment
- `CLAUDE.md` - API Security section documents CSRF protection
- `docs/reference/NEXTJS_PROXY_REFERENCE.md` - Next.js 16+ proxy documentation (middleware → proxy migration)

## Next.js 16+ Note

In Next.js 16+, `middleware.ts` was renamed to `proxy.ts`. If an LLM or documentation references "middleware", the equivalent in this project is `proxy.ts`. See the official docs:

- https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- https://nextjs.org/docs/app/guides/upgrading/version-16
