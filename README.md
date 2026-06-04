# 🎬 NetTrailer

**Full-Stack Movie & TV Show Discovery Platform with AI-Powered Search**

A Netflix-inspired streaming discovery platform built with modern web technologies, featuring user authentication, AI-powered smart search, custom collections, community rankings, personalized recommendations, and child safety controls.

## 🚀 Tech Stack

<div align="center">

| Frontend          | Backend              | Database         | APIs             | Styling             | State Management | Monitoring              | Testing     |
| ----------------- | -------------------- | ---------------- | ---------------- | ------------------- | ---------------- | ----------------------- | ----------- |
| ▲ **Next.js 16**  | 🔥 **Firebase**      | 🔥 **Firestore** | 🎬 **TMDB**      | 🎨 **Tailwind CSS** | 🐻 **Zustand**   | 🛡️ **Sentry**           | 🧪 **Jest** |
| **TS TypeScript** | 🔐 **Firebase Auth** | 📧 **Resend**    | 🤖 **Gemini AI** | 🎭 **Material-UI**  |                  | 📊 **GA4**              | 🧪 **RTL**  |
| ⚛️ **React 19**   |                      |                  |                  | 🦸 **Heroicons**    |                  | 📈 **Vercel Analytics** |             |

</div>

## ✨ Features

### 🔐 Authentication & User Management

- **Multi-Provider Authentication**
    - Email/Password signup & login with password reset
    - Google OAuth integration
    - Guest mode for demo access (no registration required)
    - Secure session management with localStorage persistence
    - Seamless user switching between authenticated and guest accounts
    - Public user profiles with customizable username, avatar, and bio
    - Public profiles display user's public rankings (collections remain private)

### 🎬 Content Discovery

- **Movies & TV Shows**
    - Browse trending, top-rated, and genre-specific content
    - Unified content type system supporting both movies and TV shows
    - Dedicated pages for Movies (`/movies`) and TV Shows (`/tv`)
    - Genre browsing with dynamic filtering
    - High-quality trailer playback with YouTube integration
    - "Surprise Me" random content discovery

- **Advanced Search**
    - Real-time search with 300ms debounce
    - Search suggestions dropdown with autocomplete
    - Advanced filters (genre, year, rating, content type, popularity, vote count)
    - Cast and crew filtering
    - URL synchronization for shareable search results
    - Minimum 2-character query with race condition prevention

- **Smart Search (AI-Powered)** 🤖
    - Natural language query understanding powered by Google Gemini AI
    - Voice input with live transcription (Web Speech API)
    - Semantic concept recognition ("rainy day vibes", "mind-bending thrillers")
    - Auto-detection of media type preferences
    - Save AI search results as custom collections
    - Live result count preview

### 📚 Content Management

- **Custom Collections** (up to 20 for authenticated users, 3 for guests)
    - **Three Collection Types**:
        - **Manual**: Hand-picked content with drag-and-drop reordering
        - **TMDB Genre-Based**: Auto-updating collections based on genre filters
        - **AI-Generated**: Created from natural language queries
    - Advanced filters (year range, rating, cast, director, popularity)
    - Auto-updating collections with daily cron jobs
    - Custom colors and emoji icons for personalization
    - Display as rows on home/movies/tv pages
    - Duplicate collections for variations

- **Default Lists**
    - Watchlist (primary collection)
    - Liked content with dedicated `/liked` page
    - Hidden content with `/hidden` page management

- **Collection Sharing**
    - Generate unique shareable links with public view pages
    - Open Graph meta tags for rich social media previews
    - View analytics (view count, timestamp)
    - Revocable share links (toggle active/inactive)
    - Manage all share links in one interface
    - **Link-only sharing**: Collections are private by default, shareable only via explicit links
    - No public collection browsing or discovery

### 🏆 Rankings & Community

- **Create Rankings**
    - Drag-and-drop ranking creation with custom scores
    - Support for movies, TV shows, or mixed content
    - Public or private visibility controls
    - Custom titles, descriptions, and cover images
    - Edit existing rankings anytime
    - **Note**: Rankings support public/private visibility; collections use link-only sharing

- **Community Page** (`/community`)
    - Browse public rankings from all users
    - Sort by recent, popular, most-liked, most-viewed
    - Filter by media type
    - Search rankings by title/description
    - Tabbed interface: Rankings, Discussions, Polls

- **Engagement Features**
    - Like rankings (one per user)
    - View count tracking
    - Threaded comment system with nested replies
    - Comment likes and engagement
    - Delete comments (owner or ranking author)
    - Public profile pages showing user's public rankings (collections are private)

### 💬 Forum & Discussion System

- **Discussion Threads**
    - Create threads with rich text and image uploads
    - Categorized discussions (General, Movies, TV Shows, Recommendations, Rankings, Announcements)
    - Reply to threads with nested conversation support
    - Thread author can delete any replies for moderation
    - Like/unlike threads and replies
    - View counts and engagement metrics
