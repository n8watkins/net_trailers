# Contributing to NetTrailers

Thank you for your interest in contributing to NetTrailers! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository** and clone it locally
2. **Install dependencies**: `npm install`
3. **Set up environment variables**: Copy `.env.local.example` to `.env.local` and fill in required values
4. **Run the development server**: `npm run dev`
5. **Run tests**: `npm test`

## Development Workflow

### Branch Naming

- `feature/description` - New features
- `fix/description` - Bug fixes
- `security/description` - Security-related changes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Commit Messages

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `security`

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes with clear, atomic commits
3. Ensure all tests pass: `npm test`
4. Run linting: `npm run lint`
5. Run type checking: `npm run type-check`
6. Open a PR with a clear description of changes

## Security Guidelines

### API Routes

All mutation endpoints (POST, PUT, DELETE, PATCH) **must** live under `/api/*` to receive automatic CSRF protection from `proxy.ts`.

**DO NOT:**

- Create page-level POST handlers (e.g., in `app/page.tsx`)
- Perform state changes in GET handlers
- Skip CSRF validation for any state-changing operation

**Correct pattern:**

```typescript
// app/api/my-endpoint/route.ts
export async function POST(request: NextRequest) {
    // CSRF protection automatically applied by proxy.ts
    // ... your handler logic
}
```

### Server Actions

Files using the `'use server'` directive **must** implement CSRF protection:

1. Import `validateServerActionOrigin` from `@/lib/csrfProtection`
2. Call it at the start of every exported function
3. Throw an error if validation fails

**Required pattern:**

```typescript
'use server'

import { headers } from 'next/headers'
import { validateServerActionOrigin } from '@/lib/csrfProtection'

export async function myServerAction(data: FormData) {
    // CSRF protection - required for all server actions
    const headersList = await headers()
    if (!validateServerActionOrigin(headersList)) {
        throw new Error('CSRF validation failed')
    }

    // ... action logic
}
```

**Automated enforcement:** The test at `__tests__/security/serverActionCsrf.test.ts` will fail if server actions are missing CSRF protection.

### Authentication

For authenticated endpoints, use the `withAuth` middleware:

```typescript
import { withAuth } from '@/lib/auth-middleware'

async function handler(request: NextRequest, userId: string) {
    // userId is verified via Firebase Admin SDK
}

export const POST = withAuth(handler)
```

### Input Validation

- Always validate and sanitize user input
- Use parameterized queries for database operations
- Escape output to prevent XSS
- For AI-related endpoints, use `isomorphic-dompurify` for sanitization

### Secrets Management

- Never commit secrets to the repository
- Use environment variables for all sensitive values
- Document required environment variables in `.env.local.example`
- Never log sensitive values

## Testing

### Running Tests

```bash
npm test                      # Run all tests
npm run test:watch           # Watch mode
npm run test:coverage        # With coverage report
npm test -- --testPathPatterns=security  # Security tests only
```

### Security Tests

Security-related tests are located in:

- `__tests__/lib/csrfProtection.test.ts` - CSRF protection unit tests
- `__tests__/proxy.test.ts` - Proxy/middleware integration tests
- `__tests__/security/` - Security enforcement tests

**Always run security tests before submitting security-related PRs.**

### Writing Tests

- Test both success and error paths
- Include edge cases for security-sensitive code
- Mock external services (Firebase, TMDB, etc.)
- Use `@jest-environment node` for API route tests

## Code Style

- TypeScript is required for all new code
- Follow existing patterns in the codebase
- Use functional components with hooks
- Prefer Zustand stores over prop drilling
- Keep components focused and composable

## Documentation

- Update `README.md` for user-facing changes
- Update `CLAUDE.md` for architecture changes
- Add JSDoc comments for public functions
- Document security implications in code comments

## Questions?

If you have questions about contributing, please open an issue for discussion.
