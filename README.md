# 🎬 NetTrailer

**Full-Stack Movie & TV Show Discovery Platform**

A Netflix-inspired streaming platform built with modern web technologies, featuring user authentication, comprehensive content discovery, custom watchlists, and a responsive design.

## 🚀 Tech Stack

<div align="center">

| Frontend          | Backend              | Database         | APIs        | Styling             | State Management | Monitoring              | Testing     |
| ----------------- | -------------------- | ---------------- | ----------- | ------------------- | ---------------- | ----------------------- | ----------- |
| ▲ **Next.js 16**  | 🔥 **Firebase**      | 🔥 **Firestore** | 🎬 **TMDB** | 🎨 **Tailwind CSS** | 🐻 **Zustand**   | 🛡️ **Sentry**           | 🧪 **Jest** |
| **TS TypeScript** | 🔐 **Firebase Auth** |                  |             | 🎭 **Material-UI**  |                  | 📊 **GA4**              | 🧪 **RTL**  |
| ⚛️ **React 19**   |                      |                  |             | 🦸 **Heroicons**    |                  | 📈 **Vercel Analytics** |             |

</div>

## ✨ Features

### 🔐 Authentication & User Management

- **Multi-Provider Authentication**
    - Email/Password signup & login with password reset
    - Google OAuth integration
    - Guest mode for demo access (no registration required)
    - Secure session management with localStorage persistence
    - Seamless user switching between authenticated and guest accounts

### 🎬 Content Discovery

- **Movies & TV Shows**
    - Browse trending, top-rated, and genre-specific content
    - Unified content type system supporting both movies and TV shows
    - Dedicated pages for Movies (`/movies`) and TV Shows (`/tv`)
    - Genre browsing with dynamic filtering
    - High-quality trailer playback with YouTube integration

- **Advanced Search**
    - Real-time search with 300ms debounce
    - Search suggestions dropdown
    - Advanced filters (genre, year, rating, content type)
    - URL synchronization for shareable search results
    - Minimum 2-character query with race condition prevention

### 📚 Content Management

- **Custom Watchlists**
    - Create unlimited custom watchlists
    - Organize content with custom names, colors, and icons
    - Drag-and-drop list management
    - Quick add to multiple lists
    - Export watchlist data to CSV

- **Content Organization**
    - Like system with dedicated `/liked` page
    - Hide unwanted content with `/hidden` page management
    - Smart content filtering by preferences
    - Persistent storage (Firestore for authenticated, localStorage for guests)

### 👤 User Experience

- **Interface & Design**
    - Responsive design for all devices (mobile, tablet, desktop)
    - Netflix-inspired UI/UX with smooth animations
    - Keyboard shortcuts for power users (press `?` to view)
    - Dark mode optimized interface
    - Lazy-loaded content rows for optimal performance

- **Smart Features**
    - Child safety mode with content filtering
    - Interactive tutorial for new users
    - Real-time data synchronization
    - Comprehensive error handling with user-friendly messages
    - Toast notification system (6 types: success, error, watchlist operations, content visibility)

### 🛠 Developer Features

- **Code Quality**
    - TypeScript for type safety across the entire codebase
    - ESLint with automatic fixes on commit (lint-staged + husky)
    - Prettier for consistent code formatting
    - Comprehensive Jest test suite with React Testing Library
    - Test coverage reporting

- **Architecture**
    - Zustand state management for all application state
    - Next.js 16 with React 19 and App Router patterns
    - Firebase Firestore with optimistic updates and caching
    - API route architecture proxying TMDB API
    - Sentry error monitoring (client & server-side)
    - Google Analytics 4 integration
    - Vercel Analytics for performance insights

## 🎯 Live Demo