- Detail pages at `/community/thread/[id]`

- **Polls & Voting**
    - Create polls with multiple choice options (2-10 options)
    - Single or multiple-choice voting modes
    - Optional expiration dates for time-limited polls
    - Real-time vote counting with percentages
    - Visual progress bars showing vote distribution
    - One vote per user per poll (tracked via Firestore)
    - Vote tracking prevents duplicate votes
    - Detail pages at `/community/polls/[id]`

- **Image Upload Support**
    - Upload images to threads and forum posts
    - Firebase Storage integration with security rules
    - Image preview and optimization
    - Automatic image resizing for performance

- **Moderation & Safety**
    - Report inappropriate content (threads, replies, polls)
    - Thread owners can delete replies
    - Authentication required for all forum features
    - Comprehensive Firestore security rules

- **Search & Discovery**
    - Global search across threads and polls
    - Filter by category and media type
    - Sort by recent, popular, most replied, most voted
    - Pagination for better performance

### 👶 Child Safety Mode

- **Content Filtering**
    - MPAA ratings for movies (G, PG, PG-13, R, NC-17)
    - TV ratings (TV-Y, TV-Y7, TV-G, TV-PG, TV-14, TV-MA)
    - Configurable rating threshold in settings
    - Server-side filtering across all API routes
    - Cache invalidation when mode changes

- **PIN Protection**
    - 4-digit numeric PIN requirement
    - Encrypted storage with bcrypt-style hashing
    - Session-based verification
    - PIN setup/change/remove in settings
    - Visual "PIN Protected" badge
    - Required to disable child safety mode
    - Guest users cannot set PINs

### 🎯 Personalization & Recommendations

- **Interaction Tracking** (10 types)
    - View modal, add/remove from watchlist, like/unlike
    - Play trailer, hide/unhide content, search, voice search
    - 90-day data retention with auto-cleanup

- **Weighted Scoring Algorithm**
    - Like (+5), Add to Watchlist (+3), Play Trailer (+2), View (+1)
    - Hide Content (-5), Remove from Watchlist (-1)
    - Genre preference calculation from weighted interactions
    - Minimum 10 interactions for accurate recommendations

- **"Recommended For You" Row**
    - Personalized based on top 3 preferred genres
    - Hybrid algorithm (genre + TMDB similar content)
    - Minimum rating 7.0, sorted by popularity
    - Excludes already-seen content
    - 6-hour cache with smart refresh
    - Opt-out via privacy controls

### 🔔 Notification System

- **In-App Notifications**
    - Bell icon in header with unread badge
    - Dropdown panel with recent notifications
    - Real-time Firestore listeners

- **Notification Types**
    - Collection updates (new content added via auto-update)
    - New releases (watchlist items released)
    - System announcements
    - Collection shares
    - Ranking comments and likes

- **Features**
    - Mark as read (individual or bulk)
    - Auto-dismiss after 30 days
    - Click actions (navigate to content/collection)
    - Future: Email notifications via Resend

### 👤 User Experience

- **Interface & Design**
    - Responsive design for all devices (mobile, tablet, desktop)
    - Netflix-inspired UI/UX with smooth animations and cinematic styling
    - Consistent atmospheric hero sections across major pages with theme-specific gradients:
        - Notifications (red/rose), Ratings (purple/violet), Rankings (yellow/amber)
        - Collections (blue/cyan), Settings (gray/slate), Security (green), Changelog (blue)
    - Glowing icons with drop-shadow effects and animated gradient backgrounds
    - Backdrop blur effects and rounded-2xl design language throughout
    - Keyboard shortcuts for power users (press `?` to view)
    - Dark mode optimized interface
    - Lazy-loaded content rows for optimal performance
    - Portfolio banner (toggleable in settings)

- **Smart Features**
    - Interactive tutorial for new users
    - Real-time data synchronization
    - Comprehensive error handling with user-friendly messages
    - Toast notification system (6 types: success, error, watchlist operations, content visibility)
    - Watch history tracking
    - Analytics integration (GA4, Vercel Analytics)

#### 🔐 Admin Portal

- **Admin Dashboard** (`/admin`) - Portfolio management center
    - Real-time statistics overview (accounts, signups, activity, system health)
    - Account usage visualization with limit tracking
    - Demo reset controls for portfolio presentations
    - Trending notification system controls (production/demo modes)
    - Active users monitoring (top 10 most active)
    - System logs viewer
    - **Email Composer** - Send announcement and custom HTML emails to users

- **Admin Pages**
    - `/admin/accounts` - User management with filtering, search, and CSV export
    - `/admin/signups` - Signup timeline with weekly/monthly views
    - `/admin/activity` - Activity analytics with login and page view tracking
    - `/admin/trending-stats` - Trending notification statistics

