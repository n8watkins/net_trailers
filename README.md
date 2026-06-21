# 🎬 NetTrailer

**Full-Stack Movie & TV Show Discovery Platform with AI-Powered Search**

A Netflix-inspired streaming discovery platform built with modern web technologies, featuring user authentication, AI-powered smart search, custom collections, community rankings, personalized recommendations, and child safety controls.

## 🚀 Tech Stack

<div align="center">

| Frontend          | Backend                              | Database           | APIs             | Styling             | State Management | Monitoring              | Testing     |
| ----------------- | ------------------------------------ | ------------------ | ---------------- | ------------------- | ---------------- | ----------------------- | ----------- |
| ▲ **Next.js 16**  | 🗄️ **Turso (libSQL)**                | 🌿 **Drizzle ORM** | 🎬 **TMDB**      | 🎨 **Tailwind CSS** | 🐻 **Zustand**   | 🛡️ **Sentry**           | 🧪 **Jest** |
| **TS TypeScript** | 🔐 **Auth.js (GitHub + magic link)** | 📧 **Brevo**       | 🤖 **Gemini AI** | 🎭 **Material-UI**  |                  | 📊 **GA4**              | 🧪 **RTL**  |
| ⚛️ **React 19**   |                                      |                    |                  | 🦸 **Heroicons**    |                  | 📈 **Vercel Analytics** |             |

</div>

## ✨ Features

### 🔐 Authentication & User Management

- **Auth.js (NextAuth v5) Authentication**
    - GitHub OAuth sign-in
    - Passwordless email magic-link sign-in (delivered via Brevo by default, or Resend)
    - Database sessions with secure, cookie-based session management
    - Guest mode for demo access (no registration required)
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
    - One vote per user per poll (tracked in Turso)
    - Vote tracking prevents duplicate votes
    - Detail pages at `/community/polls/[id]`

- **Image Upload Support**
    - Upload images to threads and forum posts
    - Vercel Blob integration for image hosting (uploads scoped per user)
    - Image preview and optimization
    - Automatic image resizing for performance

- **Moderation & Safety**
    - Report inappropriate content (threads, replies, polls)
    - Thread owners can delete replies
    - Authentication required for all forum features
    - Server-side ownership checks on all mutations (session-derived user id)

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
    - Polling `/api/notifications` every 30s for updates

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
    - Future: Email digests via the configured email provider (Brevo/Resend)

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

- **Email System** (Brevo / Resend Integration)
    - **Announcement Emails** - Send plain text announcements with subject and message
    - **Custom HTML Emails** - Rich text editor with TipTap for formatted content
    - **User Filtering** - Send to all users, authenticated only, or guest users only
    - **Email Preview** - Preview emails before sending with live rendering
    - **Rate Limiting** - 100 emails/hour per admin, 3 emails/day per recipient
    - **XSS Protection** - `sanitize-html` sanitization on all custom HTML content
    - **HTTPS-Only Links** - Security enforced on all email links
    - **CAN-SPAM Compliance** - Automatic unsubscribe token generation
    - **Email History** - Track sent emails with counts and metadata (PII minimized)

- **Security**
    - Dual-layer authentication (client routing + server-side Auth.js session validation)
    - Admin identified by GitHub login (`ADMIN_GITHUB_LOGIN`, server-side only, not exposed to client)
    - Rate limiting on public endpoints (30 requests/minute per IP)
    - Email rate limiting (100/hour admin, 3/day recipient)
    - Input validation and sanitization
    - CSRF protection via authenticatedFetch
    - Server-side ownership checks on all admin API routes

- **Analytics Tracking**
    - Automatic page view tracking (excludes admin routes)
    - Login activity monitoring
    - User engagement metrics
    - Activity filtering by user, type, and timeframe
    - Timeline visualization grouped by day

