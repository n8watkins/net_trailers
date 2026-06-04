# Next.js 16+ Proxy Reference (formerly Middleware)

> **Important for LLMs**: In Next.js 16+, `middleware.ts` has been renamed to `proxy.ts`. If you see references to "middleware" in older documentation or code, the equivalent in Next.js 16+ is "proxy". This project uses `proxy.ts` for global request handling including CSRF protection.

## Official Documentation Links

- **Proxy API Reference**: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- **Next.js 16 Upgrade Guide**: https://nextjs.org/docs/app/guides/upgrading/version-16
- **Next.js 16 Release Blog**: https://nextjs.org/blog/next-16

## Why the Rename?

The term "middleware" was renamed to "proxy" for several reasons:

1. **Clarity**: "Middleware" is often confused with Express.js middleware, leading to misinterpretation of its purpose
2. **Network Boundary**: "Proxy" better describes the actual behavior - it operates at the network boundary in front of the app
3. **Security Focus**: Following CVE-2025-29927 (a vulnerability that allowed bypassing middleware-based authentication), the rename emphasizes that proxy should be used for routing/redirects, not business logic or authentication

## Migration from middleware.ts to proxy.ts

### File Changes

```bash
# Rename the file
mv middleware.ts proxy.ts
```

### Code Changes

```typescript
// OLD (Next.js 15 and earlier)
// middleware.ts
export function middleware(request: NextRequest) {
    // ...
}

// NEW (Next.js 16+)
// proxy.ts
export function proxy(request: NextRequest) {
    // ...
}
```

### Configuration Flag Changes

```typescript
// OLD
export const config = {
    skipMiddlewareUrlNormalize: true,
}

// NEW
export const config = {
    skipProxyUrlNormalize: true,
}
```

### Automated Migration

```bash
npx @next/codemod@canary middleware-to-proxy .
```

## Proxy File Structure

### Location

Place `proxy.ts` at the project root (same level as `app/` or `pages/`):

```
project-root/
├── app/
├── proxy.ts    <-- Here
├── package.json
└── ...
```

### Basic Structure

```typescript
import { NextResponse, NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
    // Your logic here
    return NextResponse.next()
}

export const config = {
    matcher: '/api/:path*',
}
```

## Runtime Considerations

**Important**: The edge runtime is NOT supported in proxy. The proxy runtime is fixed to `nodejs` and cannot be configured. If you need edge runtime, you must continue using the legacy `middleware` approach.

## Matcher Configuration

### Simple Patterns

```typescript
export const config = {
    matcher: [
        '/api/:path*', // All API routes
        '/((?!_next/static|_next/image|favicon.ico).*)', // All except static
    ],
}
```

### Advanced Matching

```typescript
export const config = {
    matcher: [
        {
            source: '/api/:path*',
            has: [{ type: 'header', key: 'Authorization' }],
            missing: [{ type: 'cookie', key: 'bypass' }],
        },
    ],
}
```

## Common Use Cases

### CSRF Protection (This Project's Implementation)

```typescript
// proxy.ts
import { NextRequest, NextResponse } from 'next/server'
import { applyCsrfProtection } from './lib/csrfProtection'

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']
const CSRF_EXEMPT_PATHS = ['/api/cron/']

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    const method = request.method

    if (pathname.startsWith('/api/')) {
        // Skip safe methods
        if (!SAFE_METHODS.includes(method)) {
            // Skip exempt paths
            if (!CSRF_EXEMPT_PATHS.some((p) => pathname.startsWith(p))) {
                const csrfResponse = applyCsrfProtection(request)
                if (csrfResponse) return csrfResponse
            }
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: '/api/:path*',
}
```

### Authentication Check

```typescript
export function proxy(request: NextRequest) {
    const token = request.cookies.get('session')

    if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return NextResponse.next()
}
```

### Header Injection

```typescript
export function proxy(request: NextRequest) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-request-id', crypto.randomUUID())

    return NextResponse.next({
        request: { headers: requestHeaders },
    })
}
```

## Execution Order

Proxy executes in this order:

1. `headers` from `next.config.js`
2. `redirects` from `next.config.js`
3. **Proxy (proxy.ts)** <-- Runs here
4. `beforeFiles` rewrites
5. Filesystem routes (`public/`, `_next/static/`, `app/`, `pages/`)
6. `afterFiles` rewrites
7. Dynamic routes (`/blog/[slug]`)
8. `fallback` rewrites

## Best Practices

1. **Don't rely on shared state**: Proxy may run separately from your app, potentially on CDN edge
2. **Pass data via headers/cookies**: Use `NextResponse` to set headers or cookies, not global variables
3. **Keep it lightweight**: Proxy runs on every matched request - heavy operations impact performance
4. **Use for routing, not business logic**: Authentication validation should happen in route handlers, not proxy

## Security Note

The CSRF bypass in this project only trusts verified `CRON_SECRET`, not unverified JWT tokens. This prevents attackers from bypassing CSRF by sending fake Authorization headers like `Bearer eyJfake`.

## References

- [Next.js Proxy Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)
- [Next.js 16 Upgrade Guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
- [CVE-2025-29927 Security Advisory](https://github.com/vercel/next.js/security/advisories)