- **Email System** (Resend Integration)
    - **Announcement Emails** - Send plain text announcements with subject and message
    - **Custom HTML Emails** - Rich text editor with TipTap for formatted content
    - **User Filtering** - Send to all users, authenticated only, or guest users only
    - **Email Preview** - Preview emails before sending with live rendering
    - **Rate Limiting** - 100 emails/hour per admin, 3 emails/day per recipient
    - **XSS Protection** - DOMPurify sanitization on all custom HTML content
    - **HTTPS-Only Links** - Security enforced on all email links
    - **CAN-SPAM Compliance** - Automatic unsubscribe token generation
    - **Email History** - Track sent emails with counts and metadata (PII minimized)

- **Security**
    - Dual-layer authentication (client routing + server Firebase ID token validation)
    - Admin UID-based authorization (server-side only, not exposed to client)
    - Rate limiting on public endpoints (30 requests/minute per IP)
    - Email rate limiting (100/hour admin, 3/day recipient)
    - Input validation and sanitization
    - CSRF protection via authenticatedFetch
    - Firebase Admin SDK for secure server operations

- **Analytics Tracking**
    - Automatic page view tracking (excludes admin routes)
    - Login activity monitoring
    - User engagement metrics
    - Activity filtering by user, type, and timeframe
    - Timeline visualization grouped by day

- **Account Limits**
    - Configurable account cap (default: 50 accounts)
    - Real-time usage tracking via Firestore
    - Demo reset to 5 accounts for portfolio demos
    - Signup velocity monitoring (daily/weekly/monthly)

## 🛠 Developer Features

- **Code Quality**
    - TypeScript 5.9 for type safety across the entire codebase
    - ESLint 9 with automatic fixes on commit (lint-staged + Husky)
    - Prettier 3 for consistent code formatting
    - Comprehensive Jest 30 test suite with React Testing Library 16
    - Test coverage reporting

- **Architecture**
    - **18 Focused Zustand Stores**: Migrated from monolithic "god store" to granular stores
        - appStore, authStore, guestStore, sessionStore, cacheStore
        - searchStore, loadingStore, uiStore, childSafetyStore
        - customRowsStore, smartSearchStore, modalStore, toastStore
        - watchHistoryStore, rankingStore, notificationStore, profileStore
        - forumStore
    - Next.js 16 with React 19 and App Router patterns
    - Firebase Firestore with optimistic updates and real-time sync
    - **49 API routes** organized by feature
    - Sentry error monitoring (client & server-side)
    - Google Analytics 4 integration
    - Vercel Analytics for performance insights
    - Bundle analyzer for optimization

## 🎯 Live Demo