- **Account Limits**
    - Configurable account cap (default: 50 accounts) enforced in the `auth.ts` `signIn` callback
    - Usage tracking via Turso
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
    - Turso (libSQL/SQLite) via Drizzle ORM, accessed server-side through API routes
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
- Turso database (free tier available)
- GitHub OAuth App (for sign-in)
- Brevo account (free tier) for magic-link email delivery
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
    # Turso Database (Required)
    # Create a database with the Turso CLI: `turso db create nettrailer`
    # Then: `turso db show --url nettrailer` and `turso db tokens create nettrailer`
    TURSO_DATABASE_URL=libsql://your-database.turso.io
    TURSO_AUTH_TOKEN=your_turso_auth_token

    # Auth.js / NextAuth v5 (Required)
    # AUTH_SECRET: generate with `npx auth secret` (or `openssl rand -base64 32`)
    AUTH_SECRET=your_auth_secret
    # GitHub OAuth App (https://github.com/settings/developers)
    # Callback URL: http://localhost:3000/api/auth/callback/github (and your prod URL)
    AUTH_GITHUB_ID=your_github_oauth_client_id
    AUTH_GITHUB_SECRET=your_github_oauth_client_secret
    # Production URL (only needed in production behind a proxy, e.g. Vercel)
    AUTH_URL=https://your-deployment-url.com

    # TMDB API (Required)
    # Get your free API key from: https://www.themoviedb.org/settings/api
    TMDB_API_KEY=your_tmdb_api_key

    # Google Gemini AI (Required for Smart Search)
    # Get your free API key from: https://ai.google.dev/
    GEMINI_API_KEY=your_gemini_api_key

    # Admin Portal (Required for admin access - SERVER-SIDE ONLY)
    # The GitHub username (login) of the admin account. The signed-in user whose
    # GitHub login matches this gets `session.user.isAdmin`.
    # IMPORTANT: This is intentionally NOT prefixed with NEXT_PUBLIC_ to keep it server-side only.
    ADMIN_GITHUB_LOGIN=your_github_username

    # Magic-Link Email (Required for passwordless email sign-in)
    # Brevo is the default provider — get an API key at https://app.brevo.com/
    BREVO_API_KEY=your_brevo_api_key
    # The "From" address — must be a sender you've verified in Brevo (no domain required)
    EMAIL_FROM=noreply@yourdomain.com
    # Optional: switch the email provider. Default is brevo; set to `resend` to use Resend.
    EMAIL_PROVIDER=brevo
    # Resend (only needed if EMAIL_PROVIDER=resend) — https://resend.com/
    RESEND_API_KEY=your_resend_api_key
    # RESEND_SENDER_EMAIL=noreply@yourdomain.com  # alternate "From" if EMAIL_FROM unset

    # Cron Job Security (Required for auto-updating collections)
    CRON_SECRET=your_random_secret_string

    # Vercel Blob (Required for forum/thread image uploads)
    # Create a Blob store in your Vercel project; token is provided automatically there.
    BLOB_READ_WRITE_TOKEN=your_blob_read_write_token

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
    ```

4. **Database & Auth Setup**

    a. **Create a Turso database** and apply the schema:

    ```bash
    # Create the database and grab its URL + auth token
    turso db create nettrailer
    turso db show --url nettrailer        # → TURSO_DATABASE_URL
    turso db tokens create nettrailer     # → TURSO_AUTH_TOKEN

    # Apply the Drizzle schema (migrations live in db/migrations)
    npm run db:migrate                    # or `npm run db:push` for quick dev sync
    ```

    Inspect the database any time with `npm run db:studio`.

    b. **Create a GitHub OAuth App** (https://github.com/settings/developers):
    - Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
      (add your production URL's callback as well)
    - Copy the Client ID and Client Secret into `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`

    c. **Set up magic-link email** (Brevo by default):
    - Create a Brevo account, generate an API key → `BREVO_API_KEY`
    - Verify a single sender email and set it as `EMAIL_FROM` (no domain required)
    - To use Resend instead, set `EMAIL_PROVIDER=resend` and provide `RESEND_API_KEY`

    > There is no Firebase project, Firestore rules deploy, or Firebase Admin SDK
    > service account to configure — all data access is server-mediated through
    > Next.js API routes with server-side ownership checks.

5. **Admin Portal Setup** (Required for admin access)

    a. **Set your admin GitHub login**:
    - Add your GitHub username to `.env.local` as `ADMIN_GITHUB_LOGIN`
      (server-side only, not exposed to the client)
    - When you sign in via GitHub with that account, the session is granted
      `session.user.isAdmin` and `/admin` becomes accessible

    b. **Access the admin dashboard**:
    - Start the dev server: `npm run dev`
    - Sign in with your admin GitHub account
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

### Database (Drizzle + Turso)

```bash
npm run db:generate   # Generate a migration from db/schema.ts
npm run db:migrate    # Apply migrations to Turso
npm run db:push       # Push schema directly to Turso (dev)
npm run db:seed       # Seed the database with sample data
npm run db:studio     # Open Drizzle Studio to inspect the database
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
│   ├── debug/            # DebugControls, WebVitalsHUD
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
│   ├── authStore.ts      # Authenticated user data (synced to Turso via API)
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
├── db/                   # Turso + Drizzle data layer
│   ├── index.ts          # libSQL/Drizzle client
│   ├── schema.ts         # Drizzle schema (tables, indexes)
│   ├── migrations/       # drizzle-kit generated SQL migrations
│   └── queries/          # Typed query helpers (one module per domain)
├── auth.ts               # Auth.js (NextAuth v5) config — GitHub + magic link
├── drizzle.config.ts     # drizzle-kit configuration
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

The app uses **18 focused Zustand stores** (migrated from monolithic "god store"):

