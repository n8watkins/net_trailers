# 🚨 Critical Issues in Net Trailer Project

## Security Issues

### 1. **CRITICAL: Exposed Firebase Configuration**
- **File**: `firebase.ts:9-16`
- **Issue**: Firebase API keys and configuration are hardcoded in source code
- **Risk**: API keys exposed in client-side code, potential for unauthorized access
- **Impact**: High - Could lead to unauthorized Firebase usage and data breaches

### 2. **API Key Exposure**
- **File**: `utils/requests.ts:1`
- **Issue**: TMDB API key uses `NEXT_PUBLIC_` prefix, exposing it client-side
- **Risk**: API key visible in browser, potential quota abuse
- **Impact**: Medium - Could lead to API rate limit exhaustion

## Functional Issues

### 3. **Unused Data Fetching**
- **File**: `pages/index.tsx:94-98`
- **Issue**: Fetching TV show data but not displaying it
- **Impact**: Unnecessary API calls, wasted bandwidth and processing
- **Code**: TV data fetched but commented out in UI (lines 57-61)

### 4. **Inconsistent Data Structure**
- **File**: `typings.d.ts:6-23`
- **Issue**: Movie interface mixing movie and TV show properties
- **Problem**: `title` vs `name`, `release_date` vs `first_air_date`
- **Impact**: Type confusion and potential runtime errors

### 5. **Poor Error Handling**
- **File**: `hooks/useAuth.tsx:95, 113`
- **Issue**: Using `alert()` for error messages
- **Problem**: Poor UX, not accessible, blocks UI
- **Additional**: No error handling in `pages/index.tsx:86-98` for API requests

### 6. **Missing Environment Configuration**
- **Issue**: No `.env` file found
- **Problem**: All configuration hardcoded, no environment separation
- **Impact**: Cannot configure different environments (dev/prod)

## Code Quality Issues

### 7. **Hardcoded UI Positioning**
- **File**: `pages/index.tsx:49`
- **Issue**: `top-[50em]` hardcoded positioning
- **Problem**: Not responsive, brittle layout

### 8. **Inefficient Array Randomization**
- **File**: `pages/index.tsx:100-102`
- **Issue**: `Math.random() - 0.5` is not truly random
- **Problem**: Biased shuffle algorithm

### 9. **Dead Code**
- **Files**: Multiple locations
- **Issues**:
  - Commented out console.logs (`hooks/useAuth.tsx:63`)
  - Unused variables in catch blocks (`hooks/useAuth.tsx:127-135`)
  - Commented out TV interface (`typings.d.ts:25-42`)

### 10. **Missing Dependencies**
- **Issue**: `node_modules` not installed
- **Problem**: Project cannot build or run
- **Command**: `npm run build` fails with "next: not found"

## Build and Development Issues

### 11. **No Testing Infrastructure**
- **Issue**: No test files found
- **Problem**: No quality assurance, regression protection
- **Missing**: Jest, React Testing Library, or similar

### 12. **Incomplete Package.json**
- **File**: `package.json`
- **Issues**:
  - No lint script
  - No test script
  - ESLint in dependencies instead of devDependencies

### 13. **Version Management**
- **File**: `package.json:16`
- **Issue**: Next.js version set to "latest"
- **Problem**: Unpredictable builds, potential breaking changes

## Performance Issues

### 14. **Inefficient Data Loading**
- **File**: `pages/index.tsx:85-98`
- **Issue**: All data fetched on every page load
- **Problem**: No caching, slow initial load
- **Missing**: ISR, SWR, or similar optimization

### 15. **Large Bundle Risk**
- **Issue**: No code splitting evident
- **Problem**: Potential large initial bundle
- **Missing**: Dynamic imports for components

## Accessibility Issues

### 16. **Alert-based Error Handling**
- **File**: `hooks/useAuth.tsx`
- **Issue**: Screen reader unfriendly alerts
- **Problem**: Poor accessibility for error messages

---

## Priority Levels:
- 🔴 **Critical**: Security issues (#1, #2)
- 🟠 **High**: Functional problems (#3, #4, #5, #6, #10)
- 🟡 **Medium**: Code quality (#7, #8, #9, #11, #12, #13)
- 🔵 **Low**: Performance and accessibility (#14, #15, #16)

## Immediate Actions Required:
1. Move Firebase config to environment variables
2. Fix API key exposure
3. Install dependencies (`pnpm install`)
4. Implement proper error handling
5. Clean up unused code and data fetching