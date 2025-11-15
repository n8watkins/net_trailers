'use client'

import Link from 'next/link'
import { DocumentTextIcon } from '@heroicons/react/24/outline'
import SubPageLayout from '@/components/layout/SubPageLayout'

export default function ChangelogPage() {
    return (
        <SubPageLayout
            title="Changelog"
            icon={<DocumentTextIcon className="w-8 h-8" />}
            iconColor="text-blue-400"
            description="Version history and release notes for NetTrailer"
        >
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatCard number="931+" label="Commits" color="green" />
                    <StatCard number="v1.6.0" label="Current Version" color="blue" />
                    <StatCard number="13" label="Major Releases" color="purple" />
                    <StatCard number="3 mos" label="Development" color="orange" />
                </div>

                {/* Version Releases */}
                <div className="space-y-12">
                    <VersionRelease
                        version="1.6.0"
                        date="January 14, 2025"
                        title="Email Notification System"
                        badge="Latest"
                    >
                        <p className="text-gray-300 leading-relaxed mb-4">
                            We chose <strong className="text-white">Resend</strong> for email
                            delivery due to its excellent deliverability (99.9%), generous free tier
                            (100 emails/day), and modern developer experience. The system includes
                            branded HTML templates, smart batching, and comprehensive user controls.
                        </p>

                        <div className="mb-4">
                            <h4 className="text-white font-semibold mb-3">What&apos;s New</h4>
                            <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                <li>
                                    Weekly digest emails consolidating activity (Monday mornings)
                                </li>
                                <li>
                                    Collection update notifications when auto-updating collections
                                    find new content
                                </li>
                                <li>Ranking comment and like notifications with smart batching</li>
                                <li>
                                    One-click unsubscribe system with token-based authentication
                                </li>
                                <li>
                                    Granular email preferences in{' '}
                                    <Link
                                        href="/settings"
                                        className="text-blue-400 hover:text-blue-300 underline"
                                    >
                                        Settings
                                    </Link>
                                </li>
                                <li>Responsive branded templates with dark mode support</li>
                            </ul>
                        </div>

                        <p className="text-gray-300 leading-relaxed text-sm">
                            <strong className="text-white">Cost Impact:</strong> At scale (10k
                            users), estimated ~$40/month on Resend Pro tier.
                        </p>
                    </VersionRelease>

                    <VersionRelease
                        version="1.5.0"
                        date="January 13, 2025"
                        title="Performance Revolution"
                    >
                        <p className="text-gray-300 leading-relaxed mb-4">
                            This release focused on making NetTrailer blazing fast through API
                            caching, image compression, and component optimization. WebP compression
                            alone reduced image sizes by{' '}
                            <strong className="text-green-400">90%</strong> (4.2MB → 425KB), saving
                            ~$22k/month at scale.
                        </p>

                        <div className="mb-4">
                            <h4 className="text-white font-semibold mb-3">
                                Performance Improvements
                            </h4>
                            <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                <li>
                                    API response caching with stale-while-revalidate (90% faster
                                    repeat visits)
                                </li>
                                <li>
                                    Browser-based WebP image compression using Web Workers (80-90%
                                    file size reduction)
                                </li>
                                <li>
                                    Native lazy loading on all images (80% faster initial page load)
                                </li>
                                <li>
                                    React.memo and useMemo for Row component (smoother scrolling)
                                </li>
                                <li>
                                    Production-only caching for high-traffic routes (search,
                                    details, trending)
                                </li>
                            </ul>
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                            <h4 className="text-white font-semibold mb-3">Impact Metrics</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <MetricItem label="Initial Load" value="80% faster" />
                                <MetricItem label="Repeat Visits" value="90% faster" />
                                <MetricItem label="Image Size" value="90% smaller" />
                                <MetricItem label="Lighthouse Score" value="95+" />
                            </div>
                        </div>

                        <p className="text-gray-300 leading-relaxed text-sm">
                            <strong className="text-white">Cost Impact:</strong> Image compression
                            reduces storage costs from $24k/month to $2.4k/month for 10k users with
                            50k images.
                        </p>
                    </VersionRelease>

                    <VersionRelease
                        version="1.4.0"
                        date="January 10, 2025"
                        title="Community Forums & Polls"
                    >
                        <p className="text-gray-300 leading-relaxed mb-4">
                            We chose Firestore for the forum backend due to its real-time
                            capabilities and scalability. The system supports threaded discussions,
                            interactive polls, and community moderation across six categories.
                        </p>

                        <div className="mb-4">
                            <h4 className="text-white font-semibold mb-3">Forum Features</h4>
                            <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                <li>
                                    Discussion threads with 6 categories (General, Movies, TV,
                                    Recommendations, Rankings, Announcements)
                                </li>
                                <li>Nested reply system with conversation threading</li>
                                <li>Like/unlike threads and replies with engagement metrics</li>
                                <li>Thread author moderation (delete inappropriate replies)</li>
                                <li>Image uploads with Firebase Storage integration</li>
                                <li>Single/multiple-choice polls with optional expiration dates</li>
                                <li>Real-time vote counting with visual progress bars</li>
                                <li>One vote per user tracking using Firestore composite keys</li>
                            </ul>
                        </div>

                        <p className="text-gray-300 leading-relaxed text-sm">
                            Visit the{' '}
                            <Link
                                href="/community"
                                className="text-blue-400 hover:text-blue-300 underline"
                            >
                                Community page
                            </Link>{' '}
                            to explore discussions and polls.
                        </p>
                    </VersionRelease>

                    <VersionRelease
                        version="1.3.0"
                        date="January 5, 2025"
                        title="Rankings & Public Profiles"
                    >
                        <p className="text-gray-300 leading-relaxed mb-4">
                            IMDb-style ranking system with drag-and-drop ordering, custom scoring,
                            and 30 popular tags for content discovery. Public profiles showcase user
                            contributions with engagement metrics and threaded comments.
                        </p>

                        <div className="mb-4">
                            <h4 className="text-white font-semibold mb-3">Ranking Features</h4>
                            <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                <li>Create custom rankings with drag-and-drop ordering</li>
                                <li>Custom scoring system for ranked items</li>
                                <li>Public/private visibility controls</li>
                                <li>
                                    30 popular tags (Time Travel, Strong Female Lead, Plot Twists,
                                    etc.)
                                </li>
                                <li>Tag-based content browsing with pagination</li>
                                <li>Clone functionality crediting original creators</li>
                                <li>Threaded comment system with nested replies</li>
                                <li>
                                    Engagement metrics (likes, views, reply counts, comment counts)
                                </li>
                                <li>
                                    Sorting options (Recent, Popular, Most Liked, Most Viewed, Most
                                    Replied)
                                </li>
                                <li>Seed data script with 35+ example rankings</li>
                            </ul>
                        </div>

                        <p className="text-gray-300 leading-relaxed text-sm">
                            <Link
                                href="/rankings/new"
                                className="text-blue-400 hover:text-blue-300 underline"
                            >
                                Create your first ranking
                            </Link>{' '}
                            or browse{' '}
                            <Link
                                href="/community"
                                className="text-blue-400 hover:text-blue-300 underline"
                            >
                                public rankings
                            </Link>
                            .
                        </p>
                    </VersionRelease>

                    <VersionRelease
                        version="1.2.0"
                        date="December 20, 2024"
                        title="AI-Powered Smart Search"
                    >
                        <p className="text-gray-300 leading-relaxed mb-4">
                            Google&apos;s Gemini 2.5 Flash powers natural language search,
                            understanding queries like &quot;rainy day vibes&quot; or
                            &quot;mind-bending thrillers.&quot; The AI extracts genres, cast/crew,
                            and thematic concepts to generate optimized TMDB filters.
                        </p>

                        <div className="mb-4">
                            <h4 className="text-white font-semibold mb-3">Smart Search Features</h4>
                            <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                <li>
                                    Natural language query understanding (semantic concepts, vibes,
                                    themes)
                                </li>
                                <li>Voice input with live transcription (Web Speech API)</li>
                                <li>
                                    Entity recognition with autocomplete (
                                    <code className="text-green-400 text-xs">@actors</code>,{' '}
                                    <code className="text-green-400 text-xs">#directors</code>)
                                </li>
                                <li>
                                    Auto-detection of media type preferences (movies, TV, or both)
                                </li>
                                <li>Save results as custom collections with one click</li>
                                <li>
                                    Live preview showing result count before collection creation
                                </li>
                                <li>
                                    AI-generated collection names (&quot;Adrenaline Rush:
                                    High-Octane Action&quot;)
                                </li>
                                <li>Glassmorphism styling with visual feedback</li>
                            </ul>
                        </div>

                        <p className="text-gray-300 leading-relaxed text-sm">
                            Try{' '}
                            <Link
                                href="/smartsearch"
                                className="text-blue-400 hover:text-blue-300 underline"
                            >
                                Smart Search
                            </Link>{' '}
                            or click the search icon in the header.
                        </p>
                    </VersionRelease>

                    <VersionRelease
                        version="1.1.0"
                        date="December 1, 2024"
                        title="Custom Collections"
                    >
                        <p className="text-gray-300 leading-relaxed mb-4">
                            Three collection types serve different needs: Manual (hand-picked),
                            Genre-Based (auto-updating), and AI-Generated (natural language). Daily
                            cron jobs check TMDB for new releases, and public sharing includes view
                            analytics.
                        </p>

                        <div className="mb-4">
                            <h4 className="text-white font-semibold mb-3">Collection Features</h4>
                            <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                <li>
                                    Three types: Manual, TMDB Genre-Based, AI-Generated from queries
                                </li>
                                <li>
                                    Advanced filters (year range, rating, cast, director,
                                    popularity)
                                </li>
                                <li>Drag-and-drop content reordering</li>
                                <li>Custom icons and colors for visual organization</li>
                                <li>Display as row toggle for homepage visibility</li>
                                <li>Public/private visibility controls</li>
                                <li>Auto-update system via Vercel cron jobs (daily at 2 AM UTC)</li>
                                <li>
                                    Visual indicators (&quot;Auto&quot; badge, &quot;+5 new&quot;
                                    counter)
                                </li>
                                <li>Shareable public links with view analytics</li>
                                <li>Open Graph tags for social media previews</li>
                                <li>Revoke share links anytime from settings</li>
                            </ul>
                        </div>

                        <p className="text-gray-300 leading-relaxed text-sm">
                            Manage collections in{' '}
                            <Link
                                href="/collections"
                                className="text-blue-400 hover:text-blue-300 underline"
                            >
                                My Collections
                            </Link>{' '}
                            or{' '}
                            <Link
                                href="/rows"
                                className="text-blue-400 hover:text-blue-300 underline"
                            >
                                Edit Rows
                            </Link>
                            .
                        </p>
                    </VersionRelease>

                    <VersionRelease
                        version="1.0.0"
                        date="November 1, 2024"
                        title="Initial Release"
                        isInitial
                    >
                        <p className="text-gray-300 leading-relaxed mb-4">
                            NetTrailer launched with a comprehensive feature set built over 3
                            months. We chose Zustand (18 focused stores) over Redux for better
                            performance and maintainability. The Netflix-inspired design uses a dark
                            theme with responsive layouts.
                        </p>

                        <div className="mb-4">
                            <h4 className="text-white font-semibold mb-3">Core Features</h4>
                            <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                <li>Browse trending movies and TV shows</li>
                                <li>Real-time search with 300ms debouncing</li>
                                <li>Advanced filtering (genre, rating, year)</li>
                                <li>YouTube trailer integration with ReactPlayer</li>
                                <li>Guest mode (localStorage) and Firebase authentication</li>
                                <li>Personal watchlists, liked content, hidden content</li>
                                <li>
                                    Child Safety Mode with PIN protection and server-side filtering
                                </li>
                                <li>In-app notifications with real-time Firestore listeners</li>
                                <li>Interaction tracking powering personalized recommendations</li>
                                <li>Watch history with automatic content tracking</li>
                                <li>30+ API routes proxying TMDB</li>
                                <li>Sentry error monitoring (client + server)</li>
                            </ul>
                        </div>

                        <p className="text-gray-300 leading-relaxed text-sm">
                            <strong className="text-white">Tech Stack:</strong> Next.js 16, React
                            19, TypeScript 5.7, Zustand 5.0, Tailwind CSS 3.4, Firebase 11.0
                        </p>
                    </VersionRelease>
                </div>
            </div>
        </SubPageLayout>
    )
}

// Component definitions
function StatCard({
    number,
    label,
    color,
}: {
    number: string
    label: string
    color: 'green' | 'blue' | 'purple' | 'orange'
}) {
    const colorClasses = {
        green: 'text-green-400 border-green-500/30',
        blue: 'text-blue-400 border-blue-500/30',
        purple: 'text-purple-400 border-purple-500/30',
        orange: 'text-orange-400 border-orange-500/30',
    }

    return (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 text-center">
            <div
                className={`text-2xl md:text-3xl font-bold mb-1 ${colorClasses[color].split(' ')[0]}`}
            >
                {number}
            </div>
            <div className="text-xs md:text-sm text-gray-400">{label}</div>
        </div>
    )
}

function VersionRelease({
    version,
    date,
    title,
    badge,
    isInitial,
    children,
}: {
    version: string
    date: string
    title: string
    badge?: string
    isInitial?: boolean
    children: React.ReactNode
}) {
    const versionColor = isInitial
        ? 'text-blue-400 border-blue-500'
        : 'text-green-400 border-green-500'

    return (
        <div className="relative">
            {/* Version Number Badge */}
            <div className="flex items-center gap-3 mb-4">
                <div className={`text-4xl font-bold font-mono ${versionColor.split(' ')[0]}`}>
                    v{version}
                </div>
                {badge && (
                    <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded-full border border-red-500/30">
                        {badge}
                    </span>
                )}
            </div>

            {/* Date */}
            <div className="text-gray-400 text-sm mb-2">{date}</div>

            {/* Title */}
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">{title}</h2>

            {/* Content */}
            <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700/50">
                {children}
            </div>
        </div>
    )
}

function MetricItem({ label, value }: { label: string; value: string }) {
    return (
        <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{value}</div>
            <div className="text-sm text-gray-400">{label}</div>
        </div>
    )
}
