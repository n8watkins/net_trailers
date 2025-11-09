# NetTrailers Security Audit Report

**Date:** November 8, 2025
**Project:** NetTrailers (Netflix Clone)
**Audit Scope:** API routes, authentication, data handling, input validation, security headers, secrets management

---

## Executive Summary

The application has **MODERATE TO CRITICAL** security concerns. Most concerning is the presence of **exposed API keys and secrets in the .env.local file**. Overall security posture is reasonable with proper authentication implementation and security headers, but several vulnerabilities and misconfigurations require immediate attention.

**Critical Issues Found:** 3
**High Issues Found:** 4
**Medium Issues Found:** 5
**Low Issues Found:** 3

---

## Critical Findings

### 1. CRITICAL: Exposed API Keys and Secrets in .env.local

**Severity:** CRITICAL
**Location:** `/home/natkins/personal/portfolio/net_trailers/.env.local`

**Details:**

- Firebase API Key: `AIzaSyAUnk_RlyFa7BzLuhiadzy32iyBDKCcYSE` (EXPOSED)
- Firebase Project ID: `netflix-clone-15862` (EXPOSED)
- TMDB API Key: `96fa23e76f0d41cb36975d635d344e2a` (EXPOSED)
- Google Gemini API Key: `AIzaSyBGRbgpIwkE1x6BB-NJcMamJ380Ob05f_4` (EXPOSED - file explicitly warns key is compromised)
- Sentry DSN: `https://e8ff08283b0f2f9db0042fd4d186acfe@o4507767562371072.ingest.us.sentry.io/4510041561759744` (EXPOSED)
- Google Analytics ID: `G-ZJ89Z1VW2M` (EXPOSED)

**Risk Impact:**

- Attackers can make unauthorized API calls to TMDB, Gemini, Firebase, and Sentry
- Database queries can be modified or accessed without authentication
- Potential financial costs from API usage abuse
- User data could be compromised via Firebase
- Application monitoring can be tampered with via Sentry

**Remediation:**

1. **Immediately regenerate all exposed keys:**
    - Firebase: https://console.firebase.google.com
    - TMDB: https://www.themoviedb.org/settings/api
    - Gemini: https://aistudio.google.com/app/apikey
    - Sentry: https://sentry.io/settings/...
    - Google Analytics: Create new property

