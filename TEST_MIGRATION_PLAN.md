# Test Migration Plan for App Router

## Executive Summary

After migrating from Next.js Pages Router to App Router, the test suite requires updates to:

1. Update Jest configuration to reflect new directory structure
2. Add missing test coverage for new App Router features
3. Verify existing tests work with App Router navigation patterns
4. Add integration tests for server components and route handlers

**Current Test Status**: ✅ Existing tests are well-written but configuration is outdated

---

## Current Test Suite Analysis

### Existing Tests (12 files)

#### Component Tests

- ✅ `__tests__/components/Header.test.tsx` - Well-written, should work as-is
- ✅ `__tests__/components/SessionSyncManager.test.tsx` - Zustand integration, likely compatible

#### Hook Tests

- ✅ `__tests__/hooks/useAuth.test.tsx` - Firebase auth, App Router compatible
- ✅ `__tests__/hooks/useSearch.pagination.test.ts` - Search logic, should work
- ✅ `__tests__/hooks/useUserData.preferences.test.ts` - Zustand store, compatible

#### Store Tests (Zustand)

- ✅ `__tests__/stores/authStore.test.ts` - Pure Zustand tests, fully compatible
- ✅ `__tests__/stores/guestStore.clearData.test.ts` - Pure Zustand tests, fully compatible

#### Utility Tests

- ✅ `__tests__/utils/errorHandler.test.ts` - Pure function tests, compatible
- ✅ `__tests__/utils/contentFilter.test.ts` - Pure function tests, compatible
- ✅ `__tests__/utils/tvContentRatings.test.ts` - Pure function tests, compatible
- ✅ `__tests__/utils/contentRatings.test.ts` - Pure function tests, compatible

#### Integration Tests

- ✅ `__tests__/integration/childSafety.client.test.tsx` - Client-side filtering, compatible
- ⚠️ `__tests__/integration/childSafety.api.test.ts` - May need updates for App Router API routes

---

## Issues Identified

### 1. ❌ CRITICAL: Jest Configuration Outdated

**File**: `jest.config.js`

**Problems**:

```javascript
// Line 16: References deleted pages/ directory
'pages/**/*.{js,jsx,ts,tsx}',

// Line 30: Module mapper references pages/
'^@/pages/(.*)$': '<rootDir>/pages/$1',
```

**Impact**:

- Coverage collection skips all new `app/` directory code
- Module resolution may fail for any test importing from pages/
- False negative coverage reports

**Priority**: 🔴 HIGH - Must fix before running tests

---

### 2. ⚠️ Missing Coverage: App Router Features

**What's Not Tested**:

#### Server Components (New in App Router)

- `app/page.tsx` - Homepage async server component
- `app/movies/page.tsx` - Movies page with `fetchHomeData()`
- `app/tv/page.tsx` - TV shows page with `fetchHomeData()`
- `app/genres/[type]/[id]/page.tsx` - Dynamic genre pages
- `app/search/page.tsx` - Search page (client component)
- `app/watchlists/page.tsx` - Watchlists page (client component)

#### Layout Components

- `app/layout.tsx` - Root layout with metadata
- `app/movies/layout.tsx` - Movies layout (if exists)
- `app/tv/layout.tsx` - TV layout (if exists)

#### API Route Handlers (New App Router Style)

- `app/api/*/route.ts` files now use `GET`, `POST` exports instead of default handler
- Need to verify all API route tests work with new pattern

#### Error Boundaries

- `app/error.tsx` - Root error boundary
- `app/not-found.tsx` - 404 page (if exists)

**Priority**: 🟡 MEDIUM - Add gradually as part of improved coverage

---

### 3. ⚠️ Navigation Hook Changes

**Pages Router Hooks** (No Longer Available):

- `useRouter()` from `next/router` - Replaced by `next/navigation`
- Different API: `router.push()` vs `router.push()`

**App Router Hooks** (Now Required):

- `useRouter()` from `next/navigation` - Different API
- `usePathname()` - Replaces `router.pathname`
- `useSearchParams()` - Replaces `router.query`
- `useParams()` - For dynamic route params

**Current Status**:

- Header.test.tsx and other tests mock `next/router` (Pages Router)
- Should verify these mocks still work or update to `next/navigation`

**Priority**: 🟢 LOW - Tests currently mock these, so they work, but may need updates for accuracy

---

## Migration Plan

### Phase 1: Fix Jest Configuration (IMMEDIATE)

**Task 1.1**: Update `jest.config.js` coverage paths

