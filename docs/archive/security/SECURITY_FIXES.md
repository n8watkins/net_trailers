# NetTrailers Security Fixes - Implementation Guide

This document provides specific code examples and fixes for the security vulnerabilities found in the audit.

---

## 1. Add Authentication Middleware

Create `/middleware.ts` in the project root:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import * as admin from 'firebase-admin'

// Initialize Firebase Admin (ensure credentials are set via environment)
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        // Use credentials from environment variables, not files
    })
}

// Routes that require authentication
const PROTECTED_ROUTES = [
    '/api/gemini',
    '/api/ai-suggestions',
    '/api/ai-watchlist-style',
    '/api/generate-row',
    '/api/generate-row-name',
]

// Routes that are public but should be rate-limited
const PUBLIC_ROUTES = ['/api/search', '/api/content', '/api/movies', '/api/tv', '/api/genres']

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname

    // Check if route requires authentication
    if (PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
        const authHeader = request.headers.get('authorization')
        if (!authHeader) {
            return NextResponse.json(
                { error: 'Unauthorized: Missing authentication' },
                { status: 401 }
            )
        }

        try {
            const token = authHeader.replace('Bearer ', '')
            const decodedToken = await admin.auth().verifyIdToken(token)

            // Add user ID to request for downstream handlers
            const requestHeaders = new Headers(request.headers)
            requestHeaders.set('x-user-id', decodedToken.uid)

            return NextResponse.next({ request: { headers: requestHeaders } })
        } catch (error) {
            return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 })
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/api/:path*'],
}
```

---

## 2. Add Rate Limiting

First, install: `npm install @upstash/ratelimit redis`

Create `/utils/rateLimit.ts`:

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Create rate limiters for different endpoints
export const searchRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 h'), // 30 requests per hour
    analytics: true,
    prefix: 'ratelimit:search',
})

export const aiRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 h'), // 10 AI requests per hour
    analytics: true,
    prefix: 'ratelimit:ai',
})

export const generalRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 h'), // 100 requests per hour
    analytics: true,
    prefix: 'ratelimit:general',
})

export async function checkRateLimit(
    identifier: string, // user ID or IP
    limiter: Ratelimit
): Promise<{ success: boolean; remaining: number; reset: number }> {
    try {
        const { success, remaining, reset } = await limiter.limit(identifier)
        return { success, remaining, reset }
    } catch (error) {
        // Gracefully degrade if Redis is unavailable
        console.error('Rate limit check failed:', error)
        return { success: true, remaining: 100, reset: 0 }
    }
}
```

Use in API routes:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { searchRateLimit, checkRateLimit } from '@/utils/rateLimit'

export async function GET(request: NextRequest) {
    // Get user ID from middleware or IP for public access
    const userId = request.headers.get('x-user-id') || request.ip || 'anonymous'

    const { success, remaining } = await checkRateLimit(userId, searchRateLimit)

    if (!success) {
        return NextResponse.json(
            { error: 'Too many requests. Please try again later.' },
            {
                status: 429,
                headers: {
                    'X-RateLimit-Remaining': remaining.toString(),
                },
            }
        )
    }

    // ... rest of handler
}
```

---

## 3. Add CORS Validation

Create `/utils/cors.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'

const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:1234',
    process.env.NEXT_PUBLIC_APP_URL,
    'https://yourdomain.com',
].filter(Boolean)

export function validateCors(request: NextRequest): boolean {
    const origin = request.headers.get('origin')

    if (!origin) return true // Allow same-origin requests

    return ALLOWED_ORIGINS.includes(origin)
}

export function corsHeaders(origin?: string | null) {
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
    }
}

export function handleCorsPreFlight(request: NextRequest): NextResponse | null {
    if (request.method !== 'OPTIONS') return null

    const origin = request.headers.get('origin')
    if (!validateCors(request)) {
        return new NextResponse(null, { status: 403 })
    }

    return new NextResponse(null, {
        status: 200,
        headers: corsHeaders(origin),
    })
}
```

Use in API routes:

```typescript
import { handleCorsPreFlight, validateCors, corsHeaders } from '@/utils/cors'

