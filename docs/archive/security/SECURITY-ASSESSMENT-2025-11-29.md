# Security Assessment - November 29, 2025

## Executive Summary

This document outlines 5 security vulnerabilities discovered in the Net Trailers application, ranging from **Critical** to **Medium** severity. Each issue includes a detailed analysis, attack vector, and phased remediation plan.

## Status

| Issue                   | Status    |
| ----------------------- | --------- |
| 1. CSRF Bypass          | **FIXED** |
| 2. Email Token Exposure | Pending   |
| 3. Child Safety Bypass  | Pending   |
| 4. Feedback API SDK     | Pending   |
| 5. Rate Limiting        | Pending   |

---

## Issue 1: CSRF Bypass via Fake Authorization Headers

**Severity: CRITICAL**
**Status: FIXED** (2025-11-29)
**Location:** `lib/csrfProtection.ts:90-108`

### Current Behavior

The `isServerToServerCall()` function bypasses CSRF protection for any request containing an `Authorization` header where the token starts with `eyJ` (base64-encoded JWT header):

```typescript
// lib/csrfProtection.ts:101-105
if (token.startsWith('eyJ')) {
    return true // CSRF bypass - token NOT actually verified here!
}
```

### Attack Vector

1. Attacker creates a malicious website
2. Victim visits the site while logged into Net Trailers
3. Attacker's JavaScript sends a cross-origin POST request:
    ```javascript
    fetch('https://nettrailers.com/api/some-endpoint', {
        method: 'POST',
        headers: { Authorization: 'Bearer eyJfake' },
        body: JSON.stringify({ malicious: 'payload' }),
        credentials: 'include', // Includes victim's cookies
    })
    ```
4. `isServerToServerCall()` returns `true` because token starts with `eyJ`
5. CSRF protection is bypassed before any token validation occurs
6. If the route doesn't require auth (or checks auth after CSRF), the request succeeds

### Affected Routes

- **Unauthenticated routes** that use CSRF protection but don't require auth
- **Routes that check auth after CSRF** - the bypass happens first
- Any route using `applyCsrfProtection()` or `withCsrfProtection()`

### Remediation Plan

#### Phase 1: Immediate Fix (Order of Operations)

Restructure the CSRF bypass to only allow verified tokens:

**Option A: Only bypass after token verification**

- Move CSRF check to occur AFTER `withAuth()` verifies the token
- If `withAuth()` succeeds, CSRF is implicitly trusted (same-origin tokens)

**Option B: Restrict bypass to CRON_SECRET only**

- Remove the `eyJ` check entirely from `isServerToServerCall()`
- Only allow bypass for requests with valid `CRON_SECRET`
- Let `withAuth()` handle all user authentication separately

#### Phase 2: Refactor Middleware Order

- Create a unified `withAuthAndCsrf()` wrapper that:
    1. Verifies the Firebase ID token FIRST
    2. If token is valid, bypass CSRF (authenticated same-origin request)
    3. If no token, apply full CSRF origin/referer validation

#### Phase 3: Add Integration Tests

- Test that fake `eyJ` tokens are rejected
- Test that valid tokens bypass CSRF correctly
- Test that CRON_SECRET bypass still works

### Recommended Fix

```typescript
// lib/csrfProtection.ts - Updated isServerToServerCall()
function isServerToServerCall(request: NextRequest): boolean {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return false

    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader

    // ONLY allow bypass for verified CRON_SECRET
    // User tokens must go through withAuth() for verification
    return isValidCronSecret(token)
}
```

### Fix Applied (2025-11-29)

1. Removed the `eyJ` check from `isServerToServerCall()` - only CRON_SECRET is trusted
2. Added CSRF protection to global `proxy.ts` (Next.js 16+ convention) to protect all API routes automatically
3. Removed per-route CSRF wrappers (13 files cleaned up)
4. **Fixed origin prefix bypass** - Changed from `startsWith` to exact origin matching using `new URL().origin`
5. **Tightened cron exemption** - Cron routes now MUST have valid CRON_SECRET (not just path-based exemption)

**Files changed:**

- `lib/csrfProtection.ts` - Removed eyJ bypass, fixed origin validation to use exact matching
- `proxy.ts` - Added global CSRF protection with mandatory CRON_SECRET validation for cron routes
- 13 API route files - Removed redundant per-route CSRF checks

---

## Issue 2: Email Verification Token Readable by Client