```javascript
// BEFORE:
collectCoverageFrom: [
  'components/**/*.{js,jsx,ts,tsx}',
  'hooks/**/*.{js,jsx,ts,tsx}',
  'utils/**/*.{js,jsx,ts,tsx}',
  'pages/**/*.{js,jsx,ts,tsx}',  // ❌ REMOVE THIS
  // ...
],

// AFTER:
collectCoverageFrom: [
  'components/**/*.{js,jsx,ts,tsx}',
  'hooks/**/*.{js,jsx,ts,tsx}',
  'utils/**/*.{js,jsx,ts,tsx}',
  'stores/**/*.{js,jsx,ts,tsx}',  // ✅ ADD ZUSTAND STORES
  'app/**/*.{js,jsx,ts,tsx}',      // ✅ ADD APP ROUTER FILES
  '!app/layout.tsx',               // Exclude root layout (mostly boilerplate)
  '!app/**/layout.tsx',            // Exclude layout files (metadata only)
  '!app/**/loading.tsx',           // Exclude loading files (simple UI)
  '!app/**/error.tsx',             // Exclude error files (simple UI)
  '!app/api/**',                   // Exclude API routes (test separately)
  // ...existing exclusions
],
```

**Task 1.2**: Update module name mappers

```javascript
// BEFORE:
moduleNameMapper: {
  '^@/components/(.*)$': '<rootDir>/components/$1',
  '^@/pages/(.*)$': '<rootDir>/pages/$1',  // ❌ REMOVE THIS
  '^@/utils/(.*)$': '<rootDir>/utils/$1',
  '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
},

// AFTER:
moduleNameMapper: {
  '^@/components/(.*)$': '<rootDir>/components/$1',
  '^@/app/(.*)$': '<rootDir>/app/$1',        // ✅ ADD APP DIRECTORY
  '^@/utils/(.*)$': '<rootDir>/utils/$1',
  '^@/hooks/(.*)$': '<rootDir>/hooks/$1',
  '^@/stores/(.*)$': '<rootDir>/stores/$1',  // ✅ ADD STORES
  '^@/lib/(.*)$': '<rootDir>/lib/$1',        // ✅ ADD LIB (for serverData)
},
```

**Task 1.3**: Run existing tests to verify they pass

```bash
npm test
```

**Success Criteria**:

- ✅ All existing tests pass
- ✅ No import resolution errors
- ✅ Coverage reports include `app/` directory

---

### Phase 2: Add Server Component Tests (RECOMMENDED)

App Router introduces server components that fetch data at build/request time. These need different testing approaches.

**Task 2.1**: Test Server Data Fetching Functions

Create `__tests__/lib/serverData.test.ts`:

```typescript
import { fetchHomeData } from '../../lib/serverData'

describe('Server Data Fetching', () => {
    it('should fetch movie data for homepage', async () => {
        const data = await fetchHomeData('movies')

        expect(data).toHaveProperty('trending')
        expect(data).toHaveProperty('topRated')
        expect(data).toHaveProperty('genre1')
        // ...
    })

    it('should fetch TV data for homepage', async () => {
        const data = await fetchHomeData('tv')

        expect(data).toHaveProperty('trending')
        // ...
    })

    it('should handle API errors gracefully', async () => {
        // Mock TMDB API failure
        // Verify error handling
    })
})
```

**Task 2.2**: Test Page Components (Integration Style)

Since server components can't be tested like client components (they don't render in browser), test them as integration tests:

Create `__tests__/app/movies.integration.test.tsx`:

```typescript
/**
 * Integration test for /movies page
 * Tests that the page can fetch and render data correctly
 */
import { fetchHomeData } from '../../lib/serverData'

describe('/movies Page Integration', () => {
    it('should successfully fetch movie data', async () => {
        const data = await fetchHomeData('movies')

        // Verify data structure matches MoviesClient props
        expect(data.trending).toBeInstanceOf(Array)
        expect(data.topRated).toBeInstanceOf(Array)
        expect(data.genre1).toBeInstanceOf(Array)
    })

    it('should handle empty results', async () => {
        // Test error cases
    })
})
```

**Priority**: 🟡 MEDIUM - Important for confidence in server-side logic

---

### Phase 3: Test App Router API Routes (RECOMMENDED)

App Router API routes use new syntax with named exports (`GET`, `POST`, etc.) instead of default exports.

**Task 3.1**: Update API Route Tests

Current API test may need updates if they test `pages/api/` routes:

Example: `__tests__/app/api/genres.test.ts`:

```typescript
import { GET } from '../../../app/api/genres/[type]/[id]/route'
import { NextRequest } from 'next/server'

describe('GET /api/genres/[type]/[id]', () => {
    it('should return genre content', async () => {
        const request = new NextRequest('http://localhost/api/genres/movie/28?page=1')
        const params = Promise.resolve({ type: 'movie', id: '28' })

        const response = await GET(request, { params })
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.results).toBeInstanceOf(Array)
    })

    it('should apply child safety filtering', async () => {
        const request = new NextRequest('http://localhost/api/genres/movie/28?childSafetyMode=true')
        const params = Promise.resolve({ type: 'movie', id: '28' })

        const response = await GET(request, { params })
        const data = await response.json()

        expect(data).toHaveProperty('child_safety_enabled', true)
    })
})
```

