# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev          # Start development server (runs on port 3000, or 3004 if 3000 is occupied)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically
npm run type-check   # Run TypeScript type checking without emitting files
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:ci      # Run tests in CI mode (no watch, with coverage)
```

## Architecture Overview

### State Management Architecture
- **Recoil** is used for global state management with atoms organized by domain:
  - `modalAtom.ts`: Modal state, current content, and auto-play preferences
  - `searchAtom.ts`: Search query, results, and loading states
  - `errorAtom.ts`: Global error handling and loading states
  - `userDataAtom.ts`: User authentication and profile data

### Content Type System
The app handles both movies and TV shows through a unified type system:
- **Base interface**: `BaseContent` for shared properties
- **Discriminated unions**: `Movie` and `TVShow` interfaces with `media_type` discriminator
- **Type guards**: `isMovie()` and `isTVShow()` for runtime type checking
- **Utility functions**: `getTitle()`, `getYear()`, `getContentType()` for consistent property access across content types

### API Architecture
- **Internal API routes** (`/api/movies/*`, `/api/search`) proxy TMDB API calls
- **TMDB integration** via `utils/tmdbApi.ts` with error handling and rate limiting
- **Comprehensive error handling** via `utils/errorHandler.ts` with user-friendly messages

### Authentication System
- **Firebase Auth** with multiple providers (Google, Email/Password)
- **Guest mode** for demo access without authentication
- **State persistence** via Recoil atoms with Firebase integration

### Modal System
- **Centralized modal state** with content selection and auto-play preferences
- **Video player integration** using ReactPlayer with YouTube trailers
- **Audio control logic**: Different behavior for "Play" vs "More Info" buttons
  - Play button: `autoPlayWithSoundState(true)` - starts with sound
  - More Info button: `autoPlayWithSoundState(false)` - starts muted

### Search Implementation
- **Real-time search** with 300ms debounce and 2+ character minimum
- **URL synchronization** with shallow routing to maintain search state
- **Race condition prevention** with proper cleanup and state management
- **Custom hook**: `useSearch()` manages search logic and API calls

## Configuration Files

### Environment Variables (.env.local)
Required environment variables are documented in the file with setup instructions for:
- Firebase configuration (6 variables)
- TMDB API key
- Sentry DSN (for error monitoring)
- Google Analytics measurement ID

### Next.js Configuration
- **Image optimization** configured for TMDB and Netflix CDN domains
- **Sentry integration** with webpack plugin for error monitoring
- **Performance optimizations** with package import optimization for @heroicons/react

### Sentry Monitoring
- **Server-side**: Configured via `instrumentation.ts` (Next.js 15 standard)
- **Client-side**: Configured via `sentry.client.config.ts`
- **Error filtering**: Ignores common browser errors and protects user privacy

## Key Development Patterns

### Error Handling
- Use `createErrorHandler()` from `utils/errorHandler.ts` for consistent error handling
- Errors are managed via `errorsState` and `loadingState` atoms
- API errors are automatically converted to user-friendly messages

### Content Rendering
- Always use type-safe utility functions (`getTitle()`, `getYear()`, etc.) instead of direct property access
- Check content type with `isMovie()` or `isTVShow()` before accessing type-specific properties
- Use the discriminated union pattern for type safety

### State Updates
- Modal state changes should update all related atoms atomically
- Search state requires proper debouncing and URL synchronization
- Loading states should be set before async operations and cleared after

### Testing
- Jest configured with React Testing Library and jsdom environment
- Tests should cover both movie and TV show content types
- Mock TMDB API responses in tests using the established patterns

## Important Notes

- The project has been migrated from pnpm to npm - always use npm commands
- Development server may run on port 3004 if 3000 is occupied
- TMDB API has rate limits (40 requests/second) - respect these in API calls
- Always clear build cache (`rm -rf .next`) if experiencing build issues
- Recoil atoms use versioned keys (e.g., `modalState_v1`) for cache busting when needed

## Development Server Management

- **CRITICAL**: Kill existing dev servers before starting new ones to prevent multiple concurrent servers
- Use `KillShell` tool to terminate background processes before running new `npm run dev` commands
- Multiple dev servers cause port conflicts, performance issues, and build corruption
- Always check for running background bash processes and clean them up
- **IMPORTANT**: When creating development servers for testing purposes, ALWAYS kill them afterwards to prevent accumulation of background processes
- Clean up test servers immediately after verification to maintain system performance

## User Assets

- **Screenshots**: User screenshots are stored in `/home/natkins/win-res/screenshots`
- When the user mentions screenshots, check this directory using the Read or Glob tools
- Screenshots may contain setup instructions, error messages, or UI mockups relevant to development tasks