export async function GET(request: NextRequest) {
    // Handle CORS preflight
    const corsResponse = handleCorsPreFlight(request)
    if (corsResponse) return corsResponse

    // Validate CORS
    if (!validateCors(request)) {
        return NextResponse.json({ error: 'CORS not allowed' }, { status: 403 })
    }

    // ... rest of handler
    return NextResponse.json(data, {
        headers: corsHeaders(request.headers.get('origin')),
    })
}

export async function OPTIONS(request: NextRequest) {
    return handleCorsPreFlight(request) || new NextResponse(null, { status: 405 })
}
```

---

## 4. Add Input Validation with Zod

Update search route with validation:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const SearchQuerySchema = z.object({
    query: z
        .string()
        .min(2, 'Query must be at least 2 characters')
        .max(100, 'Query must be less than 100 characters')
        .regex(/^[a-zA-Z0-9\s\-':&.()]+$/, 'Invalid characters in query'),
    page: z.coerce.number().int().min(1).max(500).default(1),
    childSafetyMode: z.enum(['true', 'false']).default('false'),
})

export async function GET(request: NextRequest) {
    try {
        const searchParams = Object.fromEntries(request.nextUrl.searchParams)

        // Validate input
        const validated = SearchQuerySchema.parse(searchParams)

        // Now safely use validated.query, validated.page, etc.
        // ... rest of handler
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Validation failed',
                    details: error.errors,
                },
                { status: 400 }
            )
        }
        // ... other error handling
    }
}
```

---

## 5. Fix Gemini Response Validation

````typescript
import { z } from 'zod'

const GeminiAnalysisSchema = z.object({
    mediaType: z.enum(['movie', 'tv', 'both']),
    genreIds: z.array(z.number().int().positive()).max(10),
    yearRange: z
        .object({
            min: z.number().int().min(1800),
            max: z
                .number()
                .int()
                .max(new Date().getFullYear() + 5),
        })
        .nullable()
        .optional(),
    certification: z.array(z.string()).optional(),
    recommendations: z
        .array(
            z.object({
                type: z.string(),
                value: z.any(),
                reason: z.string().optional(),
                confidence: z.number().min(0).max(100).optional(),
            })
        )
        .optional(),
    conceptQuery: z.string().max(500).nullable().optional(),
    movieRecommendations: z
        .array(
            z.object({
                title: z.string().max(200),
                year: z.number().int(),
                reason: z.string().max(500),
            })
        )
        .optional(),
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        // ... call Gemini API

        const cleanedText = responseText
            .replace(/^```json\s*\n?/i, '')
            .replace(/\n?```\s*$/, '')
            .trim()

        const geminiResponse = JSON.parse(cleanedText)

        // Validate response
        const validated = GeminiAnalysisSchema.parse(geminiResponse)

        return NextResponse.json(validated)
    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error('Invalid Gemini response structure:', error)
            return NextResponse.json({ error: 'Invalid AI response format' }, { status: 500 })
        }
        // ... other error handling
    }
}
````

---

## 6. Fix Error Message Leakage

```typescript
// BEFORE (leaks details)
export async function GET(request: NextRequest) {
    try {
        // ... code
    } catch (error) {
        return NextResponse.json(
            {
                message: 'Internal server error',
                error:
                    process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
            },
            { status: 500 }
        )
    }
}

// AFTER (safe)
export async function GET(request: NextRequest) {
    try {
        // ... code
    } catch (error) {
        // Always log details server-side
        console.error('Search API error:', error)

        // Only expose safe information to client
        const isDev = process.env.NODE_ENV === 'development'

        return NextResponse.json(
            {
                message: 'Failed to search',
                ...(isDev && {
                    error: (error as Error).message,
                    // Don't include stack trace, database info, etc.
                }),
            },
            { status: 500 }
        )
    }
}
```