**Priority**: 🟡 MEDIUM - Ensures API routes work as expected

---

### Phase 4: Navigation Hook Verification (OPTIONAL)

**Task 4.1**: Verify Navigation Mocks

Check if tests using `next/router` mocks still work:

```bash
npm test -- Header.test.tsx
```

If tests fail, update mocks to use `next/navigation`:

```typescript
// OLD (Pages Router):
jest.mock('next/router', () => ({
    useRouter: jest.fn(),
}))

// NEW (App Router):
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(),
    usePathname: jest.fn(),
    useSearchParams: jest.fn(),
}))
```

**Priority**: 🟢 LOW - Only if tests fail

---

### Phase 5: Improve Test Coverage (STRETCH GOAL)

**Task 5.1**: Add Missing Component Tests

- `components/pages/MoviesClient.tsx`
- `components/pages/TVClient.tsx`
- `components/pages/GenresClient.tsx`
- `components/common/Modal.tsx` (critical user interaction)
- `components/common/ContentCard.tsx` (core UI component)

**Task 5.2**: Add Missing Hook Tests

- Complete `useSearch` test coverage
- Add `useAppStore` tests
- Add `useSessionStore` tests

**Task 5.3**: Add E2E Tests (Future)

- Consider Playwright or Cypress for full user flow testing
- Test modal opening, search, watchlist management

**Priority**: 🔵 NICE TO HAVE - Improves confidence but not blocking

---

## Testing Strategy for App Router

### Server Components

- **Unit Test**: Test data fetching functions (`lib/serverData.ts`)
- **Integration Test**: Test that pages call data functions correctly
- **E2E Test**: Test full page rendering in browser

### Client Components

- **Unit Test**: Test with React Testing Library (existing approach works)
- **Integration Test**: Test with mocked data from server
- **E2E Test**: Test user interactions

### API Routes

- **Unit Test**: Test route handlers directly with mock NextRequest
- **Integration Test**: Test full request/response cycle
- **E2E Test**: Test from actual HTTP requests

### Metadata

- **Snapshot Test**: Verify metadata exports haven't changed
- **Type Test**: Verify metadata matches Next.js Metadata type

---

## Success Criteria

### Minimum Viable Testing (Phase 1)

- ✅ All existing tests pass after Jest config update
- ✅ No import errors from removed `pages/` directory
- ✅ Coverage reports include `app/` directory
- ✅ CI/CD pipeline runs tests successfully

### Recommended Testing (Phases 1-3)

- ✅ All Phase 1 criteria met
- ✅ Server data fetching functions have test coverage
- ✅ API routes have integration tests
- ✅ Coverage threshold maintained (70%+)

### Ideal Testing (All Phases)

- ✅ All Recommended criteria met
- ✅ Navigation hooks verified/updated
- ✅ 80%+ test coverage across all code
- ✅ E2E tests cover critical user flows

---

## Timeline Estimate

| Phase                            | Time Estimate | Priority       |
| -------------------------------- | ------------- | -------------- |
| Phase 1: Fix Jest Config         | 30 minutes    | 🔴 CRITICAL    |
| Phase 2: Server Component Tests  | 2-3 hours     | 🟡 RECOMMENDED |
| Phase 3: API Route Tests         | 1-2 hours     | 🟡 RECOMMENDED |
| Phase 4: Navigation Verification | 1 hour        | 🟢 OPTIONAL    |
| Phase 5: Improved Coverage       | 4-8 hours     | 🔵 STRETCH     |

**Total for Phases 1-3**: ~4 hours
**Total for All Phases**: ~10-15 hours

---

## Risks and Mitigations

### Risk 1: Tests Fail After Jest Config Update

**Mitigation**: Run `npm test` after each config change, revert if needed

### Risk 2: Server Component Testing is Complex

**Mitigation**: Focus on testing data functions, not components directly

### Risk 3: API Route Tests Require New Patterns

**Mitigation**: Follow Next.js 15 testing documentation and examples

### Risk 4: Coverage Drops Below Threshold

**Mitigation**: Add exclusions for boilerplate files (layouts, loading, error)

---

## Next Steps

1. **IMMEDIATE**: Update `jest.config.js` (Phase 1)
2. **THIS WEEK**: Run full test suite and verify all pass
3. **NEXT WEEK**: Add server data tests (Phase 2)
4. **FOLLOWING WEEK**: Add API route tests (Phase 3)
5. **ONGOING**: Gradually improve coverage (Phase 5)

---

## References

- [Next.js App Router Testing Docs](https://nextjs.org/docs/app/building-your-application/testing/jest)
- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Jest Configuration Docs](https://jestjs.io/docs/configuration)

---

**Last Updated**: 2025-11-02
**Document Version**: 1.0
**Status**: Ready for Implementation
