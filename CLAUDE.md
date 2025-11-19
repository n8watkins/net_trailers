# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev          # Start development server (runs on port 3000 by default)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues automatically
npm run type-check   # Run TypeScript type checking without emitting files
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:ci      # Run tests in CI mode (no watch, with coverage)
npm run migrate:genres # Migrate existing collections from TMDB genre IDs to unified genre IDs
```

## Architecture Overview

### State Management Architecture (Zustand)

The app uses **Zustand** with **18 focused stores** (migrated from monolithic "god store"):

- **Direct store usage**: Components use Zustand hooks directly (e.g., `useAppStore()`, `useSessionStore()`)
- **No provider wrapper**: Zustand stores work without a root provider component
- **Type-safe selectors**: Use store selectors for optimal performance and type safety
- **Storage adapters**: FirebaseStorageAdapter (auth users) and LocalStorageAdapter (guests)
- **Store factory pattern**: createUserStore.ts for shared auth/guest store logic

**Zustand Stores** (18 total):

**Core App Stores**:

- `stores/appStore.ts` - App-wide state (loading indicators, global UI)
- `stores/sessionStore.ts` - Session management and user switching
- `stores/cacheStore.ts` - Content caching for improved performance

**User Data Stores**:

- `stores/authStore.ts` - Authenticated user data with Firebase sync
- `stores/guestStore.ts` - Guest user data with localStorage persistence
- `stores/profileStore.ts` - User profile data and public profiles
- `stores/watchHistoryStore.ts` - Watch history tracking

**UI & Feature Stores**:

- `stores/uiStore.ts` - UI preferences and settings
- `stores/modalStore.ts` - Content modal state and video player
- `stores/toastStore.ts` - Toast notification queue
- `stores/loadingStore.ts` - Loading states across app
- `stores/notificationStore.ts` - In-app notifications with real-time sync

**Search & Discovery Stores**:

- `stores/searchStore.ts` - Search state and filters
- `stores/smartSearchStore.ts` - AI search state and conversation
- `stores/customRowsStore.ts` - Custom collections (system + user-created)

**Safety & Community Stores**:

- `stores/childSafetyStore.ts` - Child safety PIN and settings
- `stores/rankingStore.ts` - Rankings, comments, and likes
- `stores/forumStore.ts` - Forum threads, polls, and community discussions

**Type Definitions**:

- `types/atoms.ts` - Shared type definitions (UserPreferences, UserSession, SessionType, etc.)
- `types/userLists.ts` - Collection types (CollectionType, UserList, AdvancedFilters, ShareSettings)
    - **Note**: `genres` field uses `string[]` (unified genre IDs) not `number[]` (TMDB IDs)
- `types/customRows.ts` - Custom row types with `string[]` genre fields
- `types/rankings.ts` - Ranking and comment types
- `types/forum.ts` - Forum types (Thread, ThreadReply, Poll, PollVote, ForumCategory, etc.)

### Content Type System

The app handles both movies and TV shows through a unified type system:

- **Base interface**: `BaseContent` for shared properties
- **Discriminated unions**: `Movie` and `TVShow` interfaces with `media_type` discriminator
- **Type guards**: `isMovie()` and `isTVShow()` for runtime type checking
- **Utility functions**: `getTitle()`, `getYear()`, `getContentType()`, `getRating()`, `getReleaseDate()`, `getRuntime()` for consistent property access across content types

### API Architecture

- **49 Internal API routes** (`/api/movies/*`, `/api/search`, `/api/gemini/*`, etc.) proxy TMDB API calls
- **TMDB integration** via query parameter authentication (`?api_key=...`) - TMDB API v3 requirement
- **Gemini AI integration** via `/api/gemini/analyze` and related endpoints for smart search
- **Comprehensive error handling** via `utils/errorHandler.ts` with user-friendly messages
- **Input sanitization** via `utils/inputSanitization.ts` on all Gemini API routes (XSS protection)
- **Rate limiting**: Respects TMDB's 40 requests/second limit

**Key API Routes**:

**Content Discovery**:

- `/api/search` - Multi-source search
- `/api/discover` - TMDB discover with filters
- `/api/random-content` - Surprise me feature
- `/api/movies/trending`, `/api/movies/top-rated`
- `/api/tv/trending`, `/api/tv/top-rated`
- `/api/genres/[type]/[id]` - Genre details

**AI & Smart Features**:

- `/api/gemini/analyze` - Semantic query analysis
- `/api/smart-search` - AI-powered search
- `/api/smart-suggestions/preview` - Live preview of results
- `/api/ai-suggestions` - Collection name suggestions
- `/api/generate-row` - Generate custom row from query
- `/api/surprise-query` - Random query generator

**Collections & Recommendations**:

- `/api/collections/duplicate` - Duplicate collection
- `/api/custom-rows/[id]/content` - Fetch row content
- `/api/recommendations/personalized` - For you recommendations
- `/api/recommendations/similar/[id]` - Similar content

**Sharing & Social**:

- `/api/shares/create` - Create share link
- `/api/shares/[shareId]` - Get shared content
- `/api/public-profile/[userId]` - Public profile data

**Cron Jobs**:

- `/api/cron/update-collections` - Auto-update collections (daily at 2 AM UTC)

### Authentication & User Data System

- **Firebase Auth** with multiple providers (Google, Email/Password)
- **Guest mode** for demo access without authentication
- **Data Storage**:
    - Authenticated users: Firebase Firestore at `/users/{userId}` document
    - Guest users: Browser localStorage at `nettrailer_guest_data_{guestId}`
    - Session persistence: localStorage for auth state across refreshes
- **User Isolation**: Each user has their own Firestore document, preventing data mixing
- **Race Condition Prevention**: User ID validation before all state updates
- **Public Profiles**: `/users/[userId]` routes show public profiles with rankings and collections

**Firestore Collections**:

```
/users/{userId}
  - Profile data, preferences, settings
  - customRows (sub-collection)
  - interactions (sub-collection, 90-day TTL)
  - notifications (sub-collection, 30-day auto-dismiss)
  - watchHistory (sub-collection)
  - childSafetyPIN (sub-document)

/rankings/{rankingId}
  - Public and private rankings
  - Indexed by userId, createdAt, likes, views

/rankingComments/{commentId}
  - Comments on rankings
  - Indexed by rankingId, createdAt

/rankingLikes/{likeId}
  - User likes on rankings

/threads/{threadId}
  - Discussion threads with replies
  - Indexed by category, createdAt, userId

/thread_replies/{replyId}
  - Replies to threads
  - Indexed by threadId, createdAt

/thread_likes/{likeId}
  - User likes on threads

/reply_likes/{likeId}
  - User likes on replies

/polls/{pollId}
  - Polls with voting options
  - Indexed by category, createdAt, userId

/poll_votes/{voteId}
  - User votes on polls
  - One vote per user per poll

/sharedCollections/{linkId}
  - Shared collection snapshots
  - Public read access
```

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
    - `ToastManager.tsx` - State bridge component
- **Integration**: `ErrorHandler` class uses `showError()` from `useToast()` hook
- **State management**: Managed by `toastStore.toasts` array with MAX_TOASTS limit

### Modal System

- **Centralized modal state** via `modalStore` with content selection and auto-play preferences
- **Video player integration** using ReactPlayer with YouTube trailers
- **Audio control logic**: Different behavior for "Play" vs "More Info" buttons
    - Play button: `openModal(content, true, true)` - starts with sound
    - More Info button: `openModal(content, true, false)` - starts muted

### Search Implementation

- **Real-time search** with 300ms debounce and 2+ character minimum
- **URL synchronization** with shallow routing to maintain search state
- **Race condition prevention** with proper cleanup and state management
- **Custom hook**: `useSearch()` manages search logic and API calls

### Smart Search (AI-Powered)

- **Natural language query understanding** powered by Google Gemini 2.5 Flash
- **Voice input** with live transcription using Web Speech API
- **Semantic concept recognition** ("rainy day vibes", "mind-bending thrillers")
- **Entity recognition** with autocomplete (`@actors`, `#directors`)
- **Auto-detection** of media type preferences
- **Save results** as custom collections
- **Live preview** shows result count as user types
- **Custom hooks**: `useVoiceInput()` for voice integration

### Custom Collections

- **Three collection types**:
    1. **Manual**: Hand-picked content with drag-and-drop reordering
    2. **TMDB Genre-Based**: Auto-updating collections based on genre filters
    3. **AI-Generated**: Created from natural language queries
- **Auto-updating**: Daily cron job (2 AM UTC) checks for new content
- **Visual indicators**: "Auto" badge, "+N" new items badge, "Updated X ago" timestamp
- **Limits**: 20 collections for authenticated users, 3 for guests
- **Advanced filters**: Year range, rating, cast, director, popularity, vote count
- **Sharing**: Generate shareable links with public view pages

#### Unified Genre System

The app uses a **unified genre system** that provides seamless genre handling across movies and TV shows:

**Core Concept:**

- Users see consistent genre names (Action, Fantasy, Sci-Fi, Romance, etc.) regardless of media type
- Behind the scenes, genres automatically map to correct TMDB genre IDs based on media type
- Collections store genres as string arrays like `['action', 'fantasy']` instead of numeric TMDB IDs

**Key Files:**

- `constants/unifiedGenres.ts` - 24 unified genre definitions with TMDB mappings
- `utils/genreMapping.ts` - Translation utilities (unified IDs ↔ TMDB IDs)
- `utils/collectionGenreUtils.ts` - Extract unified genres from content
- `scripts/migrate-genres-to-unified.ts` - Migration script for existing collections

**Storage Format:**

```typescript
// Old format (deprecated)
genres: [28, 14] // TMDB IDs

// New format (current)
genres: ['action', 'fantasy'] // Unified IDs
```

**Critical Mappings:**

- **Fantasy** → Movies: 14 (Fantasy) | TV: 10765 (Sci-Fi & Fantasy)
- **Sci-Fi** → Movies: 878 (Science Fiction) | TV: 10765 (Sci-Fi & Fantasy)
- **Romance** → Movies: 10749 (Romance) | TV: 18 (Drama - closest equivalent)
- **Action** → Movies: 28 (Action) | TV: 10759 (Action & Adventure)
- **Adventure** → Movies: 12 (Adventure) | TV: 10759 (Action & Adventure)
- **War** → Movies: 10752 (War) | TV: 10768 (War & Politics)

**Smart Deduplication:**
When users select multiple unified genres that map to the same TMDB genre, the system automatically deduplicates:

```typescript
// Example: User selects "Fantasy" + "Sci-Fi" for TV
// Both map to TMDB genre 10765 (Sci-Fi & Fantasy)
// System deduplicates to single API call with genre=10765
translateToTMDBGenres(['fantasy', 'scifi'], 'tv')
// Returns: [10765]  // Deduplicated!
```

**API Translation Layer:**
The `/api/custom-rows/[id]/content` route handles translation:

1. Receives collection with unified genres: `['fantasy', 'romance']`
2. Translates to TMDB IDs based on media type
3. For "both" media type, generates separate movie/TV genre sets
4. Makes TMDB API calls with correct genre IDs

**Type Definitions:**

- `types/userLists.ts` - `genres?: string[]` (unified IDs)
- `types/customRows.ts` - All genre fields use `string[]`
- `constants/unifiedGenres.ts` - `UnifiedGenre` interface with movie/TV ID mappings

**Migration:**
Existing collections can be migrated from TMDB IDs to unified IDs:

```bash
npm run migrate:genres
```

**Child Safety Integration:**
Each unified genre has a `childSafe` flag. When child safety mode is enabled, only child-safe genres appear in selectors.

### Rankings & Community

- **Create rankings** with drag-and-drop content and custom scores
- **Public/private** visibility controls
- **Community page** (`/community`) to browse public rankings, forums, and polls
- **Engagement**: Likes, view counts, threaded comment system
- **Comment features**: Nested replies, likes, delete by owner or ranking author
- **Sorting**: Recent, popular, most-liked, most-viewed, most-replied
- **Media type support**: Movies, TV shows, or mixed rankings

### Forum & Discussion Features

- **Discussion threads** with categorization (General, Movies, TV Shows, Recommendations, Rankings, Announcements)
- **Thread features**:
    - Create, read, update, delete threads
    - Reply system with nested support
    - Like/unlike threads and replies
    - View counts and engagement metrics
    - Thread owner can delete any replies
- **Polls system**:
    - Create polls with multiple options
    - Single or multiple-choice voting
    - Optional expiration dates
    - Real-time vote counting with percentages
    - Visual progress bars for results
    - Vote tracking per user (one vote per poll)
- **Forum categories**: General, Movies, TV Shows, Recommendations, Rankings, Announcements
- **Thread/Poll detail pages**:
    - `/community/thread/[id]` - Full thread view with replies
    - `/community/polls/[id]` - Interactive voting interface
- **Search & filtering**: Global search across threads and polls
- **Sorting options**: Recent, Popular, Most Replied, Most Voted
- **Authentication required**: All forum features require authentication (no guest access)
- **Firestore backend**: Full CRUD operations for threads, replies, polls, and votes
- **Security rules**: Comprehensive Firestore security rules for data protection

### Child Safety Mode

- **Content filtering** based on MPAA (movies) and TV ratings
- **Configurable threshold** in settings (G to NC-17 for movies, TV-Y to TV-MA for TV)
- **Server-side filtering** across all API routes
- **Cache invalidation** when mode changes
- **PIN protection**:
    - 4-digit numeric PIN with bcrypt encryption
    - Session-based verification
    - Required to disable child safety mode
    - Guest users cannot set PINs
    - Visual "PIN Protected" badge

### Personalization & Recommendations

- **Interaction tracking** (10 types):
    - view_modal (+1), add_to_watchlist (+3), remove_from_watchlist (-1)
    - like (+5), unlike (-5), play_trailer (+2)
    - hide_content (-5), unhide_content (+1), search (+1), voice_search (+1)
- **90-day data retention** with auto-cleanup
- **Genre preference calculation** from weighted interactions
- **"Recommended For You" row**:
    - Based on top 3 preferred genres
    - Hybrid algorithm (genre + TMDB similar content)
    - Minimum rating 7.0, sorted by popularity
    - Excludes already-seen content
    - 6-hour cache with smart refresh
- **Privacy controls**: Opt-out via `improveRecommendations` setting

### Notification System

- **In-app notifications** with bell icon in header
- **Real-time Firestore listeners** for immediate updates
- **Notification types**:
    - Collection updates (new content added via auto-update)
    - New releases (watchlist items released)
    - System announcements
    - Collection shares
    - Ranking comments and likes
- **Features**:
    - Mark as read (individual or bulk)
    - Auto-dismiss after 30 days
    - Click actions (navigate to content/collection)
    - Unread badge count

## Configuration Files

### Environment Variables (.env.local)

Required environment variables are documented in the file with setup instructions for:

- Firebase configuration (6 variables)
- TMDB API key (query parameter auth for v3 API)
- Google Gemini API key (for smart search)
- CRON_SECRET (for auto-updating collections)
- Sentry DSN (for error monitoring)
- Google Analytics measurement ID
- Resend API key (optional - for email notifications)

### Next.js Configuration

- **Image optimization** configured for TMDB and Netflix CDN domains
- **Sentry integration** with webpack plugin for error monitoring
- **Security headers**: X-Frame-Options, CSP, HSTS, etc.
- **Performance optimizations** with package import optimization (disabled for @heroicons/react due to runtime errors)

### Sentry Monitoring

- **Server-side**: Configured via `instrumentation.ts` (Next.js 15 standard)
- **Client-side**: Configured via `sentry.client.config.ts`
- **Error filtering**: Ignores common browser errors and protects user privacy

### Vercel Configuration (vercel.json)

- **Cron job**: Daily at 2 AM UTC for auto-updating collections
- **CRON_SECRET**: Security token to prevent unauthorized cron job execution

## Key Development Patterns

### Using Zustand Stores

**Store Selection Patterns:**

```typescript
// Select entire store
const { modal, openModal, closeModal } = useModalStore()

// Select specific slices (better performance)
const modal = useModalStore((state) => state.modal)
const openModal = useModalStore((state) => state.openModal)

// Select computed values
const showModal = useModalStore((state) => state.modal.isOpen)
```

**Common Store Actions:**

- `modalStore.openModal(content, autoPlay?, autoPlayWithSound?)` - Open content modal
- `toastStore.addToast(type, title, message?)` - Show toast notification
- `searchStore.setSearch(updater)` - Update search state
- `sessionStore.initializeAuthSession(userId)` - Initialize authenticated session
- `sessionStore.initializeGuestSession(guestId)` - Initialize guest session
- `customRowsStore.addCustomRow(row)` - Add custom collection
- `rankingStore.createRanking(ranking)` - Create new ranking
- `notificationStore.markAsRead(notificationId)` - Mark notification as read

### User Data Isolation (Critical)

- The `authStore` tracks `userId` to prevent data mixing between users
- When switching users, stores are cleared before loading new data
- Auto-save in `useSessionData` validates user ID match before persisting
- Firebase operations include 5-second timeout to prevent hanging
- Auth data loads asynchronously in background while UI shows defaults
- **Storage adapters**:
    - FirebaseStorageAdapter for authenticated users (real-time sync)
    - LocalStorageAdapter for guest users (no cloud sync)

### Toast Notifications & Error Handling

- Use `useToast()` hook for all user notifications: `showSuccess()`, `showError()`, `showWatchlistAdd()`, etc.
- Use `createErrorHandler(showError)` from `utils/errorHandler.ts` for consistent error handling
- All errors are displayed as toast notifications
- API errors are automatically converted to user-friendly toast messages
- Loading state managed by `loadingStore.isLoading` and `loadingStore.setLoading()`

### Content Rendering

- Always use type-safe utility functions (`getTitle()`, `getYear()`, etc.) instead of direct property access
- Check content type with `isMovie()` or `isTVShow()` before accessing type-specific properties
- Use the discriminated union pattern for type safety

### State Updates

- Modal state changes should update all related atoms atomically
- Search state requires proper debouncing and URL synchronization
- Loading states should be set before async operations and cleared after
- Collections should validate media type before adding content

### Genre Handling

- **Always use unified genre IDs** (`string[]`) not TMDB genre IDs (`number[]`)
- Use `getUnifiedGenresByMediaType(mediaType)` to get available genres for genre selectors
- Use `translateToTMDBGenres(unifiedGenres, mediaType)` when making TMDB API calls
- Use `inferTopGenresFromContent(content, limit)` to extract genres from content items
- For collections with media type "both", use `translateToTMDBGenresForBoth(unifiedGenres)`
- Genre deduplication happens automatically in translation utilities
- Child safety filtering: Use `getChildSafeUnifiedGenres(mediaType)` to filter genres

### Testing

- Jest configured with React Testing Library and jsdom environment
- Tests should cover both movie and TV show content types
- Mock TMDB API responses in tests using the established patterns
- Mock Gemini AI responses for smart search tests
- Test Firestore operations with mock adapters

## Important Notes

- **Zustand package**: Already installed and configured for all state management (17 focused stores)
- The project has been migrated from pnpm to npm - always use npm commands
- Development server runs on port 3000 by default
- TMDB API has rate limits (40 requests/second) - respect these in API calls
- **TMDB API v3**: Uses query parameter authentication (`?api_key=...`), NOT Bearer tokens
- Always clear build cache (`rm -rf .next`) if experiencing build issues
- When working on state: Use Zustand stores directly (`useAppStore`, `useSessionStore`, etc.)
- **Smart Search**: Requires NEXT_PUBLIC_GEMINI_API_KEY environment variable
- **Auto-updating collections**: Requires CRON_SECRET environment variable
- **Unified Genre System**: Collections use `string[]` (unified IDs) not `number[]` (TMDB IDs)
    - Always translate to TMDB IDs before making API calls
    - Use utilities from `utils/genreMapping.ts` for translation
    - Migration script available: `npm run migrate:genres`

## Development Server Management

- **CRITICAL**: Kill existing dev servers before starting new ones to prevent multiple concurrent servers
- Use `KillShell` tool to terminate background processes before running new `npm run dev` commands
- Multiple dev servers cause port conflicts, performance issues, and build corruption
- Always check for running background bash processes and clean them up
- **IMPORTANT**: When creating development servers for testing purposes, ALWAYS kill them afterwards to prevent accumulation of background processes
- Clean up test servers immediately after verification to maintain system performance

## Component Architecture

### Component Organization (35,682 lines across 100+ components)

**Key component directories**:

- `components/auth/` - Authentication modals and account management
- `components/collections/` - Collection management UI
- `components/customRows/` - Custom row wizard and editor
    - `components/customRows/smart/` - Smart search components
- `components/rankings/` - Ranking creator, detail, cards, comments
- `components/smartSearch/` - AI search overlay and results
- `components/notifications/` - Notification panel
- `components/settings/` - Settings sections including child safety
- `components/sharing/` - Share modal and management
- `components/modals/` - Info modal and related components
    - `components/modals/list-selection/` - List selection modal (17 sub-components)
- `components/recommendations/` - Recommended for you row

### Recent Refactoring

- **ListSelectionModal**: Split from 1000-line monolith to 357 lines + 17 sub-components
- **Store migration**: All components migrated from useAppStore to focused stores
- **Component splitting**: Phase 1-7 refactoring documented in docs/

## Feature Flags & Toggles

- **Child Safety Mode**: Enable/disable via settings, requires PIN to disable
- **Improve Recommendations**: Privacy control for interaction tracking
- **Portfolio Banner**: Toggleable in settings
- **Auto-update Collections**: Per-collection toggle

## API Security

- **TMDB API Key**: Never exposed to client (server-side only)
- **Gemini API Key**: Public key (rate-limited by Google)
- **CRON_SECRET**: Protects cron job endpoints from unauthorized access
- **Input sanitization**: All Gemini API routes use isomorphic-dompurify
- **Firestore security rules**: Deployed from `firestore.rules`
- **Security headers**: CSP, HSTS, X-Frame-Options, etc.

## User Assets

- **Screenshots**: User screenshots are stored in `/home/natkins/win-res/screenshots`
- When the user mentions screenshots, check this directory using the Read or Glob tools
- Screenshots may contain setup instructions, error messages, or UI mockups relevant to development tasks

## Key Metrics

- **Codebase size**: 35,682 lines (components), ~50,000+ total (estimated)
- **Total commits**: 378+
- **Features completed**: 12 major feature sets
- **Documentation**: 55+ markdown files
- **API routes**: 30+
- **Zustand stores**: 17 focused stores
- **Components**: 100+ React components
- **Development time**: ~3 months active development