---

## 7. Fix Secrets Management

Use environment variables properly:

```typescript
// WRONG
const API_KEY = process.env.TMDB_API_KEY // Exposed in .env.local

// RIGHT - Use Vercel Secrets or GitHub Secrets
const API_KEY = process.env.TMDB_API_KEY // Only set via platform

// Server-side only
const apiKey = process.env.TMDB_API_KEY!
if (!apiKey) {
    throw new Error('TMDB_API_KEY is not configured')
}

// Never expose to client
// Don't include in response, logs, or error messages
```

In `next.config.js`, never reference secrets:

```javascript
// WRONG
const config = {
    env: {
        TMDB_API_KEY: process.env.TMDB_API_KEY, // Bakes into client
    },
}

// RIGHT
const config = {
    // Don't include any secrets
}
```

---

## 8. Update CSP Headers

In `next.config.js`:

```javascript
async headers() {
    return [
        {
            source: '/:path*',
            headers: [
                {
                    key: 'Content-Security-Policy',
                    value: [
                        "default-src 'self'",
                        "script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com",
                        "style-src 'self' https://fonts.googleapis.com",
                        "img-src 'self' data: https:",
                        "font-src 'self' https://fonts.gstatic.com",
                        "connect-src 'self' https://api.themoviedb.org https://firestore.googleapis.com",
                        "object-src 'none'",
                        "base-uri 'self'",
                        "form-action 'self'",
                        "upgrade-insecure-requests",
                    ].join('; '),
                },
                {
                    key: 'Strict-Transport-Security',
                    value: 'max-age=31536000; includeSubDomains; preload',
                },
                {
                    key: 'X-Frame-Options',
                    value: 'DENY',
                },
                {
                    key: 'X-Content-Type-Options',
                    value: 'nosniff',
                },
            ],
        },
    ]
},
```

---

## 9. Regenerate Credentials Checklist

```bash
# 1. Firebase
# Go to: https://console.firebase.google.com
# Project Settings > Service Accounts > Generate new key
# Or: Authentication > Providers > (regenerate API key)

# 2. TMDB
# Go to: https://www.themoviedb.org/settings/api
# Regenerate API key

# 3. Gemini
# Go to: https://aistudio.google.com/app/apikey
# Delete old key, create new one

# 4. Sentry
# Go to: https://sentry.io/settings/
# Project > Client Keys (DSN) > Generate new

# 5. Remove old key from git
git filter-branch --tree-filter 'rm -f .env.local' -- --all
git push origin --force-with-lease

# 6. Update all services with new keys
# Use platform secrets (Vercel, GitHub, etc.)
```

---

## 10. Testing Security Fixes

Create `/test/security.test.ts`:

```typescript
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/search/route'

describe('API Security', () => {
    it('should reject requests with invalid input', async () => {
        const request = new NextRequest(new URL('http://localhost:3000/api/search?query='), {
            method: 'GET',
        })

        const response = await GET(request)
        expect(response.status).toBe(400)
    })

    it('should enforce rate limiting', async () => {
        // Test rate limit enforcement
    })

    it('should validate CORS', async () => {
        const request = new NextRequest(new URL('http://localhost:3000/api/search?query=test'), {
            method: 'GET',
            headers: new Headers({
                origin: 'https://malicious.com',
            }),
        })

        const response = await GET(request)
        expect(response.status).toBe(403)
    })

    it('should require authentication for protected routes', async () => {
        // Test auth enforcement
    })
})
```

---

## Implementation Priority

### Day 1 (2-4 hours)

1. Regenerate all API keys
2. Update middleware.ts with auth
3. Remove .env.local from git history

### Day 2-3 (4-8 hours)

4. Add rate limiting
5. Add input validation
6. Fix CORS configuration

### Day 4-5 (4-8 hours)

7. Add Zod validation to all routes
8. Fix error messages
9. Update CSP headers

### Following Week

10. Security testing
11. Monitoring setup
12. Audit follow-up