**Severity: HIGH**
**Location:**

- `app/api/auth/send-email-verification/route.ts:78-83`
- `firestore.rules:6-8`

### Current Behavior

1. When email verification is requested, the raw token is stored in the user's document:

    ```typescript
    await db.collection('users').doc(userId).update({
        emailVerificationToken: verificationToken, // Raw token stored!
        emailVerificationTokenExpiry: expiresAt,
        pendingEmailVerification: email,
    })
    ```

2. Firestore rules allow users to read their entire document:
    ```
    allow read: if request.auth != null && request.auth.uid == userId;
    ```

### Attack Vector

1. User A logs in and requests email verification for `victim@example.com`
2. User A reads their own Firestore document via client SDK
3. User A extracts `emailVerificationToken` from the response
4. User A calls `/api/auth/verify-email` with the stolen token
5. User A's account now shows `victim@example.com` as "verified" without email access

This defeats the purpose of email verification entirely.

### Remediation Plan

#### Phase 1: Hash the Stored Token (Immediate)

Store only a hash of the verification token, not the raw token:

```typescript
// In send-email-verification/route.ts
import { createHash } from 'crypto'

const verificationToken = crypto.randomBytes(32).toString('hex')
const tokenHash = createHash('sha256').update(verificationToken).digest('hex')

await db.collection('users').doc(userId).update({
    emailVerificationTokenHash: tokenHash, // Store hash, not raw token
    emailVerificationTokenExpiry: expiresAt,
    pendingEmailVerification: email,
})

// Email still contains the raw token
const verificationUrl = `${appUrl}/auth/verify-email?token=${verificationToken}`
```

```typescript
// In verify-email/route.ts
async function findUserByVerificationToken(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex')
    const snapshot = await db
        .collection('users')
        .where('emailVerificationTokenHash', '==', tokenHash)
        .limit(1)
        .get()
    // ...
}
```

#### Phase 2: Include Email in Token Payload

Embed the email address in the token to prevent email swapping:

```typescript
const payload = { email, nonce: crypto.randomBytes(16).toString('hex') }
const verificationToken = Buffer.from(JSON.stringify(payload)).toString('base64url')
const tokenHash = createHash('sha256').update(verificationToken).digest('hex')
```

At verification time, extract and compare the email from the token.

#### Phase 3: Alternative - Server-Only Collection

Move verification tokens to a separate collection with `allow read: if false`:

```
match /emailVerifications/{docId} {
    allow read: if false;  // Server-only via Admin SDK
    allow write: if false;
}
```

---

## Issue 3: Child Safety Mode is Client-Controlled

**Severity: HIGH**
**Location:**

- `app/api/search/route.ts:30-34`
- `app/api/genres/[type]/[id]/route.ts` (similar pattern)
- All TMDB/AI endpoints

### Current Behavior

Child safety filtering is controlled by a query parameter:

```typescript
const childSafetyMode = searchParams.get('childSafetyMode')
const childSafeMode = childSafetyMode === 'true'

if (childSafeMode) {
    // Apply child-safe filtering
}
```

### Attack Vector

1. Parent enables child safety mode and sets a PIN in the UI
2. Child opens browser DevTools → Network tab
3. Child modifies any API request to include `childSafetyMode=false`
4. Or child directly navigates to: `https://app.com/api/search?query=adult+content&childSafetyMode=false`
5. Server returns unfiltered adult content

The PIN only protects the UI toggle, not the actual API.

### Remediation Plan

#### Phase 1: Server-Side Child Safety Check

Create a utility to derive child safety status from the authenticated user's stored preference:

```typescript
// lib/childSafetyServer.ts
export async function getChildSafetyModeForUser(userId: string): Promise<boolean> {
    if (!userId) return false // Guests default to off

    const db = getAdminDb()
    const userDoc = await db.collection('users').doc(userId).get()
    const data = userDoc.data()

    return data?.childSafetyMode === true
}
```

#### Phase 2: Update API Routes

Modify routes to read child safety from user profile, ignoring client parameter:

```typescript
// app/api/search/route.ts
export async function GET(request: NextRequest) {
    // Get user ID from session cookie or auth header
    const userId = await getSessionUserId(request)

    // Derive child safety from stored preference, NOT query param
    const childSafeMode = userId ? await getChildSafetyModeForUser(userId) : false // Unauthenticated requests: no child safety

    // ... rest of handler
}
```

