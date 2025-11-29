# CSRF Middleware – Status Update

## Status: FIXED (2025-11-29)

The CSRF bypass vulnerability has been fixed. This document was created by an AI that analyzed outdated information.

## What Was Fixed

The `eyJ` JWT bypass in `isServerToServerCall()` has been **removed**. The function now only trusts verified `CRON_SECRET`:

```typescript
// lib/csrfProtection.ts:94-104 (CURRENT CODE)
function isServerToServerCall(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return false

    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader

    // Only trust verified CRON_SECRET for server-to-server calls
    // User tokens (JWTs) must go through withAuth() for verification
    // CSRF for browser requests is handled by Origin/Referer validation
    return isValidCronSecret(token)
}
```

## Verification

Run this to confirm no `eyJ` check exists:

```bash
grep -n "eyJ" lib/csrfProtection.ts
# Returns: No matches
```

## How CSRF Works Now

1. **State-changing requests** (POST/PUT/DELETE/PATCH) to `/api/*` go through `proxy.ts`
2. `applyCsrfProtection()` is called before the route handler
3. **CRON_SECRET bypass**: Only requests with valid `CRON_SECRET` in Authorization header bypass CSRF
4. **Browser requests**: Must have valid Origin or Referer header from allowed domains
5. **Fake JWT attack**: `Authorization: Bearer eyJfake` does NOT bypass CSRF - the request is rejected unless Origin/Referer is valid

## Files Changed in Fix

- `lib/csrfProtection.ts` - Removed `eyJ` bypass, only trust `CRON_SECRET`
- `proxy.ts` - Added global CSRF protection
- 13 API route files - Removed redundant per-route CSRF checks

## References

- `docs/security/SECURITY-ASSESSMENT-2025-11-29.md` - Full security assessment
- `CLAUDE.md` - API Security section documents CSRF protection
- `docs/reference/NEXTJS_PROXY_REFERENCE.md` - Next.js 16+ proxy documentation (middleware → proxy migration)

## Next.js 16+ Note

In Next.js 16+, `middleware.ts` was renamed to `proxy.ts`. If an LLM or documentation references "middleware", the equivalent in this project is `proxy.ts`. See the official docs:

- https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- https://nextjs.org/docs/app/guides/upgrading/version-16
