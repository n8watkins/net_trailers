import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import type { Metadata } from 'next'

// Define all debug options with comprehensive information
const debugOptions = {
    tracker: {
        title: 'Firebase Call Tracker',
        category: 'Firebase & Data',
        color: 'orange',
        icon: '🔥',
        description:
            'Real-time monitoring of all Firebase Firestore operations with detailed analytics.',
        whatItDoes: [
            'Tracks every Firebase read, write, update, and delete operation',
            'Shows total calls and calls per minute with warning when >10 calls/min',
            'Displays top operations by frequency',
            'Monitors pending debounced saves from debouncedFirebaseService',
            'Shows call stack traces in console logs for debugging',
            'Provides "Log Summary" and "Reset Stats" actions',
        ],
        when: [
            'Debugging excessive Firebase reads/writes',
            'Identifying performance bottlenecks',
            'Monitoring Firebase quota usage',
            'Tracking down race conditions in Firestore operations',
            'Verifying debounced saves are working correctly',
        ],
        output: 'Floating button (bottom right) shows call count. Click to open modal with detailed stats. Console logs show operation details with stack traces when Firebase calls occur.',
        relatedOptions: ['auth', 'session', 'guest', 'cache', 'watch-history'],
        file: 'components/debug/FirebaseCallTracker.tsx',
        usedIn: ['utils/firebaseCallTracker.ts', 'services/debouncedFirebaseService.ts'],
        keyboardShortcut: null,
        note: undefined,
        isCurrentlyActive: true,
        example: `📊 Firebase Call Tracker Stats:
Total calls: 47
Calls in window: 3
Top operations:
  - Read: /users/abc123 (12)
  - Write: /users/abc123/customRows (8)
  - Read: /rankings (5)

🔥 Pending Saves (2):
  - authStore (3.2s ago)
  - customRowsStore (1.8s ago)`,
    },
    auth: {
        title: 'Auth Flow Logs',
        category: 'Firebase & Data',
        color: 'blue',
        icon: '🔐',
        description: 'Detailed logging of Firebase authentication flow and user state changes.',
        whatItDoes: [
            'Logs sign-in and sign-out events',
            'Tracks authentication state changes',
            'Shows token refresh operations',
            'Logs user profile data loading',
            'Displays auth errors with full context',
            'Monitors session initialization',
        ],
        when: [
            'Debugging login/logout issues',
            'Tracking authentication state changes',
            'Investigating token refresh problems',
            'Verifying auth flow on page load',
            'Troubleshooting Firebase Auth configuration',
        ],
        output: 'Console logs prefixed with auth-specific labels. Errors logged in red, warnings in yellow.',
        relatedOptions: ['session', 'tracker', 'guest'],
        file: 'components/auth/AuthFlowDebugger.tsx',
        usedIn: ['utils/debugLogger.ts (authLog, authError, authWarn)'],
        keyboardShortcut: null,
        note: undefined,
        isCurrentlyActive: true,
        example: `[Auth] User signed in: uid=abc123, email=user@example.com
[Auth] Loading user profile from Firestore...
[Auth] Profile loaded successfully
[Auth] Token refresh scheduled for 55 minutes`,
    },
    session: {
        title: 'Session Management Logs',
        category: 'Firebase & Data',
        color: 'purple',
        icon: '👤',
        description:
            'Tracks session lifecycle including initialization, user switching, and persistence.',
        whatItDoes: [
            'Logs session initialization (auth vs guest)',
            'Tracks user switching operations',
            'Shows session data persistence to localStorage',
            'Monitors session store state changes',
            'Logs session cleanup on user logout',
            'Displays race condition prevention logic',
        ],
        when: [
            'Debugging user switching issues',
            'Investigating session persistence problems',
            'Verifying session isolation between users',
            'Tracking session initialization flow',
            'Troubleshooting data mixing between users',
        ],
        output: 'Console logs showing session operations and state transitions.',
        relatedOptions: ['auth', 'guest', 'tracker'],
        file: 'stores/sessionStore.ts',
        usedIn: ['utils/debugLogger.ts (sessionLog, sessionError)'],
        keyboardShortcut: null,
        note: undefined,
        isCurrentlyActive: true,
        example: `[Session] Initializing auth session for user: abc123
[Session] Loading user data from Firestore...
[Session] Session initialized successfully
[Session] Saving session to localStorage: nettrailer_session`,
    },
    guest: {
        title: 'Guest Mode Logs',
        category: 'Firebase & Data',
        color: 'teal',
        icon: '👻',
        description:
            'Monitors guest user operations including localStorage reads/writes and ID generation.',
        whatItDoes: [
            'Logs guest session initialization',
            'Tracks guest ID generation and storage',
            'Shows localStorage read/write operations',
            'Monitors guest data structure',
            'Logs guest mode limitations',
            'Displays guest-to-auth conversion attempts',
        ],
        when: [
            'Debugging guest mode functionality',
            'Investigating localStorage persistence',
            'Verifying guest data isolation',
            'Testing guest mode limitations',
            'Troubleshooting guest ID generation',
        ],
        output: 'Console logs showing guest operations and localStorage interactions prefixed with [Guest].',
        relatedOptions: ['session', 'auth', 'tracker'],
        file: 'stores/guestStore.ts',
        usedIn: ['utils/debugLogger.ts (guestLog, guestError)', 'adapters/LocalStorageAdapter.ts'],
        keyboardShortcut: null,
        note: undefined,
        isCurrentlyActive: true,
        example: `[Guest] Generating new guest ID: guest_1234567890
[Guest] Initializing guest session...
[Guest] Writing to localStorage: nettrailer_guest_data_guest_1234567890
[Guest] Guest data saved successfully (3 collections, 12 watchlist items)`,
    },
    cache: {
        title: 'Cache Operation Logs',
        category: 'Firebase & Data',
        color: 'cyan',
        icon: '💾',
        description: 'Logs content caching operations including hits, misses, and invalidation.',
        whatItDoes: [
            'Tracks cache hit/miss statistics',
            'Logs cache write operations',
            'Shows cache invalidation events',
            'Monitors cache size and memory usage',
            'Displays cache key generation',
            'Logs TTL (time-to-live) expiration',
        ],
        when: [
            'Debugging cache-related performance issues',
            'Verifying cache invalidation logic',
            'Tracking cache efficiency',
            'Investigating stale data issues',
            'Monitoring memory usage from caching',
        ],
        output: 'Console logs showing cache operations with hit/miss ratios and cache keys.',
        relatedOptions: ['tracker', 'api-server'],
        file: 'stores/cacheStore.ts',
        usedIn: ['utils/debugLogger.ts (cacheLog, cacheError)'],
        keyboardShortcut: null,
        note: undefined,
        isCurrentlyActive: true,
        example: `[Cache] Cache HIT: movie_123456 (age: 2.3s)
[Cache] Cache MISS: tv_789012
[Cache] Writing to cache: movie_123456 (size: 8.2KB, TTL: 6h)
[Cache] Cache invalidated: genre_action (child safety changed)
[Cache] Current cache size: 45 entries, 2.1MB`,
    },
    'watch-history': {
        title: 'Watch History & Firestore Sync',
        category: 'Firebase & Data',
        color: 'sky',
        icon: '📺',
        description: 'Monitors watch history tracking and Firestore synchronization operations.',
        whatItDoes: [
            'Logs watch history additions and updates',
            'Tracks Firestore sync operations',
            'Shows watch progress updates',
            'Monitors history cleanup (90-day retention)',
            'Displays duplicate detection logic',
            'Logs cross-device sync events',
        ],
        when: [
            'Debugging watch history not saving',
            'Investigating sync issues across devices',
            'Verifying 90-day retention cleanup',
            'Tracking watch progress updates',
            'Troubleshooting duplicate entries',
        ],
        output: 'Console logs showing watch history operations and Firestore sync status with [Watch History] prefix.',
        relatedOptions: ['tracker', 'tracking'],
        file: 'stores/watchHistoryStore.ts',
        usedIn: ['utils/debugLogger.ts (watchHistoryLog, watchHistoryWarn, watchHistoryError)'],
        keyboardShortcut: null,
        note: undefined,
        isCurrentlyActive: true,
        example: `[Watch History] Adding to history: Movie "Inception" (movie_550)
[Watch History] Syncing to Firestore: /users/abc123/watchHistory/movie_550
[Watch History] Sync complete (2.3s)
[Watch History] Duplicate detected, updating timestamp
[Watch History] Cleanup: Removed 3 entries older than 90 days`,
    },
    toast: {
        title: 'Toast Notification Debug',
        category: 'UI & Interaction',
        color: 'green',
        icon: '🍞',
        description:
            'Logs toast notification lifecycle including creation, display, and auto-dismiss.',
        whatItDoes: [
            'Logs toast creation with type and message',
            'Tracks toast display queue (MAX_TOASTS limit)',
            'Shows auto-dismiss timer (5s default)',
            'Monitors manual dismissal events',
            'Logs toast animation states',
            'Displays unified toast system usage',
        ],
        when: [
            'Debugging toasts not appearing',
            'Investigating toast queue behavior',
            'Verifying auto-dismiss timing',
            'Tracking toast animation issues',
            'Testing different toast types (success, error, watchlist, etc.)',
        ],
        output: 'Console logs in components/layout/Header.tsx when toast debug is toggled.',
        relatedOptions: ['ui-logs', 'notifications'],
        file: 'components/layout/Header.tsx',
        usedIn: ['stores/toastStore.ts', 'components/ui/Toast.tsx'],
        keyboardShortcut: null,
        note: undefined,
        isCurrentlyActive: true,
        example: `[Toast] Created: type=success, title="Added to Watchlist"
[Toast] Queue: 2 active, 3 pending
[Toast] Auto-dismiss scheduled: 5000ms
[Toast] Toast dismissed: id=toast_123
[Toast] Queue cleared`,
    },
    'api-results': {
        title: 'API Results Viewer',
        category: 'UI & Interaction',
        color: 'purple',
        icon: '📡',
        description: 'Adds a button to view raw API response data from TMDB and internal APIs.',
        whatItDoes: [
            'Adds "View API Results" button to UI',
            'Shows raw JSON response from TMDB API',
            'Displays internal API route responses',
            'Provides syntax-highlighted JSON viewer',
            'Allows copying response data to clipboard',
            'Shows response metadata (status, headers, timing)',
        ],
        when: [
            'Debugging TMDB API data structure',
            'Verifying API response correctness',
            'Investigating missing or incorrect data',
            'Comparing expected vs actual API responses',
            'Testing API error handling',
        ],
        output: 'Button appears in Modal component to view raw API results in a formatted JSON viewer.',
        relatedOptions: ['api-server', 'cache'],
        file: 'components/modals/Modal.tsx',
        usedIn: ['components/modals/Modal.tsx (showApiResults check)'],
        keyboardShortcut: null,
        note: undefined,
        isCurrentlyActive: true,
        example: `{
  "id": 550,
  "title": "Fight Club",
  "overview": "A ticking-time-bomb...",
  "vote_average": 8.4,
  "genres": [
    { "id": 18, "name": "Drama" }
  ]
}`,
    },
    vitals: {
        title: 'Web Vitals HUD',
        category: 'UI & Interaction',
        color: 'emerald',
        icon: '📊',
        description:
            'Real-time performance metrics overlay showing Core Web Vitals and Next.js metrics.',
        whatItDoes: [
            'Displays LCP (Largest Contentful Paint)',
            'Shows INP (Interaction to Next Paint)',
            'Tracks CLS (Cumulative Layout Shift)',
            'Monitors FCP (First Contentful Paint)',
            'Shows TTFB (Time to First Byte)',
            'Displays Next.js hydration and render times',
            'Color-codes metrics: green (good), yellow (needs improvement), red (poor)',
        ],
        when: [
            'Optimizing page load performance',
            'Debugging layout shift issues',
            'Monitoring interaction responsiveness',
            'Verifying performance improvements',
            'Testing on different devices/networks',
        ],
        output: 'Floating HUD (bottom right) showing all Web Vitals with color-coded ratings. Updates in real-time.',
        relatedOptions: ['ui-logs', 'api-server', 'next-server'],
        file: 'components/debug/WebVitalsHUD.tsx',
        usedIn: ['utils/performance.ts', 'components/utility/VercelAnalyticsWrapper.tsx'],
        keyboardShortcut: 'Alt+Shift+V',
        isCurrentlyActive: true,
        note: undefined,
        example: `Web Vitals:
━━━━━━━━━━━━━━━━━━━━━
🟢 LCP: 1,842ms (good)
   Largest Contentful Paint
🟢 INP: 124ms (good)
   Interaction to Next Paint
🟢 CLS: 0.042 (good)
   Cumulative Layout Shift
🟢 FCP: 1,203ms (good)
   First Contentful Paint`,
    },
    'ui-logs': {
        title: 'UI Interaction Logs',
        category: 'UI & Interaction',
        color: 'indigo',
        icon: '🖱️',
        description:
            'Comprehensive logging of UI interactions including modals, infinite scroll, and carousels.',
        whatItDoes: [
            'Logs modal open/close events',
            'Tracks infinite scroll triggers and loading',
            'Shows carousel navigation events',
            'Monitors component mount/unmount cycles',
            'Logs button clicks and user interactions',
            'Displays UI state transitions',
        ],
        when: [
            'Debugging modal behavior',
            'Investigating infinite scroll issues',
            'Tracking carousel navigation problems',
            'Verifying component lifecycle',
            'Testing user interaction flows',
        ],
        output: 'Console logs with [UI] prefix showing interaction events and state changes.',
        relatedOptions: ['toast', 'banner', 'api-results'],
        file: 'utils/debugLogger.ts',
        usedIn: ['Various UI components (modals, carousels, infinite scroll)'],
        keyboardShortcut: null,
        note: undefined,
        isCurrentlyActive: true,
        example: `[UI] Modal opened: content_id=550, autoPlay=true
[UI] Infinite scroll triggered: page=3, threshold=80%
[UI] Loading more content...
[UI] Carousel navigated: slide 3 of 12
[UI] Modal closed by user
[UI] Component mounted: ContentRow (genre=action)`,
    },
    'api-server': {
        title: 'API & Server-side Logs',
        category: 'UI & Interaction',
        color: 'amber',
        icon: '⚙️',
        description:
            'Logs API route execution, server-side operations, and external API call timing.',
        whatItDoes: [
            'Logs all internal API route hits',
            'Shows TMDB API call timing and responses',
            'Tracks Gemini AI API calls for smart search',
            'Displays server-side errors with full context',
            'Monitors API rate limiting',
            'Shows request/response payloads (sanitized)',
        ],
        when: [
            'Debugging API route errors',
            'Investigating TMDB API issues',
            'Tracking API performance',
            'Verifying rate limiting',
            'Troubleshooting server-side logic',
        ],
        output: 'Console logs showing API operations with timing, status codes, and response sizes.',
        relatedOptions: ['next-server', 'api-results', 'cache'],
        file: 'utils/debugLogger.ts',
        usedIn: ['app/api/**/*.ts (all API routes)'],
        keyboardShortcut: null,
        note: undefined,
        isCurrentlyActive: true,
        example: `[API] GET /api/movies/trending → 200 (342ms)
[API] TMDB API call: /trending/movie/week (287ms)
[API] Response: 20 items, 45.2KB
[API] Gemini API: analyze query "mind-bending thrillers" (1,234ms)
[API] Error: Rate limit exceeded (429) - retrying in 5s`,
    },
    'next-server': {
        title: 'Next.js Development Server Logs',
        category: 'UI & Interaction',
        color: 'slate',
        icon: '▲',
        description:
            'Controls Next.js development server request logging including routes and static files.',
        whatItDoes: [
            'Shows all incoming HTTP requests',
            'Logs route handler execution',
            'Displays static file serving',
            'Tracks hot module replacement (HMR)',
            'Shows compilation warnings/errors',
            'Monitors dev server restart events',
        ],
        when: [
            'Debugging routing issues',
            'Investigating 404 errors',
            'Monitoring dev server performance',
            'Tracking HMR behavior',
            'Verifying request flow',
        ],
        output: 'Terminal output where dev server is running. Controlled by scripts/dev-safe.js.',
        relatedOptions: ['api-server', 'vitals'],
        file: 'scripts/dev-safe.js',
        usedIn: ['next.config.ts', 'scripts/dev-safe.js'],
        keyboardShortcut: null,
        note: undefined,
        isCurrentlyActive: true,
        example: `GET / 200 in 45ms
GET /_next/static/chunks/main.js 200 in 12ms
POST /api/search 200 in 234ms
GET /docs/tracker 200 in 67ms
⚡ Fast Refresh: File updated`,
    },
    banner: {
        title: 'Banner Carousel & Image Loading',
        category: 'UI & Interaction',
        color: 'rose',
        icon: '🎬',
        description: 'Logs banner carousel behavior including image loading and slide transitions.',
        whatItDoes: [
            'Tracks image preloading and caching',
            'Logs slide transition events',
            'Monitors auto-play timing',
            'Shows image load errors',
            'Displays responsive image selection',
            'Logs user navigation (prev/next)',
        ],
        when: [
            'Debugging banner image loading issues',
            'Investigating carousel transition problems',
            'Verifying auto-play behavior',
            'Testing responsive image loading',
            'Troubleshooting image errors',
        ],
        output: 'Console logs with [Banner] prefix showing carousel operations and image events.',
        relatedOptions: ['ui-logs', 'cache'],
        file: 'utils/debugLogger.ts',
        usedIn: ['components/banner/* (banner components)'],
        keyboardShortcut: null,
        note: undefined,
        isCurrentlyActive: true,
        example: `[Banner] Preloading images: 5 slides
[Banner] Image loaded: slide 1 (1920x1080, 345KB, 287ms)
[Banner] Auto-play: transitioning to slide 2
[Banner] Image error: slide 4 - 404 Not Found
[Banner] User navigated: next slide (manual)
[Banner] Paused auto-play on user interaction`,
    },
    tracking: {
        title: 'Interaction Tracking Logs',
        category: 'Features & Tools',
        color: 'yellow',
        icon: '📈',
        description:
            'Logs user interaction tracking events for personalization and recommendations.',
        whatItDoes: [
            'Tracks 10 interaction types (view, like, watchlist, etc.)',
            'Shows weighted scoring (+5 for like, -5 for unlike, etc.)',
            'Logs genre preference calculations',
            'Monitors 90-day retention cleanup',
            'Displays interaction aggregation',
            'Shows recommendation algorithm inputs',
        ],
        when: [
            'Debugging recommendation accuracy',
            'Verifying interaction tracking',
            'Testing genre preference calculation',
            'Investigating missing interactions',
            'Monitoring tracking cleanup',
        ],
        output: 'Console logs showing tracked interactions with weights and genre extraction prefixed with [Tracking].',
        relatedOptions: ['watch-history', 'tracker', 'notifications'],
        file: 'utils/debugLogger.ts',
        usedIn: ['stores/watchHistoryStore.ts', 'utils/interactionTracking.ts'],
        keyboardShortcut: null,
        note: undefined,
        isCurrentlyActive: true,
        example: `[Tracking] Interaction tracked: view_modal (weight: +1)
[Tracking] Content: "Inception" (movie_550)
[Tracking] Genres extracted: [action, scifi, thriller]
[Tracking] Genre preferences updated:
  - Action: 47 points (12 interactions)
  - Sci-Fi: 38 points (9 interactions)
  - Thriller: 29 points (7 interactions)
[Tracking] Cleanup: Removed 5 interactions older than 90 days`,
    },
    notifications: {
        title: 'Notification System Logs',
        category: 'Features & Tools',
        color: 'pink',
        icon: '🔔',
        description:
            'Logs notification system operations including Firestore listeners and real-time updates.',
        whatItDoes: [
            'Tracks notification creation and delivery',
            'Logs Firestore real-time listener events',
            'Shows notification read/unread state changes',
            'Monitors auto-dismiss after 30 days',
            'Displays notification click actions',
            'Logs notification type routing',
        ],
        when: [
            'Debugging notifications not appearing',
            'Investigating real-time sync issues',
            'Verifying notification delivery',
            'Testing notification click actions',
            'Troubleshooting auto-dismiss logic',
        ],
        output: 'Console logs showing notification lifecycle events and Firestore operations with [Notification] prefix.',
        relatedOptions: ['test-notifications', 'tracker', 'toast'],
        file: 'utils/debugLogger.ts',
        usedIn: ['stores/notificationStore.ts', 'components/notifications/*'],
        keyboardShortcut: null,
        note: undefined,
        isCurrentlyActive: true,
        example: `[Notification] Firestore listener attached
[Notification] New notification received:
  Type: collection_update
  Title: "New content in Action Movies"
  Collection: col_123456
[Notification] Marking as read: notif_789012
[Notification] Click action: navigate to /collections/col_123456
[Notification] Auto-dismiss cleanup: 3 notifications older than 30 days`,
    },
    'test-notifications': {
        title: 'Test Notification Button',
        category: 'Features & Tools',
        color: 'red',
        icon: '🧪',
        description: 'Adds a button to create test notifications for debugging the system.',
        whatItDoes: [
            'Creates test notifications of all types',
            'Simulates collection updates',
            'Tests new release notifications',
            'Generates system announcements',
            'Creates share notifications',
            'Tests comment and like notifications',
        ],
        when: [
            'Testing notification panel UI',
            'Verifying notification styling',
            'Testing notification click actions',
            'Debugging notification rendering',
            'Simulating real notification scenarios',
        ],
        output: 'Button appears in NotificationsSection.tsx. Creates test notifications visible in notification panel.',
        relatedOptions: ['notifications', 'toast', 'tracker'],
        file: 'components/settings/NotificationsSection.tsx',
        usedIn: ['stores/notificationStore.ts'],
        keyboardShortcut: null,
        note: undefined,
        isCurrentlyActive: true,
        example: `Click "Test Notification" button →

Notification appears:
━━━━━━━━━━━━━━━━━━━━━
🎬 New content in Action Movies
3 new movies added to your collection
Just now · Collection Update
━━━━━━━━━━━━━━━━━━━━━`,
    },
    'child-safety': {
        title: 'Child Safety Mode Debug',
        category: 'Features & Tools',
        color: 'violet',
        icon: '🛡️',
        description:
            'Logs child safety mode filtering including TMDB rating checks and content decisions.',
        whatItDoes: [
            'Logs content filtering decisions',
            'Shows MPAA and TV rating checks',
            'Tracks threshold comparisons',
            'Displays filtered content count',
            'Monitors PIN protection checks',
            'Logs genre filtering (child-safe genres)',
        ],
        when: [
            'Debugging content not appearing in child mode',
            'Verifying rating-based filtering',
            'Testing PIN protection',
            'Investigating false positives/negatives',
            'Validating child-safe genre filtering',
        ],
        output: 'Console logs showing filtering decisions with ratings and thresholds prefixed with [Child Safety].',
        relatedOptions: ['api-server', 'cache'],
        file: 'utils/childSafetyDebug.ts',
        usedIn: ['utils/childSafetyFilter.ts', 'various API routes'],
        keyboardShortcut: null,
        note: undefined,
        isCurrentlyActive: true,
        example: `[Child Safety] Mode enabled: threshold=PG-13
[Child Safety] Checking: "The Dark Knight" (PG-13)
[Child Safety] ✓ Allowed: rating within threshold
[Child Safety] Checking: "The Matrix" (R)
[Child Safety] ✗ Filtered: R > PG-13
[Child Safety] Results: 18/20 items allowed (2 filtered)
[Child Safety] Genre check: "horror" → not child-safe, excluded`,
    },
}