[🚀 **Try NetTrailer Live**](https://your-deployment-url.com)

_Experience all features or continue as guest to explore the platform_

## 🛠 Installation & Setup

### Prerequisites

- Node.js 18.x or higher
- npm (project migrated from pnpm to npm)
- Firebase project (free tier available)
- TMDB API key (free from themoviedb.org)
- Google Gemini API key (free from ai.google.dev)

### Setup Steps

1. **Clone the repository**

    ```bash
    git clone https://github.com/yourusername/net_trailers.git
    cd net_trailers
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Environment Variables**

    Create a `.env.local` file in the root directory with the following variables:

    ```env
    # Firebase Configuration (Required)
    # Get these from: https://console.firebase.google.com/
    # Project Settings > General > Your apps > SDK setup and configuration
    NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

    # TMDB API (Required)
    # Get your free API key from: https://www.themoviedb.org/settings/api
    TMDB_API_KEY=your_tmdb_api_key

    # Google Gemini AI (Required for Smart Search)
    # Get your free API key from: https://ai.google.dev/
    NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

    # Cron Job Security (Required for auto-updating collections)
    CRON_SECRET=your_random_secret_string

    # Admin Portal (Required for admin access - SERVER-SIDE ONLY)
    # Get your Firebase UID from: Firebase Console > Authentication > Users > Copy UID
    # IMPORTANT: This is intentionally NOT prefixed with NEXT_PUBLIC_ to keep it server-side only
    # Admin credentials are never exposed to client bundles for security
    ADMIN_UID=your_firebase_uid_here

    # Firebase Admin SDK (Required for admin API endpoints)
    # Get from: Firebase Console > Project Settings > Service Accounts > Generate new private key
    # These credentials allow server-side admin operations
    FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
    FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

    # Account Limits (Optional - defaults to 50)
    NEXT_PUBLIC_MAX_TOTAL_ACCOUNTS=50

    # App Configuration (Optional)
    NEXT_PUBLIC_APP_NAME=NetTrailer
    NEXT_PUBLIC_APP_URL=http://localhost:3000
    NODE_ENV=development

    # Sentry Error Monitoring (Optional but recommended for production)
    # Get these from: https://sentry.io/
    NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
    SENTRY_ORG=your_sentry_org
    SENTRY_PROJECT=your_sentry_project

    # Google Analytics 4 (Optional)
    # Get from: https://analytics.google.com/
    NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

    # Email Notifications (Optional - for admin email system)
    # Get from: https://resend.com/
    RESEND_API_KEY=your_resend_api_key
    # Sender email address (defaults to onboarding@resend.dev if not set)
    RESEND_SENDER_EMAIL=noreply@yourdomain.com
    ```

4. **Firebase Setup**

    Enable the following in your Firebase project:
    - **Authentication > Sign-in method**:
        - Email/Password
        - Google
    - **Firestore Database** (in production mode)
    - **Firestore Security Rules**: Deploy the rules from `firestore.rules`
    - **Firestore Indexes**: Create composite indexes as needed (Firebase will prompt)

5. **Admin Portal Setup** (Required for admin access)

    a. **Get your Firebase Admin UID**:
    - Go to Firebase Console > Authentication > Users
    - Create your admin account (via Email/Password or Google)
    - Copy your User UID from the user list
    - Add to `.env.local` as `ADMIN_UID` (server-side only, not exposed to client)

    b. **Generate Firebase Admin SDK credentials**:
    - Go to Firebase Console > Project Settings > Service Accounts
    - Click "Generate new private key"
    - Download the JSON file
    - Extract the following fields to `.env.local`:
        - `FIREBASE_ADMIN_PRIVATE_KEY` (include the full key with `\n` characters)
        - `FIREBASE_ADMIN_CLIENT_EMAIL`

    c. **Initialize account statistics** (first-time setup):

    ```bash
    # After starting the dev server, call the init endpoint
    curl -X POST http://localhost:3000/api/admin/init-stats \
      -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"
    ```

    Or access `/admin` in your browser after logging in with your admin account - it will auto-initialize.

    d. **Access the admin dashboard**:
    - Start the dev server: `npm run dev`
    - Log in with your admin Firebase account
    - Navigate to `/admin` in your browser
    - You should see the admin dashboard with statistics

    **Admin Features**:
    - Account management and limits
    - User activity tracking
    - Signup timeline and statistics
    - Trending notification controls
    - Demo reset for portfolio presentations

6. **Vercel Cron Job Setup** (Optional - for auto-updating collections and trending notifications)

    The project includes two cron jobs configured in `vercel.json`:

    ```json
    {
        "crons": [
            {
                "path": "/api/cron/update-collections",
                "schedule": "0 2 * * *"
            },
            {
                "path": "/api/cron/update-trending",
                "schedule": "0 */6 * * *"
            }
        ]
    }
    ```

    - **update-collections**: Runs daily at 2 AM UTC to refresh auto-updating collections
    - **update-trending**: Runs every 6 hours to check for new trending content

    Both cron jobs can also be triggered manually from the admin dashboard.

7. **Run the development server**

    ```bash
    npm run dev
    ```

    The server will start on port 3000 by default

8. **Open your browser**

    Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Available Scripts

### Development

```bash
npm run dev           # Start development server (safe start with port checking)
npm run dev:next      # Start Next.js dev server with polling (for WSL/Docker)
npm run dev:turbo     # Start with Turbopack (experimental, faster builds)
```

### Build & Production

```bash
npm run build         # Build for production
npm run start         # Start production server
npm run analyze       # Analyze bundle size with webpack analyzer
```

### Code Quality

```bash
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues automatically
npm run type-check    # Run TypeScript type checking (no emit)
```

### Testing

```bash
npm test              # Run Jest tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run test:ci       # Run tests in CI mode (for GitHub Actions)
```

### User Data Management (Development)

```bash
npm run test:persistence        # Test data persistence flow
npm run test:create-user        # Create test user in Firestore
npm run test:verify-user        # Verify test user data
npm run test:user-watchlist     # Test user watchlist functionality
npm run test:clear-user         # Clear test user data
npm run delete-all-user-data    # Delete all user data (DANGER)
```

### Git Hooks

```bash
npm run prepare       # Install Husky git hooks
```

> **Note**: The project uses lint-staged with Husky to automatically lint and format code on commit.

## 🏗 Project Structure

```
net_trailers/
├── app/                  # Next.js 16 App Router
│   ├── page.tsx          # Home page with trending content
│   ├── movies/           # Movies-only page
│   ├── tv/               # TV shows-only page
│   ├── search/           # Search results page
│   ├── smart-search/     # AI-powered smart search page
│   ├── rankings/         # Rankings management
│   │   ├── page.tsx      # User rankings dashboard
│   │   ├── new/          # Create new ranking
│   │   └── [id]/         # View/edit ranking
│   ├── community/        # Community hub with rankings, threads, polls
│   │   ├── page.tsx      # Main community page with tabs
│   │   ├── threads/[id]/ # Thread detail pages
│   │   └── polls/[id]/   # Poll detail pages
│   ├── collections/      # Collection management
│   ├── watchlists/       # Custom watchlists
│   ├── liked/            # Liked content page
│   ├── hidden/           # Hidden content page
│   ├── settings/         # User settings
│   ├── users/[userId]/   # Public user profiles
│   ├── share/[shareId]/  # Shared collection view
│   ├── genres/           # Genre browsing pages
│   │   └── [type]/[id]/  # Dynamic genre pages
│   └── api/              # API routes (30+ endpoints)
│       ├── movies/       # Movie-related endpoints
│       ├── tv/           # TV show-related endpoints
│       ├── search/       # Search endpoint
│       ├── gemini/       # Gemini AI endpoints
│       ├── smart-search/ # AI search endpoints
│       ├── recommendations/ # Personalized recommendations
│       ├── collections/  # Collection management
│       ├── shares/       # Sharing endpoints
│       ├── forum/        # Forum threads, polls, replies endpoints
│       ├── cron/         # Cron job endpoints
│       └── ...
│
├── components/           # 100+ React components (35,682 lines)
│   ├── auth/             # AuthModal, AccountManagement
│   ├── collections/      # CollectionRowLoader, CollectionEditorModal
│   ├── common/           # Toast, LoadingSpinner, EmptyState, ErrorBoundary
│   ├── content/          # VideoPlayer, WatchLaterButton, MyListsDropdown
│   ├── customRows/       # CustomRowWizard, SortableCustomRowCard
│   │   └── smart/        # SmartRowBuilder, SmartInput, SmartStep3Preview
│   ├── debug/            # DebugControls, WebVitalsHUD, FirebaseCallTracker
│   ├── layout/           # PortfolioBanner, Footer, Header, ClientLayout
│   ├── modal/            # MoreLikeThisSection
│   ├── modals/           # InfoModal, AuthModal, CollectionEditorModal
│   │   ├── list-selection/    # ListSelectionModal components (17 files)
│   │   └── modal-sections/    # ModalVideoPlayer, VideoControls
│   ├── forum/            # Forum components
│   │   ├── CreateThreadModal.tsx  # Thread creation modal
│   │   ├── CreatePollModal.tsx    # Poll creation modal
│   │   ├── ThreadCard.tsx         # Thread preview card
│   │   ├── PollCard.tsx           # Poll preview card
│   │   ├── ImageUpload.tsx        # Image upload component
│   │   └── ReportModal.tsx        # Content reporting modal
│   ├── notifications/    # NotificationPanel
│   ├── pages/            # MoviesClient, TVClient, SmartSearchClient
│   ├── rankings/         # RankingCreator, RankingDetail, RankingCard, CommentSection
│   ├── recommendations/  # RecommendedForYouRow
│   ├── search/           # SearchBar, SearchFilters, SearchSuggestionsDropdown
│   ├── settings/         # ProfileSection, NotificationsSection, ChildSafetyPINModal
│   ├── sharing/          # ShareModal, ManageSharesModal
│   ├── smartSearch/      # SmartSearchOverlay, SmartSearchResults, SmartSearchInput
│   └── utility/          # Analytics, SessionSyncManager, KeyboardShortcuts
│
├── stores/               # 18 Focused Zustand Stores
│   ├── appStore.ts       # Global UI state
│   ├── authStore.ts      # Authenticated user data (Firestore sync)
│   ├── guestStore.ts     # Guest user data (localStorage)
│   ├── sessionStore.ts   # Session management & user switching
│   ├── cacheStore.ts     # Client-side API response caching
│   ├── searchStore.ts    # Search state and filters
│   ├── loadingStore.ts   # Loading states across app
│   ├── uiStore.ts        # UI preferences and modal state
│   ├── childSafetyStore.ts    # Child safety PIN and settings
│   ├── customRowsStore.ts     # Custom collections
│   ├── smartSearchStore.ts    # AI search state and conversation
│   ├── modalStore.ts     # Content modal state and video player
│   ├── toastStore.ts     # Toast notification queue
│   ├── watchHistoryStore.ts   # Watch history tracking
│   ├── rankingStore.ts   # Rankings, comments, likes
│   ├── forumStore.ts     # Forum threads, polls, votes, replies
│   ├── notificationStore.ts   # In-app notifications
│   └── profileStore.ts   # User profile data
│
├── hooks/                # Custom React hooks
│   ├── useAuth.tsx       # Authentication hook
│   ├── useUserData.ts    # User data management
│   ├── useSearch.ts      # Search functionality
│   ├── useToast.ts       # Toast notifications
│   ├── useVoiceInput.ts  # Voice input for search
│   └── ...
│
├── utils/                # Utility functions
│   ├── tmdbApi.ts        # TMDB API integration
│   ├── tmdbFetch.ts      # Secure TMDB fetch utilities
│   ├── errorHandler.ts   # Error handling utilities
│   ├── contentFilter.ts  # Content filtering logic
│   ├── csvExport.ts      # CSV export functionality
│   ├── inputSanitization.ts   # XSS protection
│   ├── gemini/           # Gemini AI utilities
│   │   ├── promptBuilder.ts   # Construct semantic prompts
│   │   └── responseParser.ts  # Parse AI responses
│   └── ...
│
├── types/                # TypeScript type definitions
│   ├── userLists.ts      # User list and collection types
│   ├── shared.ts         # Shared state type definitions
│   ├── rankings.ts       # Ranking and comment types
│   ├── forum.ts          # Forum thread, poll, vote, reply types
│   └── ...
│
├── typings.d.ts          # Global TypeScript typings
│   # Includes: Content, Movie, TVShow, Genre types
│   # Type guards: isMovie(), isTVShow()
│   # Utils: getTitle(), getYear(), getRating(), etc.
│
├── __tests__/            # Jest tests
│   ├── components/       # Component tests
│   ├── hooks/            # Hook tests
│   ├── stores/           # Store tests
│   └── app/api/          # API route tests
│
├── scripts/              # Development utility scripts
│   ├── dev-safe.js       # Safe dev server startup
│   ├── create-test-user.ts
│   └── ...
│
├── styles/               # Global styles
│   └── globals.css       # Tailwind CSS imports
│
├── public/               # Static assets
│   ├── images/
│   └── ...
│
├── docs/                 # Documentation (55+ files)
│   ├── features/         # Feature documentation
│   ├── architecture/     # Architecture docs
│   └── ...
│
├── firebase.ts           # Firebase initialization
├── firestore.rules       # Firestore security rules
├── sentry.client.config.ts   # Sentry client config
├── instrumentation.ts    # Sentry server config (Next.js 15+)
├── next.config.mjs       # Next.js configuration
├── vercel.json           # Vercel deployment config (cron jobs)
├── tailwind.config.ts    # Tailwind CSS configuration
├── jest.config.js        # Jest configuration
└── tsconfig.json         # TypeScript configuration
```

## 🔑 Key Technical Implementations

### State Management Architecture

The app uses **17 focused Zustand stores** (migrated from monolithic "god store"):

- **Store Factory Pattern**: `createUserStore.ts` - Shared factory for auth and guest stores
- **Storage Adapters**:
    - `FirebaseStorageAdapter` - Real-time Firestore sync for authenticated users
    - `LocalStorageAdapter` - Browser localStorage for guest users
- **Direct store access**: Components use Zustand hooks (`useAppStore()`, `useSessionStore()`, etc.)
- **No provider wrapper**: Zustand works without root provider components
- **Type-safe selectors**: Optimized performance with granular subscriptions
- **Optimistic updates**: Updates with rollback on failure

### Content Type System

Unified type system for movies and TV shows using discriminated unions:

```typescript
// Base interface with shared properties
interface BaseContent { ... }

// Discriminated unions with media_type
interface Movie extends BaseContent { media_type: 'movie', title, release_date }
interface TVShow extends BaseContent { media_type: 'tv', name, first_air_date }

type Content = Movie | TVShow

// Type guards for runtime checking
isMovie(content): content is Movie
isTVShow(content): content is TVShow

// Utility functions for consistent access
getTitle(content)    // Works for both movies and TV shows
getYear(content)
getContentType(content)
getRating(content)
getReleaseDate(content)
```

### Authentication & User Data Isolation

- **Critical**: User ID validation before all state updates prevents data mixing
- **Storage**: Firestore for authenticated users, localStorage for guests
- **Session persistence**: localStorage maintains auth state across refreshes
- **Auto-save**: `useSessionData` validates user ID match before persisting
- **Timeout protection**: Firebase operations include 5-second timeout
- **Race condition prevention**: Stores cleared when switching users

### Firestore Data Structure

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
  - Image URLs stored in imageUrl field

/thread_replies/{replyId}
  - Replies to threads
  - Indexed by threadId, createdAt
  - Supports nested discussions

/thread_likes/{likeId}
  - User likes on threads
  - One like per user per thread

/reply_likes/{likeId}
  - User likes on replies
  - One like per user per reply

/polls/{pollId}
  - Polls with voting options
  - Indexed by category, createdAt, userId
  - Support for single/multiple choice

/poll_votes/{voteId}
  - User votes on polls
  - One vote per user per poll
  - Tracks selected options

/sharedCollections/{linkId}
  - Shared collection snapshots
  - Public read access

/activity/{activityId}
  - User activity tracking (logins, page views)
  - Used by admin portal analytics
  - No automatic cleanup (manual management)

/signupLog/{userId}
  - Account creation audit log
  - Tracks email and creation timestamp

/system/stats
  - Account limit tracking
  - Signup velocity (daily/weekly/monthly)
  - Last signup timestamp and email

/system/trending
  - Trending notification system state
  - TMDB content snapshots
  - Last run timestamp and statistics
```

### API Architecture

- **30+ API routes** organized by feature
- **Internal routes** proxy TMDB API calls (API key hidden server-side)
- **TMDB API v3**: Uses query parameter authentication (`?api_key=...`)
- **Error handling** via `utils/errorHandler.ts` with user-friendly messages
- **Rate limiting**: Respects TMDB's 40 requests/second limit
- **Input sanitization**: XSS protection on all Gemini AI routes
- **Caching**: Client-side cache store + server-side caching for improved performance

### AI Integration (Google Gemini 2.5 Flash)

**Smart Search Flow**:

1. User enters natural language query ("movies like Inception with time travel")
2. Query sent to `/api/gemini/analyze` with semantic prompt
3. Gemini extracts:
    - Genres (sci-fi, thriller)
    - Concepts (time travel, mind-bending)
    - Media type (auto-detected: movies)
    - Cast/crew if mentioned
4. Results fetched from TMDB Discover API with extracted parameters
5. Live preview shows result count as user types
6. User can save results as custom collection

**Other AI Features**:

- Collection name generation
- Row name suggestions
- Style-based recommendations
- Surprise query generation

### Auto-Updating Collections

**Cron Job Flow** (Daily at 2 AM UTC):

```
1. Vercel cron triggers /api/cron/update-collections
2. Verify CRON_SECRET for security
3. Query Firestore for collections with autoUpdateEnabled: true
4. For each collection:
   - Fetch TMDB Discover with collection filters
   - Filter to releases after lastCheckedAt
   - Append new content to collection.items
   - Update lastUpdateCount, lastCheckedAt
   - Create notification for user
5. Batch commit to Firestore
```

**Visual Indicators**:

- "Auto" badge on collection cards
- "+5" badge showing new items count
- "Updated 2 hours ago" timestamp

## 🧪 Testing

The project includes a comprehensive test suite using Jest and React Testing Library:

### Test Coverage

- **Components**: UI component tests with user interaction simulation
- **Hooks**: Custom hook tests with mock providers
- **Stores**: Zustand store tests with state management validation
- **API Routes**: API endpoint tests
- **Integration**: End-to-end user flow testing

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode for development
npm run test:coverage # Generate coverage report
npm run test:ci       # CI mode (used in GitHub Actions)
```

### Test Configuration

- **Environment**: jsdom for browser simulation
- **Setup files**: Automatic React Testing Library configuration
- **Mocking**: TMDB API responses, Firebase services, Gemini AI
- **Coverage thresholds**: Configured in `jest.config.js`

## 📊 Monitoring & Analytics

### Sentry Error Monitoring

- **Client-side**: Configured via `sentry.client.config.ts`
- **Server-side**: Configured via `instrumentation.ts` (Next.js 15+ standard)
- **Features**:
    - Automatic error capture and stack traces
    - User session replay
    - Performance monitoring
    - Breadcrumb tracking
    - Privacy protection (PII filtering)
    - Ignores common browser errors

### Google Analytics 4

- **Integration**: Via `@next/third-parties`
- **Events tracked**:
    - Page views
    - User authentication events
    - Content interactions (watchlist add/remove, likes, etc.)
    - Search queries (standard and AI)
    - Ranking engagement
- **Privacy**: Anonymized IP, GDPR compliant

### Vercel Analytics

- **Performance metrics**: Core Web Vitals tracking
- **Real user monitoring**: Actual user experience data
- **Integration**: Automatic with Vercel deployment

## 🎨 Toast Notification System

Unified notification system with 6 toast types:

- ✅ **Success** - Green checkmark for successful operations
- ❌ **Error** - Red X mark for error messages (auto-integrated with ErrorHandler)
- ➕ **Watchlist Add** - Blue plus icon
- ➖ **Watchlist Remove** - Orange minus icon
- 👁️‍🗨️ **Content Hidden** - Red eye-slash
- 👁️ **Content Shown** - Green eye

**Usage**:

```typescript
const { showSuccess, showError, showWatchlistAdd } = useToast()
showSuccess('Operation completed', 'Optional description')
```

**Components**: Toast.tsx (5s auto-dismiss), ToastContainer.tsx (positioning), ToastManager.tsx (state bridge), useToast.ts (hook API)

## 🚀 Performance Optimizations

- **Lazy Loading**: Content rows and images load on demand (Intersection Observer)
- **Image Optimization**: Next.js Image component with TMDB CDN
- **Code Splitting**: Dynamic imports for modals and heavy components
- **Caching Strategy**:
    - Client-side cache for API responses (10-minute TTL)
    - Firebase Firestore offline persistence
    - Recommendation cache (6-hour refresh)
    - Interaction summary cache (24-hour)
- **Bundle Analysis**: `npm run analyze` to inspect bundle size
- **React 19 Features**: Automatic batching, concurrent rendering
- **Debounced Search**: 300ms debounce prevents excessive API calls
- **Zustand Granular Selectors**: Minimal re-renders

**Performance Metrics**:

- Component files: 35,682 lines
- Build time: ~45s (Next.js 16 with caching)
- API response time: <200ms (cached)
- First Contentful Paint: <1.5s
- Time to Interactive: <3s

## 🌐 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Production deployment
vercel --prod
```

**Configuration**:

- Set environment variables in Vercel dashboard
- Enable Vercel Analytics automatically
- Configure custom domain in project settings
- Set up cron job in `vercel.json` for auto-updating collections

### Vercel Cron Job Setup

In Vercel dashboard:

1. Add `CRON_SECRET` environment variable
2. Deploy `vercel.json` with cron configuration:

```json
{
    "crons": [
        {
            "path": "/api/cron/update-collections",
            "schedule": "0 2 * * *"
        }
    ]
}
```

### Other Platforms

The app is a standard Next.js application and can be deployed to:

- **Netlify**: Use Next.js build plugin
- **AWS Amplify**: Configure build settings for Next.js
- **Docker**: Dockerfile can be created for containerization
- **Self-hosted**: Build with `npm run build` and start with `npm start`

### Security

NetTrailer implements comprehensive security measures. See the full [Security Documentation](/security) for details.

**Key Security Features:**

- **Authentication**: Firebase Auth with server-side token verification
- **CSRF Protection**: Global CSRF protection on all state-changing API requests (POST/PUT/DELETE/PATCH)
- **Input Sanitization**: DOMPurify, control character removal, length validation
- **Rate Limiting**: Per-user limits on AI requests, password reset, email verification
- **Data Protection**: 540+ lines of Firestore security rules, user data isolation
- **Child Safety**: PIN-protected content filtering with bcrypt encryption
- **API Security**: Timing-safe secret comparison, request size limits

**Security Headers** (configured in `next.config.mjs`):

- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- X-XSS-Protection: 1; mode=block
- Permissions-Policy (camera, microphone, geolocation, interest-cohort)
- Content-Security-Policy (strict directives with base-uri, form-action)
- Strict-Transport-Security (HSTS)

### Pre-deployment Checklist

- [ ] Set all required environment variables
- [ ] Configure Firebase authentication providers
- [ ] Deploy Firestore security rules from `firestore.rules`
- [ ] Enable Sentry error monitoring
- [ ] Configure Google Analytics (optional)
- [ ] Set CRON_SECRET for auto-updating collections
- [ ] Test guest mode functionality
- [ ] Verify TMDB API key and rate limits
- [ ] Test smart search with Gemini API
- [ ] Update CORS settings if needed
- [ ] Configure Resend for email notifications (optional)

## 🎯 Key Metrics

**Codebase Size**:

- Total component lines: 35,682
- Total commits: 1,240+
- Features completed: 13 major feature sets
- Documentation pages: 55+ markdown files
- API routes: 49+
- Zustand stores: 18 focused stores
- Components created: 100+ components
- Lines of code: ~50,000+ (estimated)
- Security documentation: 450+ lines
- Pages with cinematic styling: 8 (Nov 2025)

**Development Time**:

- Approximately 3 months of active development
- Continuous improvements and polish

## 🔮 Future Enhancements

From roadmap and TODO.md:

- [ ] Email notifications via Resend (setup required)
- [ ] PWA implementation (offline support)
- [ ] Analytics dashboard (user-facing)
- [ ] Advanced search facets and sorting
- [ ] Social features (follow users, activity feed)
- [ ] Content reviews (user-written reviews and ratings)
- [ ] Multi-language support (i18n)
- [ ] Dark/light mode toggle
- [ ] Export rankings as images (social media sharing)
- [ ] Mobile app (React Native)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for the comprehensive movie database API
- [Google Gemini AI](https://ai.google.dev/) for natural language processing
- [Firebase](https://firebase.google.com/) for backend services
- [Next.js](https://nextjs.org/) for the React framework
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [Zustand](https://github.com/pmndrs/zustand) for state management

---

<div align="center">

**Built with ❤️ using modern web technologies**

[🔗 Portfolio](https://your-portfolio.com) • [💼 LinkedIn](https://linkedin.com/in/yourprofile) • [🐦 Twitter](https://twitter.com/yourhandle)

</div>
