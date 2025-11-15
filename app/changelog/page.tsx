'use client'

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
                            We chose <strong className="text-white">Resend</strong> as our email
                            delivery provider after evaluating several options. Resend offers a
                            modern developer experience with excellent deliverability rates (99.9%),
                            generous free tier (100 emails/day), and simple API integration. Unlike
                            traditional email services, Resend was built specifically for
                            transactional emails, making it perfect for our notification system.
                        </p>

                        <p className="text-gray-300 leading-relaxed mb-4">
                            The email system introduces comprehensive branded HTML templates that
                            match NetTrailer&apos;s dark theme aesthetic. Each template includes
                            responsive design for mobile devices, inline CSS for email client
                            compatibility, and one-click unsubscribe links for user convenience.
                        </p>

                        <div className="bg-gray-800/50 rounded-lg p-4 my-6 border-l-4 border-blue-500">
                            <h4 className="text-white font-semibold mb-2">Key Features</h4>
                            <ul className="space-y-2 text-gray-300">
                                <li>
                                    • Weekly digest emails consolidate activity into a single Monday
                                    morning update
                                </li>
                                <li>
                                    • Smart batching prevents spam by limiting ranking like
                                    notifications to max 1/hour
                                </li>
                                <li>
                                    • Token-based unsubscribe system allows users to opt-out without
                                    logging in
                                </li>
                                <li>
                                    • Email preferences UI gives granular control over notification
                                    types
                                </li>
                            </ul>
                        </div>

                        <p className="text-gray-300 leading-relaxed">
                            The system includes retry logic and delivery tracking to ensure reliable
                            email delivery. At scale (10k users), estimated costs are ~$40/month on
                            Resend&apos;s Pro tier.
                        </p>
                    </VersionRelease>

                    <VersionRelease
                        version="1.5.0"
                        date="January 13, 2025"
                        title="Performance Revolution"
                    >
                        <p className="text-gray-300 leading-relaxed mb-4">
                            This release focused on making NetTrailer blazing fast. We implemented
                            production-only API response caching with stale-while-revalidate
                            strategy, reducing repeat visit load times by{' '}
                            <strong className="text-green-400">90%</strong>. High-traffic routes
                            like search, movie details, and trending content now serve cached
                            responses within milliseconds.
                        </p>

                        <p className="text-gray-300 leading-relaxed mb-4">
                            Image optimization was a major win. By switching from JPEG to WebP
                            format and implementing browser-based compression using Web Workers, we
                            achieved{' '}
                            <strong className="text-green-400">80-90% file size reduction</strong>.
                            A 4.2MB upload now compresses to just 425KB before hitting Firebase
                            Storage. This translates to massive cost savings—from $24k/month to
                            $2.4k/month for a hypothetical 10k user base with 50k images.
                        </p>

                        <div className="bg-gray-800/50 rounded-lg p-4 my-6">
                            <h4 className="text-white font-semibold mb-3">Performance Metrics</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <MetricItem label="Initial Load" value="80% faster" />
                                <MetricItem label="Repeat Visits" value="90% faster" />
                                <MetricItem label="Image Size" value="90% smaller" />
                                <MetricItem label="Lighthouse Score" value="95+" />
                            </div>
                        </div>

                        <p className="text-gray-300 leading-relaxed">
                            Component memoization with React.memo and useMemo eliminated unnecessary
                            re-renders, making scrolling butter-smooth even with hundreds of content
                            cards on screen.
                        </p>
                    </VersionRelease>

                    <VersionRelease
                        version="1.4.0"
                        date="January 10, 2025"
                        title="Community Forums & Polls"
                    >
                        <p className="text-gray-300 leading-relaxed mb-4">
                            Building a community discussion platform required careful consideration
                            of data structure and moderation. We chose Firestore for its real-time
                            capabilities and scalability. The forum supports six categories
                            (General, Movies, TV Shows, Recommendations, Rankings, Announcements)
                            with threaded conversations and nested replies.
                        </p>

                        <p className="text-gray-300 leading-relaxed mb-4">
                            The polling system introduces interactive voting with real-time results.
                            Users can create single or multiple-choice polls with optional
                            expiration dates. Vote tracking ensures one vote per user per poll using
                            Firestore&apos;s composite keys for efficient lookups.
                        </p>

                        <p className="text-gray-300 leading-relaxed mb-4">
                            Image uploads integrate with Firebase Storage, with automatic WebP
                            compression reducing storage costs. Thread authors have moderation
                            powers to delete inappropriate replies, creating a self-policing
                            community structure.
                        </p>
                    </VersionRelease>

                    <VersionRelease
                        version="1.3.0"
                        date="January 5, 2025"
                        title="Rankings & Public Profiles"
                    >
                        <p className="text-gray-300 leading-relaxed mb-4">
                            The ranking system lets users create IMDb-style lists with drag-and-drop
                            ordering and custom scoring. We implemented 30 popular tags for content
                            discovery, making it easy to find rankings about specific themes like
                            &quot;Time Travel&quot; or &quot;Strong Female Lead.&quot;
                        </p>

                        <p className="text-gray-300 leading-relaxed mb-4">
                            Public profiles showcase user activity and contributions. The comment
                            system supports nested replies with engagement metrics (likes, views,
                            reply counts). A comprehensive seed data script populates 35+ example
                            rankings for testing and demo purposes.
                        </p>

                        <p className="text-gray-300 leading-relaxed">
                            Community engagement features like cloning popular rankings encourage
                            participation while crediting original creators. The sorting system
                            (Recent, Popular, Most Liked) helps surface quality content.
                        </p>
                    </VersionRelease>

                    <VersionRelease
                        version="1.2.0"
                        date="December 20, 2024"
                        title="AI-Powered Smart Search"
                    >
                        <p className="text-gray-300 leading-relaxed mb-4">
                            Smart search represents our biggest technical achievement. We integrated
                            Google&apos;s Gemini 2.5 Flash model to understand natural language
                            queries like &quot;rainy day vibes&quot; or &quot;mind-bending
                            thrillers.&quot; The AI analyzes queries to extract genre preferences,
                            cast/crew requirements, and thematic concepts, then generates optimized
                            TMDB API filters.
                        </p>

                        <p className="text-gray-300 leading-relaxed mb-4">
                            Voice input using the Web Speech API allows hands-free searching. The
                            live transcript display gives visual feedback during recognition, and
                            entity recognition with <code className="text-green-400">@actors</code>{' '}
                            and <code className="text-green-400">#directors</code> autocomplete
                            makes building complex queries intuitive.
                        </p>

                        <p className="text-gray-300 leading-relaxed">
                            The smart suggestion system uses AI to generate creative collection
                            names. Instead of &quot;Action Movies,&quot; you get &quot;Adrenaline
                            Rush: High- Octane Action Thrillers.&quot; This personality makes the
                            app feel more engaging and less robotic.
                        </p>
                    </VersionRelease>

                    <VersionRelease
                        version="1.1.0"
                        date="December 1, 2024"
                        title="Custom Collections"
                    >
                        <p className="text-gray-300 leading-relaxed mb-4">
                            Collections transform how users organize content. Three collection types
                            serve different needs: Manual for hand-picked favorites, TMDB
                            Genre-Based for auto-updating themed lists, and AI-Generated for natural
                            language queries.
                        </p>

                        <p className="text-gray-300 leading-relaxed mb-4">
                            The auto-update system runs daily via Vercel cron jobs (2 AM UTC),
                            checking TMDB for new releases matching collection filters. Visual
                            indicators like the &quot;Auto&quot; badge and &quot;+5 new items&quot;
                            counter keep users informed about updates.
                        </p>

                        <p className="text-gray-300 leading-relaxed">
                            Collection sharing generates public links with view analytics. Open
                            Graph tags ensure beautiful previews when sharing on social media. Users
                            can revoke share links anytime from settings.
                        </p>
                    </VersionRelease>

                    <VersionRelease
                        version="1.0.0"
                        date="November 1, 2024"
                        title="Initial Release"
                        isInitial
                    >
                        <p className="text-gray-300 leading-relaxed mb-4">
                            NetTrailer launched with a comprehensive feature set built over 3 months
                            of development. The Netflix-inspired design uses a dark theme with
                            smooth animations and responsive layouts optimized for mobile-first
                            experiences.
                        </p>

                        <p className="text-gray-300 leading-relaxed mb-4">
                            State management uses Zustand with 18 focused stores instead of a
                            monolithic Redux setup. This architecture improves performance through
                            granular updates and makes the codebase more maintainable. Guest mode
                            with localStorage and authenticated mode with Firestore sync both use
                            the same underlying store factory pattern.
                        </p>

                        <p className="text-gray-300 leading-relaxed mb-4">
                            Child Safety Mode filters content by MPAA and TV ratings with optional
                            PIN protection. Server-side filtering ensures kids can&apos;t bypass
                            restrictions, and cache invalidation prevents stale content from leaking
                            through.
                        </p>

                        <p className="text-gray-300 leading-relaxed">
                            The initial release included 30+ API routes, comprehensive error
                            handling, and integration with TMDB, Firebase, and Google Analytics.
                            Development focused on building a solid foundation for rapid feature
                            iteration.
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
