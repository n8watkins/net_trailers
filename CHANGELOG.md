# Changelog

All notable changes to NetTrailer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Comprehensive JSDoc comments to public APIs (hooks, utilities, stores)
- Organized component structure with logical folder hierarchy
- Comprehensive ARIA attributes and semantic HTML for accessibility
- Content Security Policy (CSP) and HSTS security headers
- Mixed movie and TV content on homepage
- Cache invalidation when child safety mode changes

### Fixed

- Component import paths after reorganization
- Child safety race condition and TV genre blocking issues
- Child-safety genre blocking and cache pollution bugs
- Type duplication by consolidating to types/shared
- TypeScript 'any' types replaced with proper interfaces

### Changed

- Reorganized components into structured folders (layout, modals, search, auth, content, debug, utility, common)
- Wrapped console.log statements in development checks
- Enabled TypeScript build error checking
- Reduced test failures from 32 to 4 through refactoring

### Security

- Added comprehensive security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, X-XSS-Protection, Permissions-Policy)
- Implemented Content Security Policy with strict directives
- Added HTTP Strict Transport Security (HSTS)

## [1.0.0] - Initial Release

### Features

#### Core Functionality

- **Movie & TV Show Discovery**
    - Browse trending movies and TV shows
    - Search with real-time results and debouncing
    - Advanced filtering (genre, rating, year)
    - Genre-based browsing
    - Top-rated content discovery

- **User Features**
    - Guest mode (localStorage-based)
    - Firebase authentication (Google, Email/Password)
    - Personal watchlists
    - Liked content tracking
    - Hidden content management
    - Custom lists with icons and colors

- **Child Safety Mode**
    - Content filtering by MPAA/TV ratings
    - Configurable rating thresholds
    - Server-side filtering for search and genres
    - Visual indicator when enabled

- **Video Player**
    - YouTube trailer integration
    - Custom controls (play/pause, volume, mute)
    - Autoplay with configurable sound
    - Full-screen support

#### Technical Features

- **State Management**
    - Zustand for global state
    - Separate stores for auth, guest, session, app state
    - User isolation and race condition prevention
    - LocalStorage persistence for guests
    - Firestore sync for authenticated users

- **Performance**
    - Server-side caching (10-minute TTL)
    - Image optimization with Next.js Image
    - Lazy loading with Intersection Observer
    - Debounced search (300ms)
    - Content prefetching on hover

- **Architecture**
    - Next.js 16 with Pages Router
    - TypeScript strict mode
    - Discriminated unions for content types
    - Type guards for runtime type safety
    - Comprehensive error handling

- **UI/UX**
    - Netflix-inspired design
    - Responsive layout (mobile-first)
    - Toast notifications system
    - Modal-based content details
    - Keyboard shortcuts
    - Scroll-to-top functionality

#### Integrations

- **TMDB API**
    - Movie/TV show data
    - Search functionality
    - Genre listings
    - Trending content
    - Content ratings

- **Firebase**
    - Authentication (Google, Email/Password)
    - Firestore for user data
    - Real-time sync across sessions

- **Analytics**
    - Google Analytics integration
    - Vercel Analytics
    - Web Vitals tracking (dev only)

#### Developer Experience

- **Testing**
    - Jest configuration
    - React Testing Library
    - Component tests
    - TypeScript type checking

- **Code Quality**
    - ESLint configuration
    - Prettier formatting
    - Husky pre-commit hooks
    - lint-staged for staged files

- **Documentation**
    - CLAUDE.md for architecture
    - JSDoc comments on public APIs
    - Inline code documentation
    - README with setup instructions

### Known Issues

- Package import optimization disabled due to runtime errors with heroicons
- Some console warnings in development mode (HMR-related)

### Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)

### Dependencies

- **Core**: Next.js 16, React 19, TypeScript 5.7
- **State**: Zustand 5.0
- **UI**: Tailwind CSS 3.4, Heroicons 2.0
- **Video**: react-player 2.16
- **Auth**: Firebase 11.0
- **Analytics**: Google Analytics 4, Vercel Analytics
- **Dev**: Jest, Testing Library, ESLint, Prettier

---

## Version History

- **v1.0.0** - Initial production release with full feature set
- **Unreleased** - Ongoing improvements and polish

---

**Note**: This changelog focuses on user-facing changes and significant technical improvements. For detailed commit history, see `git log`.