#### Phase 3: Handle Guest Users

For guest users (localStorage-based):

- Option A: Store child safety preference in an HTTP-only cookie
- Option B: Require authentication for child safety mode
- Option C: Use signed JWT in cookie with child safety claim

#### Phase 4: Audit All Endpoints

Endpoints to update:

- `/api/search`
- `/api/discover`
- `/api/movies/trending`
- `/api/movies/top-rated`
- `/api/tv/trending`
- `/api/tv/top-rated`
- `/api/genres/[type]/[id]`
- `/api/random-content`
- `/api/smart-search`
- `/api/gemini/*`
- `/api/recommendations/*`

---

## Issue 4: Recommendation Feedback API Uses Client SDK

**Severity: MEDIUM**
**Location:** `app/api/recommendations/feedback/route.ts:9, 95-96`

### Current Behavior

The server-side route imports the **client** Firebase SDK:

```typescript
import { db } from '@/firebase' // Client SDK!
import { collection, addDoc, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
```

And uses it to write data:

```typescript
const feedbackCollection = collection(db, 'recommendation_feedback')
await addDoc(feedbackCollection, feedback) // Will fail!
```

### Why This Fails

1. The client SDK (`@/firebase`) is initialized for browser use
2. On the server, it has no user authentication context
3. Firestore rules require `request.auth.uid == userId`:
    ```
    allow create: if request.auth != null
                  && request.resource.data.userId == request.auth.uid
    ```
4. Server requests have `request.auth == null` → every write is rejected

### Observed Behavior

- Phase 2 recommendation feedback is silently failing
- Users think their feedback is recorded, but it's not
- `getDocs()` queries also fail for the same reason

### Remediation Plan

#### Phase 1: Switch to Admin SDK (Immediate Fix)

```typescript
// app/api/recommendations/feedback/route.ts
import { getAdminDb } from '@/lib/firebase-admin' // Admin SDK

async function handlePostFeedback(request: NextRequest, userId: string) {
    const db = getAdminDb() // Use Admin SDK

    // Admin SDK bypasses security rules
    const feedbackRef = db.collection('recommendation_feedback')
    await feedbackRef.add(feedback)

    // ...
}
```

#### Phase 2: Update GET Handler Similarly

```typescript
async function handleGetFeedback(request: NextRequest, userId: string) {
    const db = getAdminDb()

    const snapshot = await db
        .collection('recommendation_feedback')
        .where('userId', '==', userId)
        .where('timestamp', '>=', thirtyDaysAgo)
        .orderBy('timestamp', 'desc')
        .limit(feedbackLimit)
        .get()

    const feedback = snapshot.docs.map((doc) => doc.data())
    // ...
}
```

#### Phase 3: Add Error Monitoring

Add explicit error handling to catch similar SDK misuse:

```typescript
try {
    await feedbackRef.add(feedback)
} catch (error) {
    // Log to Sentry with context
    captureException(error, { extra: { userId, action } })
    throw error
}
```

---

## Issue 5: In-Memory Rate Limiting Ineffective in Production

**Severity: MEDIUM**
**Location:** `lib/apiRateLimiting.ts`, `lib/rateLimiter.ts`

### Current Behavior

Rate limiting uses `MemoryRateLimiter`:

```typescript
export const authLimiter = new MemoryRateLimiter(5, 15 * 60 * 1000)
export const apiLimiter = new MemoryRateLimiter(100, 60 * 1000)
```

The counters are stored in-process memory.

### Why This Fails in Production

1. **Serverless Cold Starts**: Vercel functions spin up fresh instances frequently, resetting all counters
2. **Multi-Region Deployment**: Different regions have separate memory spaces
3. **Horizontal Scaling**: Multiple function instances don't share memory
4. **Instance Recycling**: Functions are recycled after ~10-15 minutes of inactivity

### Practical Impact

- An attacker can make unlimited requests by waiting for cold starts
- Distributed attacks from multiple IPs easily bypass limits
- Auth brute-force protection (5 requests/15 min) is ineffective

### Remediation Plan

#### Phase 1: Document Current Limitations

Add clear documentation that rate limiting is demo-only:

```typescript
/**
 * WARNING: In-memory rate limiting for development/demo only.
 * Production deployments require Redis/KV for persistent counters.
 */
```

#### Phase 2: Add Vercel KV Integration

Vercel KV provides serverless Redis:

