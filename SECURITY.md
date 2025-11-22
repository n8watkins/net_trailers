# Security Documentation

This document outlines the security measures implemented in NetTrailer to protect user data and ensure application integrity.

**Last Updated:** November 2025
**Security Review Status:** Production Ready

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

### Firebase Authentication

NetTrailer uses **Firebase Authentication** for secure user identity management:

- **Multiple providers**: Google Sign-In, Email/Password
- **Server-side token verification**: All protected API routes verify Firebase ID tokens
- **Session persistence**: Auth state persists across browser refreshes
- **Secure token handling**: ID tokens are short-lived and automatically refreshed

**Implementation:**

- `lib/firebase-admin.ts` - Server-side Firebase Admin SDK
- `lib/auth-middleware.ts` - API route authentication middleware
- `lib/authenticatedFetch.ts` - Client-side authenticated requests

### Authorization Levels

| Level             | Access                       | Verification                         |
| ----------------- | ---------------------------- | ------------------------------------ |
| **Public**        | Browse, search               | None required                        |
| **Authenticated** | Personal data, collections   | Firebase ID token                    |
| **Admin**         | Admin panel, user management | Firebase token + Admin UID check     |
| **Cron**          | Scheduled jobs               | CRON_SECRET (timing-safe comparison) |

### Admin Authorization

Admin access requires:

1. Valid Firebase ID token
2. User ID in `ADMIN_UIDS` environment variable

**Files:**

- `utils/adminAuth.ts` - Admin UID validation
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

### Firestore Data Validation

Server-side validation for database operations:

- `utils/firestore/validation.ts` - Schema validation functions
- Title length limits (3-100 characters)
- Description limits (max 1000 characters)
- Tag validation and sanitization

---

## API Security

### Rate Limiting

**General Rate Limiting:**

- Sliding window algorithm
- Per-user/IP tracking
- Configurable limits and windows

**Gemini AI Rate Limiting:**

- Default: 100 requests per 24 hours per user
- Configurable via environment variables
- Returns 429 with retry-after information

**Password Reset Rate Limiting:**

- Max 3 requests per email per hour
- Prevents brute-force attacks

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
- **Firebase Admin Credentials**: Secure service account management

---

## Data Protection

### Firestore Security Rules

Comprehensive security rules (540+ lines) protect all data:

**User Data:**

```javascript
match /users/{userId} {
    allow read: if request.auth.uid == userId;
    allow write: if request.auth.uid == userId && isValidUserData();
}
```

**Key Protections:**

- Users can only access their own data
- Schema validation on all writes
- Stat manipulation prevention (views, likes limited to +1/-1)
- Comment deletion by owner or content author
- Immutable poll votes (no editing/deleting)

**Collections Protected:**

- `/users/{userId}` - User profiles and settings
- `/users/{userId}/notifications` - User notifications
- `/users/{userId}/interactions` - Recommendation data (90-day TTL)
- `/rankings/{rankingId}` - Public/private rankings
- `/threads/{threadId}` - Forum threads
- `/polls/{pollId}` - Community polls

### Firebase Storage Rules

Image upload security:

- **File size limit**: 5MB maximum
- **Content type**: Images only (`image/*`)
- **Authentication required**: All uploads require valid auth
- **Path restrictions**: Only specific paths allowed

### User Data Isolation

- Each user has isolated Firestore document at `/users/{userId}`
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

- `utils/firestore/childSafetyPIN.ts` - PIN management
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

**Firebase Auth Error Mapping:**

```typescript
'auth/user-not-found' → "No account found with this email address."
'auth/wrong-password' → "Invalid password. Please try again."
'auth/too-many-requests' → "Too many failed attempts. Please try again later."
```

**Implementation:** `utils/errorHandler.ts`

### Debug Logging

- Sensitive data filtered from logs
- No PII in production logs
- Sentry integration for error monitoring
- Privacy-preserving error reports

---

## Session Security

### Token Handling

- **Firebase ID tokens**: Short-lived, automatically refreshed
- **Bearer token format**: `Authorization: Bearer {token}`
- **Server-side verification**: All tokens verified via Firebase Admin SDK

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
- `lh3.googleusercontent.com` - Google profile pictures
- `firebasestorage.googleapis.com` - User uploads
- Netflix CDN domains for fallbacks

### Third-Party API Security

| Service   | Authentication        | Protection                      |
| --------- | --------------------- | ------------------------------- |
| TMDB      | API Key (server-side) | Rate limiting, proxied requests |
| Gemini AI | API Key (server-side) | Per-user rate limits            |
| Firebase  | Service account       | Credential rotation support     |

---

## Security Checklist

### Implemented Protections

- [x] Firebase Authentication with multiple providers
- [x] Server-side token verification
- [x] Admin authorization with UID validation
- [x] Timing-safe secret comparison for cron jobs
- [x] Input sanitization on all user inputs
- [x] Rate limiting (general, AI, password reset)
- [x] Request size limits
- [x] Comprehensive Firestore security rules
- [x] Firebase Storage rules with size/type limits
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

### Email & Password Security

- **Password Reset Tokens**: `crypto.randomBytes(32)`, 1-hour expiration, single-use
- **Email Verification Tokens**: 24-hour expiration, rate limited (5/hour per user)
- **Password Requirements**: 8-256 characters, server-side validation
- **OAuth Detection**: Prevents password reset for Google-only accounts
- **Token Cleanup**: Tokens deleted from Firestore after use (prevents reuse)

### XSS Prevention

- **DOMPurify**: Sanitizes collection names/descriptions (strips all HTML)
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

### Email Service

- **Batch Rate Limiting**: 10 emails per batch, 1-second delays
- **Graceful Degradation**: Returns null when email service unavailable

---

## About This Project

NetTrailer is a portfolio project demonstrating modern web security practices in a Next.js application. The security measures documented here represent real implementations used throughout the codebase, showcasing production-grade security patterns.

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [Timing Attack Prevention](https://codahale.com/a-lesson-in-timing-attacks/)

---

_This document is updated with each security-related change. Last reviewed: November 2025_