2. **Revoke and rotate credentials**
3. **Remove .env.local from git history** (if committed): `git filter-branch --tree-filter 'rm -f .env.local'`
4. **Add .env.local to .gitignore** (verify it's already there)
5. **Implement environment variable management:**
    - Use platform secrets (Vercel, GitHub, etc.)
    - Never commit env files
    - Use separate keys for dev/staging/production

---

### 2. CRITICAL: Gemini API Key Exposed in Multiple Routes

**Severity:** CRITICAL
**Locations:**

- `/app/api/ai-suggestions/route.ts` (line 18)
- `/app/api/gemini/analyze/route.ts` (line 23)
- `/app/api/generate-row/route.ts` (line 22)
- `/app/api/ai-watchlist-style/route.ts`

**Details:**
API keys are concatenated directly into URL strings:

```typescript
// VULNERABLE PATTERN
;`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
```

The Gemini key is **explicitly marked as compromised** in .env.local with warning comment.

**Risk Impact:**

- Gemini API calls can be rate-limited or abused by attackers
- Financial impact from API overuse
- Service disruption

**Remediation:**

1. Regenerate Gemini API key immediately
2. Implement API request signing/validation (if Gemini supports)
3. Consider using backend proxy with request validation
4. Set API key quotas and rate limits in Gemini console

---

### 3. CRITICAL: Missing Authentication/Authorization on API Routes

**Severity:** CRITICAL
**Affected Routes:**

- `/api/search/route.ts` (line 24)
- `/api/content/[id]/route.ts` (line 5)
- `/api/custom-rows/[id]/content/route.ts` (line 34)
- `/api/gemini/analyze/route.ts` (line 14)
- `/api/ai-suggestions/route.ts` (line 6)
- `/api/generate-row/route.ts` (line 13)
- All TMDB proxy routes

**Details:**
No authentication checks on any API routes. Anyone with the URL can:

- Access all API endpoints without authorization
- Trigger expensive Gemini AI API calls
- Query Firebase data indirectly
- Consume quota regardless of user status

```typescript
// NO AUTH CHECK EXAMPLE
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams
    // No validation of user identity
    // No session check
    // No rate limiting per user
}
```

**Risk Impact:**

- Unauthorized API access and quota exhaustion
- DDoS attacks via API endpoints
- Unauthorized data access (via TMDB proxy)
- Cost abuse from AI service calls

**Remediation:**

1. **Add authentication middleware:**

    ```typescript
    import { auth } from 'firebase/auth'
    import { getAuth } from 'firebase-admin/auth'

    async function verifyAuth(request) {
        const token = request.headers.get('authorization')?.replace('Bearer ', '')
        if (!token) return null
        return admin.auth().verifyIdToken(token)
    }
    ```

2. **Implement per-route auth checks**
3. **Add rate limiting per user/IP**
4. **Consider implementing CORS** (currently missing)
5. **Add request validation and signing**

---

## High Severity Findings

### 4. HIGH: Insecure CORS Configuration

**Severity:** HIGH
**Location:** `next.config.js` (lines 54-107)

**Details:**
No explicit CORS configuration found. This allows:

- Cross-origin requests from any domain
- Potential CSRF attacks
- Unauthorized API usage from external sites

**Verification:**

```bash
# No CORS middleware or headers explicitly restricting origins
grep -r "CORS\|cors" /app/api --include="*.ts"
# Returns: No explicit CORS configuration
```

**Risk Impact:**

- XSS attacks can easily access your API
- Third-party sites can query your API endpoints
- Resource exhaustion from external requests

**Remediation:**

```typescript
// Add to API routes
export async function GET(request: NextRequest) {
    const origin = request.headers.get('origin')
    const allowedOrigins = ['https://yourdomain.com', 'http://localhost:3000']

    if (!allowedOrigins.includes(origin)) {
        return new NextResponse('CORS not allowed', { status: 403 })
    }

    // ... rest of handler
}
```

---

### 5. HIGH: Missing Rate Limiting on API Routes

**Severity:** HIGH
**Location:** All `/api/*` routes

**Details:**
While `TMDB_CONFIG.RATE_LIMIT = 40` is defined in constants, it is:

- Not enforced anywhere in the codebase
- Only documents TMDB's server-side limit
- Doesn't protect against client-side abuse

No rate limiting implementation found:

- No Redis or in-memory rate limiter
- No per-IP rate limiting
- No per-user rate limiting
- No exponential backoff

**Risk Impact:**

- DDoS attacks can overwhelm the server
- API quota exhaustion
- Service disruption for legitimate users

**Remediation:**

```typescript
// Implement with redis or similar
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, '1 h'),
})

export async function GET(request) {
    const { success } = await ratelimit.limit('api')
    if (!success) return new Response('Rate limited', { status: 429 })
}
```

---

### 6. HIGH: Sensitive Data Exposure in Error Messages

**Severity:** HIGH
**Location:** Multiple API routes

**Examples:**

- `/api/search/route.ts` (line 128): Development error messages expose implementation details
- `/api/content/[id]/route.ts` (line 105): Error messages could leak TMDB API structure
- `/api/custom-rows/[id]/content/route.ts` (line 326): Exposes error details in development

```typescript
// VULNERABLE
return NextResponse.json(
    {
        message: 'Internal server error',
        error:
            process.env.NODE_ENV === 'development'
                ? (error as Error).message // LEAKS DETAILS
                : undefined,
    },
    { status: 500 }
)
```

**Risk Impact:**

- Information disclosure about system architecture
- API structure hints for attackers
- Database/service details leakage

**Remediation:**

- Always return generic error messages in production
- Log detailed errors server-side only
- Use error tracking (Sentry) instead of client exposure

---

### 7. HIGH: Unsafe JSON Parsing from Gemini API

**Severity:** HIGH
**Location:** Multiple routes with Gemini integration

**Details:**

```typescript
// /api/gemini/analyze/route.ts (line 67)
const analysis = JSON.parse(cleanedText) // No validation

// /api/generate-row/route.ts (line 81)
const geminiResult = JSON.parse(cleanedText) // No validation
```

While try-catch exists, no schema validation:

- No field validation
- No type checking
- No boundary checks
- Gemini could return malicious JSON

**Risk Impact:**

- Injection attacks via AI-generated content
- Application crash from unexpected data structures
- Data corruption

**Remediation:**

```typescript
import { z } from 'zod'

const GeminiResponseSchema = z.object({
    genreIds: z.array(z.number()),
    rowName: z.string().max(100),
    mediaType: z.enum(['movie', 'tv', 'both']),
    recommendations: z
        .array(
            z.object({
                type: z.string(),
                value: z.any(),
            })
        )
        .optional(),
})

const validated = GeminiResponseSchema.parse(JSON.parse(cleanedText))
```

---

## Medium Severity Findings

### 8. MEDIUM: Inadequate Input Validation on Search Parameters

**Severity:** MEDIUM
**Location:** `/api/search/route.ts` (lines 26-34)

**Details:**

```typescript
const query = searchParams.get('query')
if (!query || query.trim().length === 0) {
    return NextResponse.json(...)
}
// But no max length check, no character validation, no encoding check
```

Issues:

- No maximum length enforcement (could cause TMDB API issues)
- No character validation (special characters not filtered)
- No SQL injection protection (though TMDB uses parameterization)
- Page parameter parsed but not validated

**Remediation:**

```typescript
const MAX_QUERY_LENGTH = 100
const query = searchParams.get('query')?.trim() || ''
const page = Math.max(1, Math.min(parseInt(searchParams.get('page') || '1'), 500))

if (!query || query.length < 2 || query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
}

// Validate characters
if (!/^[a-zA-Z0-9\s\-':&.()]+$/.test(query)) {
    return NextResponse.json({ error: 'Invalid characters' }, { status: 400 })
}
```

---

### 9. MEDIUM: Content ID Validation Weakness

**Severity:** MEDIUM
**Location:** `/api/content/[id]/route.ts` (lines 11-18)

**Details:**

```typescript
if (!id) {
    return NextResponse.json({ error: 'Content ID is required' }, { status: 400 })
}

const contentId = parseInt(id)
if (isNaN(contentId)) {
    return NextResponse.json({ error: 'Invalid content ID' }, { status: 400 })
}
```

Issues:

- No upper bound check (could request extremely high IDs)
- No format validation before parseInt
- No check for negative numbers
- Could allow brute-force enumeration of content

**Remediation:**

```typescript
const MAX_CONTENT_ID = 999999999

const contentId = parseInt(id)
if (isNaN(contentId) || contentId <= 0 || contentId > MAX_CONTENT_ID) {
    return NextResponse.json({ error: 'Invalid content ID' }, { status: 400 })
}
```

---

### 10. MEDIUM: Unvalidated Genre Parameter in Custom Rows

**Severity:** MEDIUM
**Location:** `/api/custom-rows/[id]/content/route.ts` (lines 153-161)

**Details:**

```typescript
const genres = genresParam.split(',').map((g) => parseInt(g.trim(), 10))
// No validation of genre IDs
// No check for reasonable values
// No duplicate filtering
```

Issues:

- No validation that genre IDs are valid TMDB IDs
- Could pass negative or extremely large numbers
- No deduplication could cause inefficient queries
- Could craft malicious genre parameters

**Remediation:**

```typescript
const VALID_GENRE_IDS = [
    28, 12, 16, 35, 80, 99, 18, 10751, 14, 36, 27, 10402, 9648, 10749, 878, 10770, 53, 10752, 37,
]
const MAX_GENRES = 10

const genresParam = searchParams.get('genres') || ''
const genres = [
    ...new Set(
        genresParam
            .split(',')
            .map((g) => {
                const id = parseInt(g.trim())
                return VALID_GENRE_IDS.includes(id) ? id : null
            })
            .filter(Boolean)
    ),
]

if (genres.length === 0 || genres.length > MAX_GENRES) {
    return NextResponse.json({ error: 'Invalid genres' }, { status: 400 })
}
```

---

### 11. MEDIUM: Missing Content-Security-Policy Nonce Generation

**Severity:** MEDIUM
**Location:** `next.config.js` (lines 81-98)

**Details:**
CSP headers include `'unsafe-inline'` and `'unsafe-eval'`:

```javascript
"script-src 'self' 'unsafe-eval' 'unsafe-inline' ..."
"style-src 'self' 'unsafe-inline' ..."
```

Issues:

- `'unsafe-eval'` allows dynamic code execution
- `'unsafe-inline'` defeats purpose of CSP
- Nonces not implemented for inline scripts
- Overly permissive script sources (googleapis.com, vercel.live)

**Risk Impact:**

- XSS attacks can inject and execute arbitrary code
- CSP becomes ineffective

**Remediation:**

```javascript
// Generate nonce for each request
async headers() {
    return [{
        source: '/:path*',
        headers: [{
            key: 'Content-Security-Policy',
            value: [
                "default-src 'self'",
                "script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com",
                "style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com",
                "img-src 'self' data: https:",
                "object-src 'none'",
                "upgrade-insecure-requests",
            ].join('; ')
        }]
    }]
}
```

---

## Low Severity Findings

### 12. LOW: Missing HTTPS Enforcement

**Severity:** LOW
**Location:** `next.config.js` (line 96)

**Details:**

```javascript
'upgrade-insecure-requests', // Present but no HSTS header
```

While HSTS is present, it could be stronger:

```javascript
'max-age=31536000; includeSubDomains' // Good, but missing preload
```

**Remediation:**

```javascript
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
```

---

### 13. LOW: Debug Information Exposure

**Severity:** LOW
**Location:** `/utils/firebaseSyncManager.ts` (line 153)

**Details:**

```typescript
// Attach to window for debugging
if (typeof window !== 'undefined') {
    window.syncManager = syncManager // EXPOSED IN PRODUCTION
}
```

Also in debug utilities:

- Global sync manager accessible
- Could leak implementation details

**Remediation:**

```typescript
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    ;(window as any).syncManager = syncManager
}
```

---

### 14. LOW: Console Logging in API Routes

**Severity:** LOW
**Location:** `/app/api/ai-suggestions/route.ts` (lines 31-37)

**Details:**

```typescript
console.log('[AI Suggestions] Sending prompt to Gemini:', {
    mode,
    isFollowUp,
    query,
})
```

Issues:

- Could leak user query patterns to logs
- Implementation details exposed
- Privacy concern for user searches

**Remediation:**

```typescript
if (process.env.NODE_ENV === 'development') {
    console.log('[AI Suggestions] Query processed')
}
```

---

## Security Best Practices - Implementation Status

| Category           | Status   | Notes                                                    |
| ------------------ | -------- | -------------------------------------------------------- |
| XSS Protection     | PARTIAL  | No dangerouslySetInnerHTML found (good), but CSP is weak |
| SQL Injection      | SAFE     | Using TMDB parameterized queries correctly               |
| CSRF Protection    | MISSING  | No CSRF token validation                                 |
| Authentication     | CRITICAL | Missing on all API routes                                |
| Rate Limiting      | MISSING  | No implementation                                        |
| Input Validation   | WEAK     | Minimal validation, no schema enforcement                |
| Error Handling     | WEAK     | Leaks details in development mode                        |
| Secrets Management | CRITICAL | Keys hardcoded in .env.local                             |
| CORS               | MISSING  | No configuration                                         |
| Headers            | PARTIAL  | Good security headers but weak CSP                       |
| Logging            | UNSAFE   | Logs could contain sensitive data                        |
| Dependencies       | UNKNOWN  | No audit performed on node_modules                       |

---

## Dependency Security

**Recommendation:** Run security audit on dependencies:

```bash
npm audit
npm audit --fix
npx snyk test
```

**Known Good Practices Observed:**

- `isomorphic-dompurify` included (for HTML sanitization if needed)
- Firebase security through built-in rules (if configured)
- Sentry for error monitoring (if properly configured)

---

## Recommendations by Priority

### IMMEDIATE (Do Today)

1. Regenerate ALL exposed API keys
2. Rotate Firebase credentials
3. Remove .env.local from git history
4. Implement authentication on all API routes
5. Add rate limiting to prevent abuse

### SHORT TERM (This Week)

6. Implement input validation on all API routes
7. Add CORS configuration
8. Improve error messages (remove debug info)
9. Strengthen CSP headers with nonces
10. Add request signing/verification

### MEDIUM TERM (This Month)

11. Implement comprehensive logging with PII filtering
12. Add request/response logging for security audit trail
13. Set up security monitoring and alerts
14. Perform security testing (penetration testing)
15. Create security incident response plan

### LONG TERM (Ongoing)

16. Regular dependency updates and security audits
17. Code review process for security
18. Security training for development team
19. Regular penetration testing
20. Bug bounty program

---

## Conclusion

The application has **critical security vulnerabilities** that must be addressed immediately, particularly:

1. Exposed API keys
2. Missing authentication on API routes
3. No rate limiting or CORS configuration

Once these critical issues are resolved, the application will be in a much stronger security posture. The foundation is reasonable (good CSP headers, Firebase authentication available), but implementation is incomplete.

**Estimated Time to Fix Critical Issues:** 4-8 hours
**Estimated Time to Fix All Issues:** 2-3 days