```typescript
// lib/rateLimiterKV.ts
import { kv } from '@vercel/kv'

export class KVRateLimiter {
    constructor(
        private limit: number,
        private windowMs: number
    ) {}

    async consume(key: string): Promise<RateLimitStatus> {
        const now = Date.now()
        const windowStart = now - this.windowMs

        // Atomic increment with TTL
        const count = await kv.incr(`ratelimit:${key}`)
        if (count === 1) {
            await kv.expire(`ratelimit:${key}`, Math.ceil(this.windowMs / 1000))
        }

        return {
            allowed: count <= this.limit,
            remaining: Math.max(0, this.limit - count),
            resetAt: now + this.windowMs,
            retryAfterMs: count > this.limit ? this.windowMs : 0,
        }
    }
}
```

#### Phase 3: Sliding Window Implementation

For more accurate rate limiting:

```typescript
// Using Redis sorted sets for sliding window
async consume(key: string): Promise<RateLimitStatus> {
    const now = Date.now()
    const windowStart = now - this.windowMs

    // Remove old entries
    await kv.zremrangebyscore(`ratelimit:${key}`, 0, windowStart)

    // Add current request
    await kv.zadd(`ratelimit:${key}`, { score: now, member: `${now}:${nanoid()}` })

    // Count requests in window
    const count = await kv.zcard(`ratelimit:${key}`)

    // Set TTL
    await kv.expire(`ratelimit:${key}`, Math.ceil(this.windowMs / 1000))

    return {
        allowed: count <= this.limit,
        remaining: Math.max(0, this.limit - count),
        // ...
    }
}
```

#### Phase 4: Fallback Strategy

If KV is unavailable, degrade gracefully:

```typescript
async consume(key: string): Promise<RateLimitStatus> {
    try {
        return await this.kvLimiter.consume(key)
    } catch (error) {
        // Log but don't block requests if rate limiter is down
        console.error('Rate limiter unavailable:', error)
        return { allowed: true, remaining: 999, resetAt: 0, retryAfterMs: 0 }
    }
}
```

---

## Priority Matrix

| Issue                    | Severity | Effort | Priority             |
| ------------------------ | -------- | ------ | -------------------- |
| 1. CSRF Bypass           | Critical | Low    | **P0 - Immediate**   |
| 2. Email Token Exposure  | High     | Medium | **P1 - This Week**   |
| 3. Child Safety Bypass   | High     | Medium | **P1 - This Week**   |
| 4. Feedback SDK Mismatch | Medium   | Low    | **P2 - Next Sprint** |
| 5. Rate Limiting         | Medium   | Medium | **P2 - Next Sprint** |

---

## Recommended Execution Order

### Day 1: Critical Fix

1. Fix CSRF bypass (Issue 1, Phase 1)
2. Deploy and verify

### Days 2-3: High Priority

3. Hash email verification tokens (Issue 2, Phase 1)
4. Implement server-side child safety check (Issue 3, Phases 1-2)
5. Deploy and verify both fixes

### Days 4-5: Medium Priority

6. Fix feedback API SDK usage (Issue 4)
7. Document rate limiting limitations (Issue 5, Phase 1)

### Following Sprint

8. Email token payload enhancement (Issue 2, Phase 2)
9. Audit all child safety endpoints (Issue 3, Phase 4)
10. Implement Vercel KV rate limiting (Issue 5, Phases 2-4)

---

## Testing Checklist

### Issue 1 Tests

- [ ] Fake `eyJ` token is rejected by CSRF
- [ ] Valid Firebase token allows request
- [ ] CRON_SECRET bypass still works
- [ ] Cross-origin requests without valid token are blocked

### Issue 2 Tests

- [ ] Client cannot read verification token from user document
- [ ] Verification with correct token succeeds
- [ ] Verification with wrong email in token fails
- [ ] Token expiry is enforced

### Issue 3 Tests

- [ ] `childSafetyMode=false` query param is ignored
- [ ] Server reads child safety from user profile
- [ ] Adult content is filtered when mode is enabled
- [ ] Unauthenticated requests have no child safety

### Issue 4 Tests

- [ ] Feedback POST successfully writes to Firestore
- [ ] Feedback GET returns user's feedback
- [ ] Errors are logged to Sentry

### Issue 5 Tests

- [ ] Rate limiting persists across cold starts (with KV)
- [ ] Limits are enforced across regions
- [ ] Graceful degradation when KV unavailable

---

## References

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
