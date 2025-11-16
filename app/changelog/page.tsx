'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
    DocumentTextIcon,
    AcademicCapIcon,
    InformationCircleIcon,
    ChevronDownIcon,
    ChevronUpIcon,
} from '@heroicons/react/24/outline'
import SubPageLayout from '@/components/layout/SubPageLayout'
import AboutModal from '@/components/modals/AboutModal'
import TutorialModal from '@/components/modals/TutorialModal'

export default function ChangelogPage() {
    const [showAbout, setShowAbout] = useState(false)
    const [showTutorial, setShowTutorial] = useState(false)
    const [expandedVersions, setExpandedVersions] = useState<Set<string>>(
        new Set(['1.6.0']) // Latest version expanded by default
    )

    const updateUrlHash = useCallback((hash?: string) => {
        if (typeof window === 'undefined') return
        const basePath = `${window.location.pathname}${window.location.search || ''}`
        window.history.pushState(null, '', hash ? `${basePath}#${hash}` : basePath)
    }, [])

    const toggleVersion = (version: string) => {
        setExpandedVersions((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(version)) {
                newSet.delete(version)
                // Clear hash if collapsing
                if (typeof window !== 'undefined' && window.location.hash === `#v${version}`) {
                    updateUrlHash()
                }
            } else {
                newSet.add(version)
                // Update hash when expanding
                updateUrlHash(`v${version}`)
            }
            return newSet
        })
    }

    // Handle URL hash on mount and hash changes
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.slice(1) // Remove #
            if (hash.startsWith('v')) {
                const version = hash.slice(1) // Remove 'v' prefix
                setExpandedVersions((prev) => {
                    const newSet = new Set(prev)
                    newSet.add(version)
                    return newSet
                })
                // Scroll to the version after a short delay to ensure it's expanded
                setTimeout(() => {
                    const element = document.getElementById(hash)
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                }, 100)
            }
        }

        // Handle initial hash on mount
        handleHashChange()

        // Listen for hash changes
        window.addEventListener('hashchange', handleHashChange)
        return () => window.removeEventListener('hashchange', handleHashChange)
    }, [])

    const expandAll = () => {
        setExpandedVersions(
            new Set([
                '1.6.0',
                '1.5.2',
                '1.5.1',
                '1.5.0',
                '1.4.2',
                '1.4.1',
                '1.4.0',
                '1.3.0',
                '1.2.0',
                '1.1.0',
                '1.0.0',
                '0.3.0',
                '0.2.0',
                '0.1.0',
            ])
        )
    }

    const collapseAll = () => {
        setExpandedVersions(new Set())
    }

    return (
        <>
            <SubPageLayout
                title="Changelog"
                icon={<DocumentTextIcon className="w-8 h-8" />}
                iconColor="text-blue-400"
                description="Version history and release notes for NetTrailer"
            >
                <div className="max-w-5xl mx-auto space-y-8">
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <StatCard number="933+" label="Commits" color="green" />
                        <StatCard number="v1.6.0" label="Current Version" color="blue" />
                        <StatCard number="14" label="Total Releases" color="purple" />
                        <StatCard number="4 mos" label="Development" color="orange" />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-4 mb-8">
                        <button
                            onClick={() => setShowTutorial(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/30 hover:bg-blue-500/30 transition-colors"
                        >
                            <AcademicCapIcon className="w-5 h-5" />
                            <span>View Tutorial</span>
                        </button>
                        <button
                            onClick={() => setShowAbout(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
                        >
                            <InformationCircleIcon className="w-5 h-5" />
                            <span>About NetTrailer</span>
                        </button>
                        <a
                            href="https://github.com/n8watkins/net_trailers"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 text-gray-300 rounded-lg border border-gray-600/50 hover:bg-gray-700 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path
                                    fillRule="evenodd"
                                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <span>View on GitHub</span>
                        </a>
                        <a
                            href="https://github.com/n8watkins/net_trailers/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/30 hover:bg-orange-500/30 transition-colors"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                            <span>Report Issue</span>
                        </a>
                    </div>

                    {/* Expand/Collapse Controls */}
                    <div className="flex gap-3 mb-6">
                        <button
                            onClick={expandAll}
                            className="text-sm px-3 py-1.5 bg-green-500/20 text-green-400 rounded border border-green-500/30 hover:bg-green-500/30 transition-colors"
                        >
                            Expand All
                        </button>
                        <button
                            onClick={collapseAll}
                            className="text-sm px-3 py-1.5 bg-red-500/20 text-red-400 rounded border border-red-500/30 hover:bg-red-500/30 transition-colors"
                        >
                            Collapse All
                        </button>
                    </div>

                    {/* Version Releases */}
                    <div className="space-y-6">
                        <VersionRelease
                            version="1.6.0"
                            date="January 14, 2025"
                            title="Email Notification System"
                            badge="Latest"
                            isExpanded={expandedVersions.has('1.6.0')}
                            onToggle={() => toggleVersion('1.6.0')}
                        >
                            <p className="text-gray-300 leading-relaxed mb-4">
                                We chose <strong className="text-white">Resend</strong> for email
                                delivery due to its excellent deliverability (99.9%), generous free
                                tier (100 emails/day), and modern developer experience. The system
                                includes branded HTML templates, smart batching, and comprehensive
                                user controls.
                            </p>

                            <div className="mb-4">
                                <h4 className="text-white font-semibold mb-3">What&apos;s New</h4>
                                <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                    <li>
                                        Weekly digest emails consolidating activity (Monday
                                        mornings)
                                    </li>
                                    <li>
                                        Collection update notifications when auto-updating
                                        collections find new content
                                    </li>
                                    <li>
                                        Ranking comment and like notifications with smart batching
                                    </li>
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
                            version="1.5.2"
                            date="January 13, 2025"
                            title="Component Performance Optimization"
                            isExpanded={expandedVersions.has('1.5.2')}
                            onToggle={() => toggleVersion('1.5.2')}
                        >
                            <p className="text-gray-300 leading-relaxed mb-4">
                                Focused on eliminating unnecessary re-renders with React
                                memoization.
                            </p>

                            <div className="mb-4">
                                <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                    <li>React.memo on Row component for smoother scrolling</li>
                                    <li>
                                        useMemo for filteredContent calculations (prevents
                                        re-filtering on every render)
                                    </li>
                                    <li>
                                        useCallback for event handlers to stabilize function
                                        references
                                    </li>
                                </ul>
                            </div>
                        </VersionRelease>

                        <VersionRelease
                            version="1.5.1"
                            date="January 13, 2025"
                            title="Image Lazy Loading"
                            isExpanded={expandedVersions.has('1.5.1')}
                            onToggle={() => toggleVersion('1.5.1')}
                        >
                            <p className="text-gray-300 leading-relaxed mb-4">
                                Implemented native browser lazy loading to improve initial page load
                                by 80%.
                            </p>

                            <div className="mb-4">
                                <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                    <li>Native lazy loading attribute on all Image components</li>
                                    <li>Intersection Observer for content cards</li>
                                    <li>Priority loading for hero images</li>
                                    <li>Reduced initial bandwidth usage dramatically</li>
                                </ul>
                            </div>
                        </VersionRelease>

                        <VersionRelease
                            version="1.5.0"
                            date="January 12, 2025"
                            title="API Caching & WebP Compression"
                            isExpanded={expandedVersions.has('1.5.0')}
                            onToggle={() => toggleVersion('1.5.0')}
                        >
                            <p className="text-gray-300 leading-relaxed mb-4">
                                Major performance upgrade through API response caching and WebP
                                image compression. WebP reduced image sizes by 90% (4.2MB → 425KB),
                                saving ~$22k/month in storage costs at scale.
                            </p>

                            <div className="mb-4">
                                <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                    <li>
                                        <strong className="text-white">
                                            90% faster repeat visits
                                        </strong>{' '}
                                        - API caching with stale-while-revalidate
                                    </li>
                                    <li>
                                        <strong className="text-white">90% smaller images</strong> -
                                        WebP compression using Web Workers
                                    </li>
                                    <li>
                                        <strong className="text-white">95+ Lighthouse score</strong>{' '}
                                        - Production optimizations
                                    </li>
                                    <li>Cache duration: 5-10 minutes for high-traffic routes</li>
                                    <li>
                                        Browser-based compression (non-blocking via Web Workers)
                                    </li>
                                </ul>
                            </div>

                            <p className="text-gray-300 leading-relaxed text-sm">
                                <strong className="text-white">Cost Impact:</strong> Storage reduced
                                from $24k/month to $2.4k/month for 10k users with 50k images.
                            </p>
                        </VersionRelease>

                        <VersionRelease
                            version="1.4.2"
                            date="January 11, 2025"
                            title="Poll Voting System"
                            isExpanded={expandedVersions.has('1.4.2')}
                            onToggle={() => toggleVersion('1.4.2')}
                        >
                            <p className="text-gray-300 leading-relaxed mb-4">
                                Added interactive polls with real-time results and vote tracking.
                            </p>

                            <div className="mb-4">
                                <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                    <li>Single/multiple-choice polls with 2-10 options</li>
                                    <li>Optional expiration dates for time-limited voting</li>
                                    <li>Real-time vote counting with visual progress bars</li>
                                    <li>One vote per user using Firestore composite keys</li>
                                    <li>Poll detail pages at `/community/polls/[id]`</li>
                                </ul>
                            </div>
                        </VersionRelease>

                        <VersionRelease
                            version="1.4.1"
                            date="January 10, 2025"
                            title="Image Uploads & Moderation"
                            isExpanded={expandedVersions.has('1.4.1')}
                            onToggle={() => toggleVersion('1.4.1')}
                        >
                            <p className="text-gray-300 leading-relaxed mb-4">
                                Added image upload support and community moderation tools.
                            </p>

                            <div className="mb-4">
                                <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                    <li>Firebase Storage integration for thread images</li>
                                    <li>Automatic WebP compression on upload</li>
                                    <li>
                                        Thread author moderation powers (delete inappropriate
                                        replies)
                                    </li>
                                    <li>Report system for flagging content</li>
                                    <li>Drag-and-drop image upload component</li>
                                </ul>
                            </div>
                        </VersionRelease>

                        <VersionRelease
                            version="1.4.0"
                            date="January 9, 2025"
                            title="Discussion Forums"
                            isExpanded={expandedVersions.has('1.4.0')}
                            onToggle={() => toggleVersion('1.4.0')}
                        >
                            <p className="text-gray-300 leading-relaxed mb-4">
                                Chose Firestore for forum backend due to real-time capabilities and
                                scalability. Supports threaded discussions across six categories.
                            </p>

                            <div className="mb-4">
                                <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                    <li>
                                        6 categories: General, Movies, TV, Recommendations,
                                        Rankings, Announcements
                                    </li>
                                    <li>Nested reply system with conversation threading</li>
                                    <li>Like/unlike threads and replies</li>
                                    <li>View count tracking and engagement metrics</li>
                                    <li>Thread detail pages at `/community/threads/[id]`</li>
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
                            isExpanded={expandedVersions.has('1.3.0')}
                            onToggle={() => toggleVersion('1.3.0')}
                        >
                            <p className="text-gray-300 leading-relaxed mb-4">
                                IMDb-style ranking system with drag-and-drop ordering, custom
                                scoring, and 30 popular tags for content discovery. Public profiles
                                showcase user contributions with engagement metrics and threaded
                                comments.
                            </p>

                            <div className="mb-4">
                                <h4 className="text-white font-semibold mb-3">Ranking Features</h4>
                                <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                    <li>Create custom rankings with drag-and-drop ordering</li>
                                    <li>Custom scoring system for ranked items</li>
                                    <li>Public/private visibility controls</li>
                                    <li>
                                        30 popular tags (Time Travel, Strong Female Lead, Plot
                                        Twists, etc.)
                                    </li>
                                    <li>Tag-based content browsing with pagination</li>
                                    <li>Clone functionality crediting original creators</li>
                                    <li>Threaded comment system with nested replies</li>
                                    <li>
                                        Engagement metrics (likes, views, reply counts, comment
                                        counts)
                                    </li>
                                    <li>
                                        Sorting options (Recent, Popular, Most Liked, Most Viewed,
                                        Most Replied)
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
                            isExpanded={expandedVersions.has('1.2.0')}
                            onToggle={() => toggleVersion('1.2.0')}
                        >
                            <p className="text-gray-300 leading-relaxed mb-4">
                                Google&apos;s Gemini 2.5 Flash powers natural language search,
                                understanding queries like &quot;rainy day vibes&quot; or
                                &quot;mind-bending thrillers.&quot; The AI extracts genres,
                                cast/crew, and thematic concepts to generate optimized TMDB filters.
                            </p>

                            <div className="mb-4">
                                <h4 className="text-white font-semibold mb-3">
                                    Smart Search Features
                                </h4>
                                <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                    <li>
                                        Natural language query understanding (semantic concepts,
                                        vibes, themes)
                                    </li>
                                    <li>Voice input with live transcription (Web Speech API)</li>
                                    <li>
                                        Entity recognition with autocomplete (
                                        <code className="text-green-400 text-xs">@actors</code>,{' '}
                                        <code className="text-green-400 text-xs">#directors</code>)
                                    </li>
                                    <li>
                                        Auto-detection of media type preferences (movies, TV, or
                                        both)
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
                            isExpanded={expandedVersions.has('1.1.0')}
                            onToggle={() => toggleVersion('1.1.0')}
                        >
                            <p className="text-gray-300 leading-relaxed mb-4">
                                Three collection types serve different needs: Manual (hand-picked),
                                Genre-Based (auto-updating), and AI-Generated (natural language).
                                Daily cron jobs check TMDB for new releases, and public sharing
                                includes view analytics.
                            </p>

                            <div className="mb-4">
                                <h4 className="text-white font-semibold mb-3">
                                    Collection Features
                                </h4>
                                <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                    <li>
                                        Three types: Manual, TMDB Genre-Based, AI-Generated from
                                        queries
                                    </li>
                                    <li>
                                        Advanced filters (year range, rating, cast, director,
                                        popularity)
                                    </li>
                                    <li>Drag-and-drop content reordering</li>
                                    <li>Custom icons and colors for visual organization</li>
                                    <li>Display as row toggle for homepage visibility</li>
                                    <li>Public/private visibility controls</li>
                                    <li>
                                        Auto-update system via Vercel cron jobs (daily at 2 AM UTC)
                                    </li>
                                    <li>
                                        Visual indicators (&quot;Auto&quot; badge, &quot;+5
                                        new&quot; counter)
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
                            isExpanded={expandedVersions.has('1.0.0')}
                            onToggle={() => toggleVersion('1.0.0')}
                        >
                            <p className="text-gray-300 leading-relaxed mb-4">
                                NetTrailer launched with a comprehensive feature set built over 3
                                months. We chose Zustand (18 focused stores) over Redux for better
                                performance and maintainability. The Netflix-inspired design uses a
                                dark theme with responsive layouts.
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
                                        Child Safety Mode with PIN protection and server-side
                                        filtering
                                    </li>
                                    <li>In-app notifications with real-time Firestore listeners</li>
                                    <li>
                                        Interaction tracking powering personalized recommendations
                                    </li>
                                    <li>Watch history with automatic content tracking</li>
                                    <li>30+ API routes proxying TMDB</li>
                                    <li>Sentry error monitoring (client + server)</li>
                                </ul>
                            </div>

                            <p className="text-gray-300 leading-relaxed text-sm">
                                <strong className="text-white">Tech Stack:</strong> Next.js 16,
                                React 19, TypeScript 5.7, Zustand 5.0, Tailwind CSS 3.4, Firebase
                                11.0
                            </p>
                        </VersionRelease>

                        {/* Separator: Production vs Pre-Release */}
                        <div className="relative py-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-600"></div>
                            </div>
                            <div className="relative flex justify-center">
                                <span className="bg-gray-900 px-4 py-1 text-sm text-gray-400 rounded-full border border-gray-600">
                                    Pre-Release Versions
                                </span>
                            </div>
                        </div>

                        <VersionRelease
                            version="0.3.0"
                            date="October 25, 2024"
                            title="Beta - Search & UI Polish"
                            isExpanded={expandedVersions.has('0.3.0')}
                            onToggle={() => toggleVersion('0.3.0')}
                        >
                            <p className="text-gray-300 leading-relaxed mb-4">
                                Final beta release focused on perfecting the search experience and
                                polishing the UI before production launch. Added comprehensive
                                filtering, keyboard navigation, and performance optimizations.
                            </p>

                            <div className="mb-4">
                                <h4 className="text-white font-semibold mb-3">Beta Features</h4>
                                <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                    <li>
                                        Advanced search filters with clickable badges (genre, year,
                                        rating)
                                    </li>
                                    <li>Keyboard navigation (arrow keys, Enter, Escape)</li>
                                    <li>
                                        Progressive loading system targeting 30 movies with trailers
                                    </li>
                                    <li>Enhanced mobile UX with improved search animation</li>
                                    <li>User feedback for edge cases (least popular genres)</li>
                                    <li>Search performance optimizations for quick searches</li>
                                    <li>
                                        Husky pre-commit hooks with lint-staged for code quality
                                    </li>
                                    <li>
                                        Netflix-style hover effects with red glow and Watch button
                                    </li>
                                    <li>Optimized row spacing and thumbnail interactions</li>
                                </ul>
                            </div>

                            <p className="text-gray-300 leading-relaxed text-sm">
                                <strong className="text-white">Status:</strong> Feature-complete and
                                ready for v1.0.0 production release.
                            </p>
                        </VersionRelease>

                        <VersionRelease
                            version="0.2.0"
                            date="September 20, 2024"
                            title="Alpha - Authentication & Core Features"
                            isExpanded={expandedVersions.has('0.2.0')}
                            onToggle={() => toggleVersion('0.2.0')}
                        >
                            <p className="text-gray-300 leading-relaxed mb-4">
                                Alpha release introducing authentication, user accounts, and core
                                content management features. Migrated to Recoil for state management
                                and added comprehensive error handling.
                            </p>

                            <div className="mb-4">
                                <h4 className="text-white font-semibold mb-3">Alpha Features</h4>
                                <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                    <li>
                                        Firebase authentication (Google Sign-In, Email/Password)
                                    </li>
                                    <li>Guest mode with localStorage persistence</li>
                                    <li>Favorites system with Firebase integration</li>
                                    <li>Comprehensive error handling system</li>
                                    <li>Real-time search with debouncing (300ms)</li>
                                    <li>
                                        Enhanced search animation and clickable badges for filtering
                                    </li>
                                    <li>Redesigned login page with social auth UI</li>
                                    <li>Security fixes for critical vulnerabilities</li>
                                    <li>Testing infrastructure with Jest</li>
                                    <li>ESLint warnings eliminated</li>
                                    <li>API caching strategy</li>
                                    <li>Vercel Analytics integration</li>
                                    <li>Legal pages (Privacy, Terms)</li>
                                </ul>
                            </div>

                            <p className="text-gray-300 leading-relaxed text-sm">
                                <strong className="text-white">Migration:</strong> Switched from
                                basic state management to Recoil for scalable architecture.
                            </p>
                        </VersionRelease>

                        <VersionRelease
                            version="0.1.0"
                            date="September 1, 2024"
                            title="Prototype - Initial Setup"
                            isExpanded={expandedVersions.has('0.1.0')}
                            onToggle={() => toggleVersion('0.1.0')}
                        >
                            <p className="text-gray-300 leading-relaxed mb-4">
                                Initial prototype built with Next.js and TMDB API integration. Basic
                                content browsing and modal functionality.
                            </p>

                            <div className="mb-4">
                                <h4 className="text-white font-semibold mb-3">
                                    Prototype Features
                                </h4>
                                <ul className="space-y-2 text-gray-300 list-disc list-inside">
                                    <li>Project setup with Next.js (Create Next App template)</li>
                                    <li>TMDB API integration for movie and TV show data</li>
                                    <li>Basic content modal with video player</li>
                                    <li>Initial deployment configuration</li>
                                    <li>Trending movies and TV shows</li>
                                    <li>Basic search functionality</li>
                                    <li>Image optimization with Next.js Image</li>
                                    <li>Responsive layout foundation</li>
                                </ul>
                            </div>

                            <p className="text-gray-300 leading-relaxed text-sm">
                                <strong className="text-white">Stack:</strong> Next.js Pages Router,
                                React, TypeScript, TMDB API, Tailwind CSS
                            </p>
                        </VersionRelease>
                    </div>
                </div>
            </SubPageLayout>

            <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
            <TutorialModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} />
        </>
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
    isExpanded,
    onToggle,
    children,
}: {
    version: string
    date: string
    title: string
    badge?: string
    isInitial?: boolean
    isExpanded: boolean
    onToggle: () => void
    children: React.ReactNode
}) {
    const versionColor = isInitial
        ? 'text-blue-400 border-blue-500'
        : 'text-green-400 border-green-500'

    return (
        <div className="relative" id={`v${version}`}>
            {/* Clickable Header */}
            <button
                onClick={onToggle}
                className="w-full text-left group transition-all hover:bg-gray-800/20 rounded-lg p-4 -m-4"
                aria-expanded={isExpanded}
                aria-label={`${isExpanded ? 'Collapse' : 'Expand'} version ${version} - ${title}`}
            >
                <div className="flex items-center justify-between">
                    <div className="flex-1">
                        {/* Version Number Badge */}
                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className={`text-4xl font-bold font-mono ${versionColor.split(' ')[0]}`}
                            >
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
                        <h2 className="text-2xl md:text-3xl font-bold text-white">{title}</h2>
                    </div>

                    {/* Chevron Icon */}
                    <div className="ml-4 flex-shrink-0">
                        {isExpanded ? (
                            <ChevronUpIcon className="w-8 h-8 text-gray-400 group-hover:text-white transition-colors" />
                        ) : (
                            <ChevronDownIcon className="w-8 h-8 text-gray-400 group-hover:text-white transition-colors" />
                        )}
                    </div>
                </div>
            </button>

            {/* Collapsible Content */}
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded ? 'max-h-[5000px] opacity-100 mt-6' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700/50">
                    {children}
                </div>
            </div>
        </div>
    )
}