[🚀 **Try NetTrailer Live**](https://your-deployment-url.com)

_Experience all features or continue as guest to explore the platform_

## 🛠 Installation & Setup

### Prerequisites

- Node.js 18.x or higher
- npm (pnpm is no longer supported - project migrated to npm)
- Firebase project (free tier available)
- TMDB API key (free)

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

4. **Firebase Setup**

    Enable the following in your Firebase project:
    - Authentication > Sign-in method:
        - Email/Password
        - Google
    - Firestore Database (in production mode)
    - Set Firestore rules to allow authenticated read/write

5. **Run the development server**

    ```bash
    npm run dev
    ```

    The server will start on port 3000 (or 3004 if 3000 is occupied)

6. **Open your browser**

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
├── components/          # Reusable UI components
│   ├── Header.tsx       # Main navigation header
│   ├── Banner.tsx       # Hero banner with featured content
│   ├── Row.tsx          # Horizontal content rows
│   ├── ContentCard.tsx  # Individual content cards
│   ├── Modal.tsx        # Content detail modal
│   ├── InfoModal.tsx    # Detailed content information
│   ├── Toast.tsx        # Toast notification component
│   ├── SearchBar.tsx    # Search with suggestions
│   └── ...              # 50+ other components
│
├── pages/               # Next.js pages and API routes
│   ├── index.tsx        # Home page with trending content
│   ├── movies.tsx       # Movies-only page
│   ├── tv.tsx           # TV shows-only page
│   ├── search.tsx       # Search results page
│   ├── watchlists.tsx   # Custom watchlists management
│   ├── liked.tsx        # Liked content page
│   ├── hidden.tsx       # Hidden content page
│   ├── settings.tsx     # User settings
│   ├── genres/          # Genre browsing pages
│   │   └── [type]/[id].tsx  # Dynamic genre pages
│   └── api/             # API routes (TMDB proxy)
│       ├── movies/      # Movie-related endpoints
│       ├── tv/          # TV show-related endpoints
│       ├── search.ts    # Search endpoint
│       └── ...
│
├── stores/              # Zustand state stores
│   ├── authStore.ts     # Authenticated user state
│   ├── guestStore.ts    # Guest user state
│   ├── sessionStore.ts  # Session management
│   ├── appStore.ts      # App-wide state (modals, search, toasts)
│   └── cacheStore.ts    # Client-side caching
│
├── hooks/               # Custom React hooks
│   ├── useAuth.tsx      # Authentication hook
│   ├── useUserData.ts   # User data management
│   ├── useSearch.ts     # Search functionality
│   ├── useToast.ts      # Toast notifications
│   └── ...
│
├── utils/               # Utility functions
│   ├── tmdbApi.ts       # TMDB API integration
│   ├── errorHandler.ts  # Error handling utilities
│   ├── contentFilter.ts # Content filtering logic
│   ├── csvExport.ts     # CSV export functionality
│   └── ...
│
├── types/               # TypeScript type definitions
│   ├── userLists.ts     # User list types
│   └── atoms.ts         # Shared state type definitions
│
├── typings.d.ts         # Global TypeScript typings
│   # Includes: Content, Movie, TVShow, Genre types
│
├── __tests__/           # Jest tests
│   ├── components/      # Component tests
│   ├── hooks/           # Hook tests
│   └── stores/          # Store tests
│
├── scripts/             # Development utility scripts
│   ├── dev-safe.js      # Safe dev server startup
│   ├── create-test-user.ts
│   └── ...
│
├── styles/              # Global styles
│   └── globals.css      # Tailwind CSS imports
│
├── public/              # Static assets
│   ├── images/
│   └── ...
│
├── firebase.ts          # Firebase initialization
├── sentry.client.config.ts  # Sentry client config
├── instrumentation.ts   # Sentry server config (Next.js 15+)
├── next.config.mjs      # Next.js configuration
├── tailwind.config.ts   # Tailwind CSS configuration
├── jest.config.js       # Jest configuration
└── tsconfig.json        # TypeScript configuration
```

## 🔑 Key Technical Implementations

### State Management Architecture

The app uses **Zustand** for all state management:

- **Zustand stores** (`/stores/*.ts`) - All application state management
- **Direct store access**: Components use Zustand hooks (`useAppStore()`, `useSessionStore()`, etc.)
- **No provider wrapper**: Zustand works without root provider components
- **Type-safe selectors**: Optimized performance with granular subscriptions

### Content Type System

Unified type system for movies and TV shows:

```typescript
// Base interface with shared properties
interface BaseContent { ... }

// Discriminated unions with media_type
interface Movie extends BaseContent { media_type: 'movie' }
interface TVShow extends BaseContent { media_type: 'tv' }

// Type guards for runtime checking
isMovie(content) // Type guard
isTVShow(content) // Type guard

// Utility functions for consistent access
getTitle(content) // Works for both movies and TV shows
getYear(content)
getContentType(content)
```

### Authentication & User Data Isolation

- **Critical**: User ID validation before all state updates prevents data mixing
- **Storage**: Firestore for authenticated users, localStorage for guests
- **Session persistence**: localStorage maintains auth state across refreshes
- **Auto-save**: `useSessionData` validates user ID match before persisting
- **Timeout protection**: Firebase operations include 5-second timeout

### API Architecture

- **Internal routes** (`/api/movies/*`, `/api/search`) proxy TMDB API calls
- **Error handling** via `utils/errorHandler.ts` with user-friendly messages
- **Rate limiting**: Respects TMDB's 40 requests/second limit
- **Caching**: Client-side cache store for improved performance

## 🧪 Testing

The project includes a comprehensive test suite using Jest and React Testing Library:

### Test Coverage

- **Components**: UI component tests with user interaction simulation
- **Hooks**: Custom hook tests with mock providers
- **Stores**: Zustand store tests with state management validation
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
- **Mocking**: TMDB API responses, Firebase services
- **Coverage thresholds**: Configured in `jest.config.js`

### Writing Tests

Tests follow the pattern:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('Component', () => {
  it('should handle user interaction', async () => {
    render(<Component />)
    const button = screen.getByRole('button')
    await userEvent.click(button)
    await waitFor(() => expect(screen.getByText('Success')).toBeInTheDocument())
  })
})
```

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
    - Search queries
- **Privacy**: Anonymized IP, GDPR compliant

### Vercel Analytics

- **Performance metrics**: Core Web Vitals tracking
- **Real user monitoring**: Actual user experience data
- **Integration**: Automatic with Vercel deployment

### Firebase Analytics (Optional)

- Can be enabled for additional insights
- Automatic user engagement tracking
- Cross-platform analytics capability

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

**Components**: Toast.tsx (3s auto-dismiss), ToastContainer.tsx (positioning), ToastManager.tsx (state bridge), useToast.ts (hook API)

## 🚀 Performance Optimizations

- **Lazy Loading**: Content rows and images load on demand
- **Image Optimization**: Next.js Image component with TMDB CDN
- **Code Splitting**: Dynamic imports for modals and heavy components
- **Caching Strategy**:
    - Client-side cache for API responses
    - Firebase Firestore offline persistence
    - Service worker ready (can be enabled)
- **Bundle Analysis**: `npm run analyze` to inspect bundle size
- **React 19 Features**: Automatic batching, concurrent rendering
- **Debounced Search**: 300ms debounce prevents excessive API calls

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

### Other Platforms

The app is a standard Next.js application and can be deployed to:

- **Netlify**: Use Next.js build plugin
- **AWS Amplify**: Configure build settings for Next.js
- **Docker**: Dockerfile can be created for containerization
- **Self-hosted**: Build with `npm run build` and start with `npm start`

### Pre-deployment Checklist

- [ ] Set all required environment variables
- [ ] Configure Firebase authentication providers
- [ ] Set Firestore security rules
- [ ] Enable Sentry error monitoring
- [ ] Configure Google Analytics (optional)
- [ ] Test guest mode functionality
- [ ] Verify TMDB API key and rate limits
- [ ] Update CORS settings if needed

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
- [Firebase](https://firebase.google.com/) for backend services
- [Next.js](https://nextjs.org/) for the React framework
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling

---

<div align="center">

**Built with ❤️ using modern web technologies**

[🔗 Portfolio](https://your-portfolio.com) • [💼 LinkedIn](https://linkedin.com/in/yourprofile) • [🐦 Twitter](https://twitter.com/yourhandle)

</div>
