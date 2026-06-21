# Security Documentation

This document outlines the security measures implemented in NetTrailer to protect user data and ensure application integrity.

**Last Updated:** December 3, 2025
**Security Review Status:** Production Ready - Enhanced Email Security

---

## Table of Contents

1. [Authentication & Authorization](#authentication--authorization)
2. [Input Validation & Sanitization](#input-validation--sanitization)
3. [API Security](#api-security)
4. [Data Protection](#data-protection)
5. [Child Safety Features](#child-safety-features)
6. [Security Headers](#security-headers)
7. [Error Handling](#error-handling)
8. [Session Security](#session-security)
9. [Third-Party Security](#third-party-security)
10. [Reporting Vulnerabilities](#reporting-vulnerabilities)

---

## Authentication & Authorization

### Auth.js Authentication

NetTrailer uses **Auth.js (NextAuth v5)** for secure user identity management:

- **Providers**: GitHub OAuth and passwordless email magic-link (Brevo by default, Resend optional)
- **Database sessions**: Sessions are persisted in Turso via `@auth/drizzle-adapter`
- **Cookie-based**: Auth state is carried by an HttpOnly session cookie — no client-supplied bearer/ID tokens
- **Server-side validation**: All protected API routes validate the session cookie via the Drizzle adapter

**Implementation:**

- `auth.ts` - Auth.js configuration and provider setup
- `db/queries/*.ts` - Server-side data access (session-derived user id)
- `lib/authenticatedFetch.ts` - Client-side requests (sends the session cookie)

### Authorization Levels

| Level             | Access                       | Verification                          |
| ----------------- | ---------------------------- | ------------------------------------- |
| **Public**        | Browse, search               | None required                         |
| **Authenticated** | Personal data, collections   | Auth.js session cookie                |
| **Admin**         | Admin panel, user management | Session cookie + `ADMIN_GITHUB_LOGIN` |
| **Cron**          | Scheduled jobs               | CRON_SECRET (timing-safe comparison)  |

### Admin Authorization

Admin access requires:

1. A valid Auth.js session cookie
2. The signed-in GitHub login to match the `ADMIN_GITHUB_LOGIN` environment variable
   (surfaced as `session.user.isAdmin`)

**Files:**

- `auth.ts` - Sets `session.user.isAdmin` from `ADMIN_GITHUB_LOGIN`
- `utils/adminMiddleware.ts` - Admin request middleware

---

## Input Validation & Sanitization

### Input Sanitization Utility

All user inputs are sanitized before processing:

```typescript
import { sanitizeInput } from '@/utils/inputSanitization'

const result = sanitizeInput(userInput, minLength, maxLength)
if (!result.isValid) {
    return error(result.error)
}
const cleanInput = result.sanitized
```

**Protections:**

- **Length enforcement**: Configurable min/max lengths
- **Control character removal**: Strips `\x00-\x1F`, `\x7F-\x9F`
- **Whitespace normalization**: Collapses multiple spaces
- **Type validation**: Ensures string input type

**Applied to:**

- All Gemini AI API routes (7 routes)
- Search queries
- User-generated content (rankings, comments, threads)

### Database Write Validation

Server-side validation for database operations:

- API routes validate payloads before writing via `db/queries/*.ts`
- Title length limits (3-100 characters)
- Description limits (max 1000 characters)
- Tag validation and sanitization

---

## API Security

### CSRF Protection

Cross-Site Request Forgery protection is implemented at multiple layers:

**Global Proxy Protection (`proxy.ts`):**

- All state-changing requests (POST, PUT, DELETE, PATCH) to `/api/*` validate Origin/Referer headers
- Only requests from allowed origins are processed
- Uses exact origin matching to prevent subdomain attacks

**Server Action Protection:**

- Server actions bypass proxy.ts, so they must call `validateServerActionOrigin()` directly
- Automated lint guard test ensures all server actions have CSRF protection
- See `CONTRIBUTING.md` for required implementation pattern

**Cron Route Protection:**

- `/api/cron/*` routes require valid `CRON_SECRET` instead of Origin validation
- CRON_SECRET bypass is limited to cron routes only (prevents leaked secret from bypassing all CSRF)

**Test Coverage:**

```bash
# Run CSRF-related tests (55 tests total)
npm test -- --testPathPatterns="csrf|proxy|serverAction"
```

**Related Documentation:**

- `docs/security/CSRF_REVIEW.md` - Detailed CSRF audit and fixes
- `CONTRIBUTING.md` - Security guidelines for contributors

### Rate Limiting

**General Rate Limiting:**

- Sliding window algorithm
- Per-user/IP tracking
- Configurable limits and windows

**Gemini AI Rate Limiting:**

- Default: 100 requests per 24 hours per user
- Configurable via environment variables
- Returns 429 with retry-after information

**Magic-Link Rate Limiting:**

- Limits repeated email sign-in requests per address
- Prevents email-bombing and brute-force attacks

**Implementation:**

- `lib/rateLimiter.ts` - General rate limiter
- `lib/geminiRateLimiter.ts` - AI-specific limits

### Request Size Limits

Global middleware enforces request size limits:

- **General requests**: 1MB maximum
- **JSON payloads**: 500KB maximum
- **Content-Type validation**: Required for POST/PUT/PATCH

Returns 413 (Payload Too Large) or 415 (Unsupported Media Type) for violations.

### Cron Job Security

Scheduled jobs are protected with:

1. **Secret token authentication**: `CRON_SECRET` environment variable
2. **Timing-safe comparison**: Uses `crypto.timingSafeEqual()` to prevent timing attacks
3. **Fallback to admin auth**: Admin users can trigger jobs manually

```typescript
// Timing-safe token comparison
function isValidCronSecret(token: string | null): boolean {
    if (!token || !CRON_SECRET) return false
    const tokenBuffer = Buffer.from(token)
    const secretBuffer = Buffer.from(CRON_SECRET)
    if (tokenBuffer.length !== secretBuffer.length) return false
    return crypto.timingSafeEqual(tokenBuffer, secretBuffer)
}
```

### API Key Protection

- **TMDB API Key**: Server-side only, never exposed to client
- **Gemini API Key**: Server-side only with rate limiting
- **Turso Auth Token**: Server-side only; the browser never talks to the database directly
- **Vercel Blob Token**: `BLOB_READ_WRITE_TOKEN` kept server-side for uploads

---

## Data Protection

### Server-Side Authorization

The browser cannot talk to Turso directly — every read and write goes through a
Next.js API route. Each route derives the user id from the Auth.js session and
enforces ownership server-side, which replaces the old database security rules:

**User Data:**

```typescript
// Ownership is derived from the session, never from the request body
const userId = await currentUserId() // from the Auth.js session
if (!userId) return unauthorized()
// queries are scoped to userId
await db.query.user_preferences.findFirst({ where: eq(user_preferences.userId, userId) })
```

**Key Protections:**

- Users can only access their own rows (session-derived user id, never request-supplied)
- Payload validation on all writes
- Stat manipulation prevention (views, likes limited to +1/-1)
- Comment deletion by owner or content author
- Immutable poll votes (no editing/deleting)

**Data Protected:**

- `user_preferences` - User profiles and settings
- `notifications` - User notifications
- `interactions` - Recommendation data (90-day TTL)
- `rankings` - Public/private rankings
- `threads` - Forum threads
- `polls` - Community polls

### Vercel Blob Storage

Image upload security (via `@vercel/blob`):

- **Per-user path scoping**: Uploads are written under `uploads/{userId}/...`
- **File size limit**: Enforced on upload
- **Content type**: Images only, validated server-side
- **Authentication required**: All uploads require a valid session

### User Data Isolation

- Each user's rows are keyed by their session-derived user id
- User ID validated before all state updates
- Race condition prevention in concurrent operations
- Guest data stored in localStorage with unique ID

---

## Child Safety Features

### Content Filtering

Age-appropriate content filtering based on ratings:

- **Movies**: MPAA ratings (G, PG, PG-13, R, NC-17)
- **TV Shows**: TV ratings (TV-Y, TV-Y7, TV-G, TV-PG, TV-14, TV-MA)
- **Server-side filtering**: Applied to all API responses
- **Cache invalidation**: Automatic when mode changes

### PIN Protection

4-6 digit PIN system for child safety mode:

**Security Measures:**

- **bcrypt encryption**: 10 rounds of hashing
- **Constant-time comparison**: Prevents timing attacks
- **Rate limiting**: 5 failed attempts triggers 5-minute lockout
- **Session-based verification**: Resets on browser close
- **Never stored in plaintext**: Only bcrypt hash stored

**Implementation:**

- `db/queries/childSafety.ts` - PIN management
- `stores/childSafetyStore.ts` - Session state

### Genre Filtering

When child safety mode is enabled:

- Only child-safe genres displayed
- `getChildSafeUnifiedGenres()` filters available genres
- Applied consistently across all genre selectors

---

## Security Headers

### Content Security Policy (CSP)

Strict CSP prevents XSS and injection attacks:

```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com ...;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https: blob:;
connect-src 'self' https://api.themoviedb.org https://*.googleapis.com ...;
frame-src 'self' https://www.youtube.com;
object-src 'none';
frame-ancestors 'none';
upgrade-insecure-requests;
```

### Additional Headers

| Header                      | Value                                          | Purpose                |
| --------------------------- | ---------------------------------------------- | ---------------------- |
| `X-Frame-Options`           | `DENY`                                         | Prevents clickjacking  |
| `X-Content-Type-Options`    | `nosniff`                                      | Prevents MIME sniffing |
| `X-XSS-Protection`          | `1; mode=block`                                | Legacy XSS filter      |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`              | Controls referrer info |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`          | Enforces HTTPS         |
| `Permissions-Policy`        | `camera=(), microphone=(self), geolocation=()` | Restricts features     |

**Configuration:** `next.config.js`

---

## Error Handling

### Safe Error Messages

User-facing errors are sanitized:

- No stack traces exposed to users
- No internal system details revealed
- Consistent error response format
- User-friendly messages for common errors

**Auth Error Mapping:**

```typescript
'OAuthAccountNotLinked' → "This email is already linked to a different sign-in method."
'AccessDenied' → "Access denied. Please try signing in again."
'Verification' → "This sign-in link is invalid or has expired."
```

**Implementation:** `utils/errorHandler.ts`

### Debug Logging

- Sensitive data filtered from logs
- No PII in production logs
- Sentry integration for error monitoring
- Privacy-preserving error reports

---

## Session Security

### Session Handling

- **Database sessions**: Session records are stored in Turso via `@auth/drizzle-adapter`
- **Cookie-based**: An HttpOnly session cookie identifies the user — no bearer/ID tokens
- **Server-side validation**: Every protected route resolves the session via the Drizzle adapter

### Cookie Security

| Attribute  | Value               | Purpose          |
| ---------- | ------------------- | ---------------- |
| `SameSite` | `Lax`               | CSRF protection  |
| `Secure`   | `true` (production) | HTTPS only       |
| `HttpOnly` | Where applicable    | XSS protection   |
| `Path`     | `/`                 | Scope limitation |

### Session Management

- User ID validated on all operations
- Sessions cleared on logout
- Child safety PIN verification is session-scoped

---

## Third-Party Security

### Sentry Error Monitoring

Privacy-preserving configuration:

```typescript
beforeSend(event) {
    if (event.user) {
        delete event.user.email
        delete event.user.ip_address
    }
    return event
}
```

- Email and IP addresses removed from reports
- Source maps not publicly exposed
- Common browser errors filtered

### Image CDN Whitelisting

Only approved domains allowed:

- `image.tmdb.org` - TMDB images
- `avatars.githubusercontent.com` - GitHub profile pictures
- `*.public.blob.vercel-storage.com` - User uploads (Vercel Blob)
- Netflix CDN domains for fallbacks

### Third-Party API Security

| Service     | Authentication        | Protection                      |
| ----------- | --------------------- | ------------------------------- |
| TMDB        | API Key (server-side) | Rate limiting, proxied requests |
| Gemini AI   | API Key (server-side) | Per-user rate limits            |
| Turso       | Auth token (server)   | Server-mediated access only     |
| Vercel Blob | Token (server-side)   | Per-user path scoping           |

---

## Security Checklist

### Implemented Protections

- [x] Auth.js authentication (GitHub OAuth + email magic-link)
- [x] Server-side session validation (cookie-based, database sessions)
- [x] Admin authorization via `ADMIN_GITHUB_LOGIN`
- [x] Timing-safe secret comparison for cron jobs
- [x] Input sanitization on all user inputs
- [x] Rate limiting (general, AI, magic-link)
- [x] Request size limits
- [x] Server-side ownership checks in every API route (session-derived user id)
- [x] Vercel Blob uploads with per-user path scoping + size/type limits
- [x] Child safety PIN with bcrypt + rate limiting
- [x] Content Security Policy headers
- [x] HSTS and other security headers
- [x] Safe error handling (no stack traces)
- [x] Sentry privacy filtering
- [x] API key protection (server-side only)

### Monitoring

- API usage patterns via Sentry
- Rate limit violations logged
- Authentication failures tracked
- Input validation rejections monitored

---

## Additional Security Measures

### Email Sign-In Security

- **Magic-Link Tokens**: Single-use, time-limited verification tokens issued by Auth.js
  and stored in the `verificationToken` table (deleted after use to prevent reuse)
- **Provider**: Magic-link emails are sent through Brevo by default (Resend optional via `EMAIL_PROVIDER`)
- **No passwords**: The app is passwordless — there is no password storage, reset, or
  separate email-verification flow

### XSS Prevention

- **sanitize-html**: Sanitizes collection names/descriptions (strips all HTML)
- **Emoji Validation**: Blocks dangerous characters (`< > " ' / \ { } ( ) ; = & | $ \``)
- **React Auto-escaping**: All rendered text automatically escaped

### IP & Request Security

- **Client IP Extraction**: Validates IPv4/IPv6 format, strips ports
- **Multi-header Fallback**: x-forwarded-for → request.ip → x-real-ip
- **Request Identity Isolation**: Separates authenticated users from guest IPs for rate limiting

### Production Safety

- **Console Log Removal**: `console.log` stripped in production builds
- **Source Map Hiding**: Not publicly exposed via Sentry configuration
- **FLoC Disabled**: `interest-cohort=()` in Permissions-Policy

### Additional CSP Directives

- `base-uri 'self'` - Restricts base tag manipulation
- `form-action 'self'` - Restricts form submission origins

### Cron Job Security

- **Admin Fallback**: Cron jobs accept CRON_SECRET OR admin authentication
- **Demo Mode Protection**: Only admins can trigger demo/test modes

### Email Security

**Admin Email System (December 2025):**

- **XSS Prevention**: sanitize-html sanitization on all custom HTML content
- **HTTPS-Only Links**: ALLOWED_URI_REGEXP enforces `https://` scheme only
- **Rate Limiting**: 100 emails/hour per admin, 3/day per recipient
- **Recipient Limit**: Maximum 100 recipients per request (DoS protection)
- **Input Validation**: 200/10K/50K character limits on subject/message/HTML
- **PII Minimization**: Email history stores counts only, not recipient lists
- **CAN-SPAM Compliance**: Crypto-secure unsubscribe tokens (64-character hex)
- **Transaction Safety**: Drizzle/libSQL transactions prevent token generation race conditions
- **Batch Optimization**: Batched database reads (100+ queries → 1 read)
- **CSRF Protection**: authenticatedFetch() used for all email endpoints
- **Admin-Only Access**: `ADMIN_GITHUB_LOGIN` verification required for all email operations
- **Content Sanitization Config**: Shared CUSTOM_HTML_SANITIZATION_CONFIG
    - Allowed tags: p, br, strong, em, u, h1-h3, ul, ol, li, a
    - Allowed attributes: href, title only
    - Forbidden: script, style, iframe, inline styles/handlers
    - Data attributes blocked

**Email Service:**

- **Batch Rate Limiting**: 10 emails per batch, 1-second delays
- **Graceful Degradation**: Returns null when email service unavailable
- **Template Security**: React Email components prevent injection
- **Sender Verification**: RESEND_SENDER_EMAIL defaults to verified domain

---

## About This Project

NetTrailer is a portfolio project demonstrating modern web security practices in a Next.js application. The security measures documented here represent real implementations used throughout the codebase, showcasing production-grade security patterns.

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Auth.js Documentation](https://authjs.dev)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Timing Attack Prevention](https://codahale.com/a-lesson-in-timing-attacks/)

---

_This document is updated with each security-related change. Last reviewed: November 2025_
