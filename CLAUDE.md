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

### State Management Architecture (HYBRID - IMPORTANT)

The app is **currently in transition** from Recoil to Zustand:

- **Surface level**: Components use `useRecoilState` and `useRecoilValue` from 'recoil'
- **Under the hood**: These imports are intercepted by `atoms/compat.ts` compatibility shim
- **Actual state**: Stored in Zustand stores (`/stores/*.ts`)
- **Migration status**: Partial - using compatibility layer to bridge old components with new stores

**Active Zustand Stores**:

- `stores/authStore.ts` - Authenticated user data with Firebase sync
- `stores/guestStore.ts` - Guest user data with localStorage persistence
- `stores/sessionStore.ts` - Session management and user switching
- `stores/appStore.ts` - App-wide state (modals, search, toasts)

**Legacy Recoil Atoms** (kept for compatibility):

- `atoms/modalAtom.ts`, `searchAtom.ts`, `toastAtom.ts`, etc.
- These are mostly unused, with `atoms/compat.ts` redirecting to Zustand

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

### Authentication & User Data System

- **Firebase Auth** with multiple providers (Google, Email/Password)
- **Guest mode** for demo access without authentication
- **Data Storage**:
    - Authenticated users: Firebase Firestore at `/users/{userId}` document
    - Guest users: Browser localStorage at `nettrailer_guest_data_{guestId}`
    - Session persistence: localStorage for auth state across refreshes
- **User Isolation**: Each user has their own Firestore document, preventing data mixing
- **Race Condition Prevention**: User ID validation before all state updates

### Unified Toast Notification System

- **Single toast system** replacing previous dual-system approach (ErrorToast.tsx removed)
- **Six toast types** with consistent styling and positioning:
    - `success` - Green checkmark for successful operations
    - `error` - Red X mark for error messages (unified from old ErrorToast system)
    - `watchlist-add` - Blue plus icon for adding to watchlist
    - `watchlist-remove` - Orange minus icon for removing from watchlist
    - `content-hidden` - Red eye-slash for hiding content
    - `content-shown` - Green eye for showing content
- **Components**:
    - `Toast.tsx` - Individual toast with slide animations and auto-dismiss (5s)
    - `ToastContainer.tsx` - Right-aligned positioning with responsive margins
    - `ToastManager.tsx` - Recoil state bridge component
- **Integration**: `ErrorHandler` class now uses `showError()` from `useToast()` hook
- **State management**: `toastAtom.ts` with single toast display (replaces complex error state)

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

### User Data Isolation (Critical)

- The `authStore` tracks `userId` to prevent data mixing between users
- When switching users, stores are cleared before loading new data
- Auto-save in `useSessionData` validates user ID match before persisting
- Firebase operations include 5-second timeout to prevent hanging
- Auth data loads asynchronously in background while UI shows defaults

### Toast Notifications & Error Handling

- Use `useToast()` hook for all user notifications: `showSuccess()`, `showError()`, `showWatchlistAdd()`, etc.
- Use `createErrorHandler(showError)` from `utils/errorHandler.ts` for consistent error handling
- All errors are now displayed as toast notifications instead of separate error state
- API errors are automatically converted to user-friendly toast messages
- Only `loadingState` remains in errorAtom.ts (error state moved to unified toast system)

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

- **Zustand package**: Must be installed (`npm install zustand`) for stores to work
- The project has been migrated from pnpm to npm - always use npm commands
- Development server may run on port 3004 if 3000 is occupied
- TMDB API has rate limits (40 requests/second) - respect these in API calls
- Always clear build cache (`rm -rf .next`) if experiencing build issues
- Recoil atoms use versioned keys (e.g., `modalState_v1`) for cache busting when needed
- When working on state: New features should use Zustand stores directly, not Recoil atoms

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