- **Store Factory Pattern**: `createUserStore.ts` - Shared factory for auth and guest stores
- **Storage Adapters**:
    - `ApiStorageAdapter` - Persists authenticated user data to Turso via `/api/user/preferences`
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
- **Storage**: Turso (via API routes) for authenticated users, localStorage for guests
- **Session persistence**: Auth.js session cookie (validated server-side) maintains auth state across refreshes
- **User isolation**: API routes derive the user id from the session (`withAuth` / `currentUserId()`), never from the request body
- **Auto-save**: `useSessionData` validates user ID match before persisting
- **Race condition prevention**: Stores cleared when switching users

### Database (Turso + Drizzle)

All data lives in **Turso (libSQL/SQLite)**, accessed through **Drizzle ORM**. The
schema is defined in `db/schema.ts`, typed queries in `db/queries/*`, and the client
in `db/index.ts`. The browser never talks to Turso directly — every read/write goes
through a Next.js API route with server-side ownership checks (the session-derived
user id), which replace the old Firestore security rules.

```
Auth.js adapter: user, account, session, verificationToken
User data:       user_preferences (the per-user blob as one JSON column),
                 profiles, interactions, interaction_summary, notifications,
                 watch_history, child_safety_pins
Rankings:        rankings, ranking_comments, ranking_likes, comment_likes
Forum:           threads, thread_replies, thread_likes, reply_likes, polls, poll_votes
Social & misc:   shares (collection snapshots), user_activity, user_badges,
                 user_follows, content_reports, admin_emails (counts only), signup_log
```

- Nested arrays/objects (`Content[]`, `rankedItems`, poll `options`, `advancedFilters`)
  are stored as JSON text columns; timestamps are epoch-ms integers.
- Interactions are retained ~90 days; notifications auto-dismiss after 30 days.
- Migrations are managed with drizzle-kit (`npm run db:generate` →
  `npm run db:migrate`); inspect the database with `npm run db:studio`.

### API Architecture

- **30+ API routes** organized by feature
- **Internal routes** proxy TMDB API calls (API key hidden server-side)
- **TMDB API v3**: Uses query parameter authentication (`?api_key=...`)
- **Error handling** via `utils/errorHandler.ts` with user-friendly messages
- **Rate limiting**: Respects TMDB's 40 requests/second limit
- **Input sanitization**: XSS protection on all Gemini AI routes
- **Caching**: Client-side cache store + server-side caching for improved performance

### AI Integration (Google Gemini 3.1 Flash Lite)

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
3. Query Turso for collections with autoUpdateEnabled: true
4. For each collection:
   - Fetch TMDB Discover with collection filters
   - Filter to releases after lastCheckedAt
   - Append new content to collection.items
   - Update lastUpdateCount, lastCheckedAt
   - Create notification for user
5. Persist updates to Turso
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
- **Mocking**: TMDB API responses, Turso/Drizzle queries (`db/queries/*` or in-memory libSQL), Gemini AI
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

- **Authentication**: Auth.js (NextAuth v5) database sessions, validated server-side via the session cookie (no bearer tokens)
- **CSRF Protection**: Global CSRF protection on all state-changing API requests (POST/PUT/DELETE/PATCH)
- **Input Sanitization**: `sanitize-html` (admin emails) and `utils/inputSanitization.ts` (Gemini routes), control character removal, length validation
- **Rate Limiting**: Per-user limits on AI requests; admin email rate limits (100/hour admin, 3/day recipient)
- **Data Protection**: Server-side ownership checks on every API route (session-derived user id), user data isolation
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
- [ ] Create the Turso database and apply migrations (`npm run db:migrate`)
- [ ] Configure the GitHub OAuth App callback URL for production
- [ ] Set up the magic-link email provider (Brevo `BREVO_API_KEY` + verified `EMAIL_FROM`, or Resend)
- [ ] Set `ADMIN_GITHUB_LOGIN` for admin access
- [ ] Create a Vercel Blob store and set `BLOB_READ_WRITE_TOKEN` (for image uploads)
- [ ] Enable Sentry error monitoring
- [ ] Configure Google Analytics (optional)
- [ ] Set CRON_SECRET for auto-updating collections
- [ ] Test guest mode functionality
- [ ] Verify TMDB API key and rate limits
- [ ] Test smart search with Gemini API
- [ ] Update CORS settings if needed

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

- [ ] User-facing email digests (admin email system already shipped via Brevo/Resend)
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
- [Turso](https://turso.tech/) and [Drizzle ORM](https://orm.drizzle.team/) for the database layer
- [Auth.js](https://authjs.dev/) for authentication
- [Next.js](https://nextjs.org/) for the React framework
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [Zustand](https://github.com/pmndrs/zustand) for state management

---

<div align="center">

**Built with ❤️ using modern web technologies**

[🔗 Portfolio](https://your-portfolio.com) • [💼 LinkedIn](https://linkedin.com/in/yourprofile) • [🐦 Twitter](https://twitter.com/yourhandle)

</div>