type DebugSlug = keyof typeof debugOptions

export async function generateMetadata({
    params,
}: {
    params: { slug: string }
}): Promise<Metadata> {
    const option = debugOptions[params.slug as DebugSlug]

    if (!option) {
        return {
            title: 'Debug Option Not Found',
        }
    }

    return {
        title: `${option.title} - Debug Documentation`,
        description: option.description,
    }
}

export default function DebugDetailPage({ params }: { params: { slug: string } }) {
    // Only render in development mode
    if (process.env.NODE_ENV !== 'development') {
        redirect('/')
    }

    const option = debugOptions[params.slug as DebugSlug]

    if (!option) {
        notFound()
    }

    const getCategoryColor = (category: string) => {
        if (category.includes('Firebase')) return 'orange'
        if (category.includes('UI')) return 'blue'
        if (category.includes('Features')) return 'purple'
        return 'gray'
    }

    const categoryColor = getCategoryColor(option.category)

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-gray-100">
            <div className="max-w-4xl mx-auto px-4 py-12">
                {/* Back Button */}
                <Link
                    href="/docs"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group"
                >
                    <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Back to Debug Documentation
                </Link>

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div
                            className={`w-12 h-12 rounded-lg bg-${option.color}-500/20 flex items-center justify-center border border-${option.color}-500/30 text-2xl`}
                        >
                            {option.icon}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">{option.title}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span
                                    className={`text-xs px-2 py-1 rounded bg-${categoryColor}-500/20 text-${categoryColor}-400 border border-${categoryColor}-500/30`}
                                >
                                    {option.category}
                                </span>
                                {option.isCurrentlyActive && (
                                    <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                                        Currently Active
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <p className="text-lg text-gray-300">{option.description}</p>
                </div>

                {/* Keyboard Shortcut */}
                {option.keyboardShortcut && (
                    <div className="mb-8 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-400">Keyboard Shortcut:</span>
                            <kbd className="px-3 py-1.5 bg-gray-700 rounded text-sm border border-gray-600 text-white font-mono">
                                {option.keyboardShortcut}
                            </kbd>
                        </div>
                    </div>
                )}

                {/* Note */}
                {option.note && (
                    <div className="mb-8 bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <span className="text-yellow-500 text-lg flex-shrink-0">⚠</span>
                            <p className="text-sm text-yellow-300">{option.note}</p>
                        </div>
                    </div>
                )}

                {/* What It Does */}
                <section className="mb-8 bg-gray-800/30 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-xl font-semibold text-white mb-4">What It Does</h2>
                    <ul className="space-y-2">
                        {option.whatItDoes.map((item, idx) => (
                            <li key={idx} className="flex gap-3 text-gray-300">
                                <span className="text-green-500 flex-shrink-0 mt-1">✓</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* When to Use */}
                <section className="mb-8 bg-gray-800/30 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-xl font-semibold text-white mb-4">When to Use</h2>
                    <ul className="space-y-2">
                        {option.when.map((item, idx) => (
                            <li key={idx} className="flex gap-3 text-gray-300">
                                <span className="text-blue-500 flex-shrink-0 mt-1">→</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Output */}
                <section className="mb-8 bg-gray-800/30 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-xl font-semibold text-white mb-4">
                        Expected Output/Behavior
                    </h2>
                    <p className="text-gray-300">{option.output}</p>
                </section>

                {/* Example Output */}
                {option.example && (
                    <section className="mb-8 bg-gray-800/30 rounded-lg p-6 border border-gray-700">
                        <h2 className="text-xl font-semibold text-white mb-4">Example Output</h2>
                        <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto text-sm text-green-400 font-mono border border-gray-700">
                            {option.example}
                        </pre>
                    </section>
                )}

                {/* Related Options */}
                {option.relatedOptions.length > 0 && (
                    <section className="mb-8 bg-gray-800/30 rounded-lg p-6 border border-gray-700">
                        <h2 className="text-xl font-semibold text-white mb-4">Related Options</h2>
                        <div className="flex flex-wrap gap-2">
                            {option.relatedOptions.map((slug) => {
                                const related = debugOptions[slug as DebugSlug]
                                if (!related) return null
                                return (
                                    <Link
                                        key={slug}
                                        href={`/docs/${slug}`}
                                        className={`px-3 py-2 rounded bg-${related.color}-500/10 text-${related.color}-400 border border-${related.color}-500/30 hover:bg-${related.color}-500/20 transition-colors text-sm`}
                                    >
                                        {related.icon} {related.title}
                                    </Link>
                                )
                            })}
                        </div>
                    </section>
                )}

                {/* Technical Details */}
                <section className="bg-gray-800/30 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-xl font-semibold text-white mb-4">Technical Details</h2>
                    <div className="space-y-3">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-300 mb-1">Main File</h3>
                            <code className="text-sm text-blue-400 bg-black/50 px-2 py-1 rounded">
                                {option.file}
                            </code>
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-gray-300 mb-1">Used In</h3>
                            <ul className="space-y-1">
                                {Array.isArray(option.usedIn) ? (
                                    option.usedIn.map((file, idx) => (
                                        <li key={idx}>
                                            <code className="text-sm text-gray-400 bg-black/50 px-2 py-1 rounded">
                                                {file}
                                            </code>
                                        </li>
                                    ))
                                ) : (
                                    <li>
                                        <code className="text-sm text-gray-400 bg-black/50 px-2 py-1 rounded">
                                            {option.usedIn}
                                        </code>
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}
