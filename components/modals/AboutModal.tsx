import React, { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
    XMarkIcon,
    HeartIcon,
    StarIcon,
    PlayIcon,
    ShieldCheckIcon,
    CodeBracketIcon,
    CpuChipIcon,
    DevicePhoneMobileIcon,
    UserIcon,
    Cog6ToothIcon,
    DocumentTextIcon,
    ArrowTopRightOnSquareIcon,
    LockClosedIcon,
    ServerIcon,
    BeakerIcon,
    BoltIcon,
    RocketLaunchIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ClipboardDocumentListIcon,
    AcademicCapIcon,
    EyeSlashIcon,
    MagnifyingGlassIcon,
    SparklesIcon,
    ChatBubbleLeftRightIcon,
    BellIcon,
    ShareIcon,
    TrophyIcon,
    MicrophoneIcon,
} from '@heroicons/react/24/outline'
import { HandThumbUpIcon, RectangleStackIcon } from '@heroicons/react/24/solid'

interface AboutModalProps {
    isOpen: boolean
    onClose: () => void
    onStartTour?: () => void
    onOpenTutorial?: () => void
}

type TabId = 'tech' | 'features' | 'architecture' | 'security'

interface Tab {
    id: TabId
    title: string
    icon: React.ComponentType<{ className?: string }>
    itemCount: number
    blurb: string
}

const AboutModal: React.FC<AboutModalProps> = ({
    isOpen,
    onClose,
    onStartTour,
    onOpenTutorial,
}) => {
    const [activeTab, setActiveTab] = useState<TabId>('tech')
    const [highlightedIndex, setHighlightedIndex] = useState(0)
    const [isHovering, setIsHovering] = useState(false)
    const [animationPhase, setAnimationPhase] = useState<'idle' | 'exit' | 'enter'>('idle')
    const [isMobile, setIsMobile] = useState(false)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    // Check for mobile viewport
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640)
        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Tech stack data with specific package versions from package.json
    const techStack = [
        {
            name: 'TypeScript',
            desc: 'Type-safe development',
            icon: '/icons/typescript.svg',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/30',
            activeBorder: 'border-blue-400',
            activeGlow: 'shadow-[0_0_25px_rgba(59,130,246,0.5)]',
            version: '5.9.3',
            details: [
                'Strict mode enabled for maximum type safety',
                'Custom type guards for Content (Movie | TVShow) discrimination',
                'Comprehensive interface definitions in /types directory',
                'Generic utility types for API responses and state management',
            ],
        },
        {
            name: 'Next.js',
            desc: 'React framework',
            icon: '/icons/nextjs.svg',
            bg: 'bg-white/5',
            border: 'border-white/20',
            activeBorder: 'border-white/60',
            activeGlow: 'shadow-[0_0_25px_rgba(255,255,255,0.3)]',
            iconBg: 'bg-black border border-white/30',
            version: '16.0.1',
            details: [
                'App Router with React Server Components',
                'API routes for TMDB proxy and Gemini AI integration',
                'Image optimization with next/image for TMDB CDN',
                'Middleware for security headers (CSP, HSTS, X-Frame-Options)',
            ],
        },
        {
            name: 'React',
            desc: 'UI library',
            icon: '/icons/react.svg',
            bg: 'bg-sky-500/10',
            border: 'border-sky-500/30',
            activeBorder: 'border-sky-400',
            activeGlow: 'shadow-[0_0_25px_rgba(14,165,233,0.5)]',
            version: '19.2.0',
            details: [
                'React 19 with concurrent features',
                'Server Components for improved performance',
                'Hooks-based architecture throughout the app',
                'Strict mode for detecting potential issues',
            ],
        },
        {
            name: 'Tailwind CSS',
            desc: 'Utility-first styling',
            icon: '/icons/tailwind.svg',
            bg: 'bg-cyan-500/10',
            border: 'border-cyan-500/30',
            activeBorder: 'border-cyan-400',
            activeGlow: 'shadow-[0_0_25px_rgba(6,182,212,0.5)]',
            version: '3.4.17',
            details: [
                'Custom color palette with cinematic dark theme',
                'Responsive breakpoints for mobile-first design',
                'Custom animations (pulse, fadeIn, slide transitions)',
                'JIT mode for optimized production builds',
            ],
        },
        {
            name: 'Firebase',
            desc: 'Auth & database',
            icon: '/icons/firebase.png',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/30',
            activeBorder: 'border-orange-400',
            activeGlow: 'shadow-[0_0_25px_rgba(249,115,22,0.5)]',
            version: '12.2.1',
            details: [
                'Firebase Auth with Google & Email/Password providers',
                'Firestore for user data, rankings, threads, and polls',
                'Real-time listeners for notifications and live updates',
                'Comprehensive security rules with user isolation',
            ],
        },
        {
            name: 'Zustand',
            desc: 'State management',
            emoji: '🐻',
            bg: 'bg-amber-500/10',
            border: 'border-amber-500/30',
            activeBorder: 'border-amber-400',
            activeGlow: 'shadow-[0_0_25px_rgba(245,158,11,0.5)]',
            version: '5.0.8',
            details: [
                '18 focused stores (auth, session, UI, notifications, etc.)',
                'Storage adapters: Firebase for auth users, localStorage for guests',
                'Optimized selectors to prevent unnecessary re-renders',
                'Devtools integration for debugging state changes',
            ],
        },
    ]

    // Features data - user-focused and compelling
    const features = [
        {
            id: 'ai-search',
            icon: StarIcon,
            title: 'Search with AI',
            desc: 'Just describe what you want to watch in plain English',
            color: 'text-yellow-400',
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/20',
            activeBorder: 'border-yellow-400',
            activeGlow: 'shadow-[0_0_25px_rgba(250,204,21,0.5)]',
            details: [
                'Google Gemini 2.5 Flash integration for natural language query parsing',
                'Web Speech API voice input with live transcription feedback',
                'Semantic concept understanding ("rainy day vibes", "mind-bending thrillers")',
                'Save AI search results as custom collections',
                'Live preview showing result count as you type',
                'Debounced input with race condition handling for optimal performance',
            ],
        },
        {
            id: 'collections',
            icon: HeartIcon,
            title: 'Create Custom Collections',
            desc: 'Organize your watchlist exactly how you want',
            color: 'text-pink-400',
            bg: 'bg-pink-500/10',
            border: 'border-pink-500/20',
            activeBorder: 'border-pink-400',
            activeGlow: 'shadow-[0_0_25px_rgba(236,72,153,0.5)]',
            details: [
                'Drag-and-drop to reorder - build your perfect list visually',
                'Auto-updating collections that refresh daily with new content',
                'Let AI create collections from natural language descriptions',
                'Filter by year, rating, cast, director - get exactly what you want',
                'Share your collections with friends via public links',
                'Get notified when new content matches your collections',
            ],
        },
        {
            id: 'rankings',
            icon: TrophyIcon,
            title: 'Build & Share Rankings',
            desc: 'Create your definitive top 10 lists',
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20',
            activeBorder: 'border-purple-400',
            activeGlow: 'shadow-[0_0_25px_rgba(168,85,247,0.5)]',
            details: [
                'Drag-and-drop ranking builder with custom scores',
                'Make your rankings public or keep them private',
                'Get comments, likes, and engagement from the community',
                'Join discussion forums with polls and voting',
                'See real-time likes and view counts on your rankings',
                'Threaded conversations so you can debate with other users',
            ],
        },
        {
            id: 'discovery',
            icon: PlayIcon,
            title: 'Discover New Content',
            desc: 'Find trending movies and shows worth watching',
            color: 'text-red-400',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
            activeBorder: 'border-red-400',
            activeGlow: 'shadow-[0_0_25px_rgba(239,68,68,0.5)]',
            details: [
                'Browse trending, popular, and top-rated content',
                'Explore by genre - consistent experience for movies and TV',
                'Watch trailers without leaving the site',
                'See full cast, crew, and get similar recommendations',
            ],
        },
        {
            id: 'recommendations',
            icon: SparklesIcon,
            title: 'Content For You',
            desc: 'Recommendations that actually get you',
            color: 'text-green-400',
            bg: 'bg-green-500/10',
            border: 'border-green-500/20',
            activeBorder: 'border-green-400',
            activeGlow: 'shadow-[0_0_25px_rgba(34,197,94,0.5)]',
            details: [
                'Learns your taste from what you watch and like',
                'Based on your top 3 preferred genres from viewing history',
                "Automatically excludes content you've already seen",
                'Refreshes with new recommendations regularly',
                'Opt-out anytime if you prefer manual discovery',
                'Minimum 7.0 rating - only quality suggestions',
            ],
        },
        {
            id: 'safety',
            icon: ShieldCheckIcon,
            title: 'Family-Friendly & Personal',
            desc: 'Safe for kids, smart for you',
            color: 'text-cyan-400',
            bg: 'bg-cyan-500/10',
            border: 'border-cyan-500/20',
            activeBorder: 'border-cyan-400',
            activeGlow: 'shadow-[0_0_25px_rgba(6,182,212,0.5)]',
            details: [
                'PIN-protected child safety mode filters adult content automatically',
                'Get recommendations tailored to what you actually like',
                'Your viewing history stays private with automatic cleanup',
                'Export your collections and watch history anytime as CSV',
            ],
        },
    ]

    // Architecture data
    const architecture = [
        {
            icon: ServerIcon,
            title: 'API Proxy Architecture',
            text: 'Server-side TMDB integration with rate limiting',
            details: [
                '49 internal API routes proxy TMDB requests server-side',
                'In-memory cache store with smart invalidation strategy',
                'Respects TMDB rate limits (40 requests/second)',
                'Query parameter authentication for TMDB API v3 compatibility',
            ],
        },
        {
            icon: BoltIcon,
            title: 'Real-Time Sync System',
            text: 'Dual storage with Firestore listeners',
            details: [
                'FirebaseStorageAdapter for authenticated users with real-time sync',
                'LocalStorageAdapter for guest users (no cloud persistence)',
                'User ID validation prevents data mixing between users',
                'Firestore listeners deliver instant updates across devices',
            ],
        },
        {
            icon: CodeBracketIcon,
            title: 'Content Type System',
            text: 'Type-safe discriminated unions',
            details: [
                'BaseContent interface with Movie | TVShow discriminated unions',
                'Type guards (isMovie, isTVShow) for runtime type checking',
                'Utility functions for consistent property access across types',
                'Prevents runtime errors with compile-time type safety',
            ],
        },
        {
            icon: CpuChipIcon,
            title: 'Genre Unification System',
            text: 'Seamless genre mapping across media types',
            details: [
                'Unified genre IDs map to different TMDB IDs per media type',
                'Fantasy → Movies: 14 | TV: 10765 (Sci-Fi & Fantasy)',
                'Automatic deduplication when genres map to same TMDB ID',
                'Consistent user experience across movies and TV shows',
            ],
        },
        {
            icon: RocketLaunchIcon,
            title: 'Personalization Engine',
            text: 'Weighted interaction scoring',
            details: [
                '10 interaction types with different weights (+5 to -5)',
                'Top 3 preferred genres calculated from 90-day history',
                'Hybrid algorithm: genre preferences + TMDB similarity',
                'Auto-excludes seen content, minimum 7.0 rating threshold',
            ],
        },
        {
            icon: BellIcon,
            title: 'Trending Notification System',
            text: 'Snapshot comparison with daily updates',
            details: [
                'Daily cron job (2 AM UTC) compares trending snapshots',
                'Detects new entries in top 20 trending movies/TV shows',
                'Sends notifications for watchlist items newly trending',
                'Firestore listeners deliver instant notification updates',
            ],
        },
    ]

    // Security data
    const security = [
        {
            icon: ShieldCheckIcon,
            title: 'CSRF Protection',
            desc: 'Cross-site request forgery prevention',
            details: [
                'Origin/Referer header validation on all state-changing requests',
                'Protected methods: POST, PUT, DELETE, PATCH to /api/*',
                'CRON_SECRET authentication for scheduled jobs',
                'Timing-safe comparison prevents timing attacks',
            ],
        },
        {
            icon: LockClosedIcon,
            title: 'Token Verification',
            desc: 'Firebase ID token authentication',
            details: [
                'Server-side Firebase Admin SDK token validation',
                'Prevents header spoofing and unauthorized access',
                'Admin UID verification for privileged operations',
                'Session expiry handling with user-friendly messages',
            ],
        },
        {
            icon: CodeBracketIcon,
            title: 'Request Validation',
            desc: 'Size limits and content-type checks',
            details: [
                '1MB request body size limit (500KB for JSON)',
                'Content-Type validation for POST/PUT/PATCH requests',
                'Rejects oversized payloads (413 status)',
                'Protects against memory exhaustion attacks',
            ],
        },
        {
            icon: BellIcon,
            title: 'Security Monitoring',
            desc: 'Logging and error tracking',
            details: [
                'Request validation logging for security events',
                'Sentry integration tracks errors and anomalies',
                'CSRF attempt detection and logging',
                'Audit trail for admin and sensitive operations',
            ],
        },
        {
            icon: CodeBracketIcon,
            title: 'Input Sanitization & Headers',
            desc: 'XSS protection and secure headers',
            details: [
                'isomorphic-dompurify on all AI endpoints',
                'Content Security Policy prevents XSS attacks',
                'HSTS enforces HTTPS, X-Frame-Options stops clickjacking',
                'API keys never exposed to client (server-side only)',
            ],
        },
        {
            icon: UserIcon,
            title: 'Data Protection',
            desc: 'Firestore rules and child safety',
            details: [
                'User isolation prevents cross-user data access',
                'Field-level validation for all database writes',
                'bcrypt-encrypted PINs for child safety mode',
                'Server-side content filtering by ratings',
            ],
        },
    ]

    // Tab configuration with section blurbs
    const tabs: Tab[] = [
        {
            id: 'tech',
            title: 'Tech Stack',
            icon: CodeBracketIcon,
            itemCount: techStack.length,
            blurb: 'Built with a modern, production-ready stack featuring Next.js 16, React 19, and TypeScript for type-safe development. State management is handled by Zustand with 18 focused stores, while Firebase provides authentication and real-time data sync.',
        },
        {
            id: 'features',
            title: 'Features',
            icon: StarIcon,
            itemCount: features.length,
            blurb: 'NetTrailers showcases production-ready features that demonstrate full-stack development expertise. From AI-powered natural language search to real-time data synchronization, these features highlight advanced React patterns, API integrations, and scalable architecture design.',
        },
        {
            id: 'architecture',
            title: 'Architecture',
            icon: CpuChipIcon,
            itemCount: architecture.length,
            blurb: 'Designed with scalability and maintainability in mind. Uses a focused store pattern for state management, dual storage adapters for auth/guest users, comprehensive error monitoring with Sentry, and optimized API caching for performance.',
        },
        {
            id: 'security',
            title: 'Security',
            icon: ShieldCheckIcon,
            itemCount: security.length,
            blurb: 'Enterprise-grade security with Firebase security rules, XSS protection via input sanitization, security headers (CSP, HSTS), and PIN-protected child safety mode. All sensitive operations are validated server-side.',
        },
    ]

    // Get current tab's item count
    const getCurrentTabItemCount = useCallback(() => {
        const tab = tabs.find((t) => t.id === activeTab)
        return tab?.itemCount || 0
    }, [activeTab, tabs])

    // Get current tab's blurb
    const getCurrentTabBlurb = useCallback(() => {
        const tab = tabs.find((t) => t.id === activeTab)
        return tab?.blurb || ''
    }, [activeTab, tabs])

    // Auto-cycle through highlighted items (pauses on hover)
    useEffect(() => {
        if (!isOpen || isHovering) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
            return
        }

        const cycleInterval = 5000 // 5 seconds per highlight

        intervalRef.current = setInterval(() => {
            // Phase 1: Exit animation (slide out to left)
            setAnimationPhase('exit')

            setTimeout(() => {
                // Phase 2: Update content while hidden
                setHighlightedIndex((prev) => {
                    const itemCount = getCurrentTabItemCount()
                    const nextIndex = (prev + 1) % itemCount

                    // If we've cycled through all items, move to next tab
                    if (nextIndex === 0) {
                        setActiveTab((currentTab) => {
                            const currentTabIndex = tabs.findIndex((t) => t.id === currentTab)
                            const nextTabIndex = (currentTabIndex + 1) % tabs.length
                            return tabs[nextTabIndex].id
                        })
                    }

                    return nextIndex
                })

                // Phase 3: Enter animation (slide in from right)
                setAnimationPhase('enter')

                setTimeout(() => {
                    setAnimationPhase('idle')
                }, 200)
            }, 200)
        }, cycleInterval)

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
        }
    }, [isOpen, isHovering, getCurrentTabItemCount, tabs])

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
            setActiveTab('tech')
            setHighlightedIndex(0)
            setIsHovering(false)
            setAnimationPhase('idle')
        } else {
            document.body.style.overflow = 'unset'
        }

        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    // Handle tab change
    const handleTabChange = useCallback((tabId: TabId) => {
        setAnimationPhase('exit')
        setTimeout(() => {
            setActiveTab(tabId)
            setHighlightedIndex(0)
            setAnimationPhase('enter')
            setTimeout(() => setAnimationPhase('idle'), 200)
        }, 200)
    }, [])

    // Handle item click to highlight
    const handleItemClick = useCallback(
        (index: number) => {
            if (index === highlightedIndex) return
            setAnimationPhase('exit')
            setTimeout(() => {
                setHighlightedIndex(index)
                setAnimationPhase('enter')
                setTimeout(() => setAnimationPhase('idle'), 200)
            }, 200)
        },
        [highlightedIndex]
    )

    // Navigate to previous item (wraps to previous tab if at first item)
    const goToPrev = useCallback(() => {
        setAnimationPhase('exit')
        setTimeout(() => {
            if (highlightedIndex === 0) {
                // Go to previous tab's last item
                const currentTabIndex = tabs.findIndex((t) => t.id === activeTab)
                const prevTabIndex = (currentTabIndex - 1 + tabs.length) % tabs.length
                const prevTab = tabs[prevTabIndex]
                setActiveTab(prevTab.id)
                setHighlightedIndex(prevTab.itemCount - 1)
            } else {
                setHighlightedIndex((prev) => prev - 1)
            }
            setAnimationPhase('enter')
            setTimeout(() => setAnimationPhase('idle'), 200)
        }, 200)
    }, [highlightedIndex, activeTab, tabs])

    // Navigate to next item (wraps to next tab if at last item)
    const goToNext = useCallback(() => {
        const itemCount = getCurrentTabItemCount()
        setAnimationPhase('exit')
        setTimeout(() => {
            if (highlightedIndex === itemCount - 1) {
                // Go to next tab's first item
                const currentTabIndex = tabs.findIndex((t) => t.id === activeTab)
                const nextTabIndex = (currentTabIndex + 1) % tabs.length
                setActiveTab(tabs[nextTabIndex].id)
                setHighlightedIndex(0)
            } else {
                setHighlightedIndex((prev) => prev + 1)
            }
            setAnimationPhase('enter')
            setTimeout(() => setAnimationPhase('idle'), 200)
        }, 200)
    }, [getCurrentTabItemCount, highlightedIndex, activeTab, tabs])

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault()
                goToPrev()
            } else if (e.key === 'ArrowRight') {
                e.preventDefault()
                goToNext()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose, goToPrev, goToNext])

    // Render the focused/detailed view of current item
    const renderFocusedItem = () => {
        switch (activeTab) {
            case 'tech': {
                const tech = techStack[highlightedIndex]
                if (!tech) return null
                return (
                    <div
                        className={`rounded-xl ${tech.bg} border-2 ${tech.activeBorder} ${tech.activeGlow} p-4 sm:p-5 transition-all duration-300`}
                    >
                        <div className="flex items-start gap-4">
                            <div
                                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${tech.iconBg || 'bg-white/5'}`}
                            >
                                {tech.emoji ? (
                                    <span className="text-2xl sm:text-3xl">{tech.emoji}</span>
                                ) : (
                                    <Image
                                        src={tech.icon!}
                                        alt={tech.name}
                                        width={32}
                                        height={32}
                                        className="w-7 h-7 sm:w-8 sm:h-8"
                                    />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                    <h4 className="text-xl sm:text-2xl font-bold text-white">
                                        {tech.name}
                                    </h4>
                                    {tech.version && (
                                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white/10 text-gray-300">
                                            v{tech.version}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-400 mb-2 sm:hidden">{tech.desc}</p>
                                <ul className="space-y-1.5">
                                    {tech.details.slice(0, isMobile ? 2 : 4).map((detail, idx) => (
                                        <li
                                            key={idx}
                                            className="flex items-start gap-2 text-xs sm:text-sm text-gray-300"
                                        >
                                            <span className="text-red-400 mt-0.5">•</span>
                                            <span>{detail}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )
            }
            case 'features': {
                const feature = features[highlightedIndex]
                if (!feature) return null
                return (
                    <div
                        className={`rounded-xl ${feature.bg} border-2 ${feature.activeBorder} ${feature.activeGlow} p-4 sm:p-5 transition-all duration-300`}
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                                <feature.icon
                                    className={`w-7 h-7 sm:w-8 sm:h-8 ${feature.color}`}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="mb-2">
                                    <h4 className="text-xl sm:text-2xl font-bold text-white">
                                        {feature.title}
                                    </h4>
                                </div>
                                <p className="text-sm text-gray-400 mb-2 sm:hidden">
                                    {feature.desc}
                                </p>
                                <ul className="space-y-1.5">
                                    {feature.details
                                        .slice(0, isMobile ? 2 : 4)
                                        .map((detail, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-start gap-2 text-xs sm:text-sm text-gray-300"
                                            >
                                                <span className={feature.color}>•</span>
                                                <span>{detail}</span>
                                            </li>
                                        ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )
            }
            case 'architecture': {
                const arch = architecture[highlightedIndex]
                if (!arch) return null
                return (
                    <div className="rounded-xl bg-zinc-800/60 border-2 border-red-400 shadow-[0_0_25px_rgba(239,68,68,0.4)] p-4 sm:p-5 transition-all duration-300">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                <arch.icon className="w-7 h-7 sm:w-8 sm:h-8 text-red-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="mb-2">
                                    <h4 className="text-xl sm:text-2xl font-bold text-white">
                                        {arch.title}
                                    </h4>
                                </div>
                                <p className="text-sm text-gray-400 mb-2 sm:hidden">{arch.text}</p>
                                <ul className="space-y-1.5">
                                    {arch.details.slice(0, isMobile ? 2 : 4).map((detail, idx) => (
                                        <li
                                            key={idx}
                                            className="flex items-start gap-2 text-xs sm:text-sm text-gray-300"
                                        >
                                            <span className="text-red-400">•</span>
                                            <span>{detail}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )
            }
            case 'security': {
                const sec = security[highlightedIndex]
                if (!sec) return null
                return (
                    <div className="rounded-xl bg-emerald-500/10 border-2 border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.4)] p-4 sm:p-5 transition-all duration-300">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                <sec.icon className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="mb-2">
                                    <h4 className="text-xl sm:text-2xl font-bold text-white">
                                        {sec.title}
                                    </h4>
                                </div>
                                <p className="text-sm text-gray-400 mb-2 sm:hidden">{sec.desc}</p>
                                <ul className="space-y-1.5">
                                    {sec.details.slice(0, isMobile ? 2 : 4).map((detail, idx) => (
                                        <li
                                            key={idx}
                                            className="flex items-start gap-2 text-xs sm:text-sm text-gray-300"
                                        >
                                            <span className="text-emerald-400">•</span>
                                            <span>{detail}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )
            }
        }
    }

    // Render mini cards for all items in current tab
    const renderMiniCards = () => {
        // Common card class - smaller height, centered content
        const cardClass =
            'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300'

        switch (activeTab) {
            case 'tech':
                return techStack.map((tech, index) => {
                    const isActive = highlightedIndex === index
                    return (
                        <button
                            key={tech.name}
                            onClick={() => handleItemClick(index)}
                            className={`${cardClass} ${
                                isActive
                                    ? `${tech.bg} ${tech.activeBorder} ${tech.activeGlow}`
                                    : `bg-zinc-800/40 border-zinc-700/50 opacity-60 hover:opacity-90`
                            }`}
                        >
                            <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tech.iconBg || 'bg-white/5'}`}
                            >
                                {tech.emoji ? (
                                    <span className="text-lg">{tech.emoji}</span>
                                ) : (
                                    <Image
                                        src={tech.icon!}
                                        alt={tech.name}
                                        width={20}
                                        height={20}
                                        className="w-5 h-5"
                                    />
                                )}
                            </div>
                            <span className="text-xs sm:text-sm font-medium text-white truncate">
                                {tech.name}
                            </span>
                        </button>
                    )
                })
            case 'features':
                return features.map((feature, index) => {
                    const isActive = highlightedIndex === index
                    return (
                        <button
                            key={feature.id}
                            onClick={() => handleItemClick(index)}
                            className={`${cardClass} ${
                                isActive
                                    ? `${feature.bg} ${feature.activeBorder} ${feature.activeGlow}`
                                    : `bg-zinc-800/40 border-zinc-700/50 opacity-60 hover:opacity-90`
                            }`}
                        >
                            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                                <feature.icon className={`w-5 h-5 ${feature.color}`} />
                            </div>
                            <span className="text-xs sm:text-sm font-medium text-white truncate">
                                {feature.title}
                            </span>
                        </button>
                    )
                })
            case 'architecture':
                return architecture.map((arch, index) => {
                    const isActive = highlightedIndex === index
                    return (
                        <button
                            key={index}
                            onClick={() => handleItemClick(index)}
                            className={`${cardClass} ${
                                isActive
                                    ? 'bg-red-500/10 border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                                    : 'bg-zinc-800/40 border-zinc-700/50 opacity-60 hover:opacity-90'
                            }`}
                        >
                            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                <arch.icon className="w-5 h-5 text-red-400" />
                            </div>
                            <span className="text-xs sm:text-sm font-medium text-white truncate">
                                {arch.title}
                            </span>
                        </button>
                    )
                })
            case 'security':
                return security.map((sec, index) => {
                    const isActive = highlightedIndex === index
                    return (
                        <button
                            key={index}
                            onClick={() => handleItemClick(index)}
                            className={`${cardClass} ${
                                isActive
                                    ? 'bg-emerald-500/10 border-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]'
                                    : 'bg-zinc-800/40 border-zinc-700/50 opacity-60 hover:opacity-90'
                            }`}
                        >
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                <sec.icon className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-xs sm:text-sm font-medium text-white truncate">
                                {sec.title}
                            </span>
                        </button>
                    )
                })
        }
    }

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-modal flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="relative bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-black rounded-2xl max-w-2xl lg:max-w-3xl w-full border border-red-500/30 shadow-2xl shadow-red-500/10 overflow-hidden max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Animated background glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64 bg-gradient-radial from-red-500/10 via-transparent to-transparent" />
                    <div
                        className="absolute inset-0 bg-gradient-to-t from-red-900/5 via-transparent to-transparent animate-pulse"
                        style={{ animationDuration: '4s' }}
                    />
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-2 rounded-full bg-zinc-800/60 text-gray-400 hover:text-white hover:bg-zinc-700/80 transition-all duration-300 hover:scale-110"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>

                {/* About Section (Always Visible) */}
                <div className="relative z-10 p-6 border-b border-zinc-800/50 flex-shrink-0">
                    {/* Welcome Heading */}
                    <h1 className="text-2xl font-bold text-white mb-4 text-center">
                        Welcome to <span className="text-red-500">NetTrailers</span>
                    </h1>

                    <div className="flex items-start gap-4">
                        {/* Profile Photo */}
                        <div className="relative group flex-shrink-0">
                            <div className="absolute inset-0 bg-red-500/30 rounded-full blur-xl scale-110 group-hover:scale-125 transition-transform duration-500" />
                            <Image
                                src="/images/portrait-medium.jpg"
                                alt="Nathan's Portrait"
                                width={64}
                                height={64}
                                className="relative w-16 h-16 rounded-full object-cover border-2 border-red-500/50 group-hover:border-red-400 transition-colors duration-300"
                            />
                        </div>

                        {/* Intro */}
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold text-white mb-1">
                                Hi, I&apos;m Nathan 👋
                            </h2>
                            <p className="text-sm text-gray-300 leading-relaxed mb-2">
                                The future of content discovery isn&apos;t endless scrolling through
                                algorithmic feeds—it&apos;s giving people tools to curate their own
                                experience. Search by vibe instead of keywords. Build collections
                                that match exactly what you want. Hide what you&apos;re not
                                interested in so your feed gets better. Share your taste through
                                rankings and let others pull your recommendations into their
                                collections. AI should help you find and organize what you care
                                about, not decide for you.
                            </p>

                            <div className="border-t border-zinc-700/30 my-3" />

                            {/* Help Options */}
                            {(onStartTour || onOpenTutorial) && (
                                <p className="text-sm text-gray-400 leading-relaxed mb-2 flex flex-wrap items-center gap-1.5">
                                    <span>New to NetTrailers?</span>
                                    {onOpenTutorial && (
                                        <>
                                            <span>Check out the</span>
                                            <button
                                                onClick={() => {
                                                    onClose()
                                                    setTimeout(() => {
                                                        onOpenTutorial()
                                                    }, 300)
                                                }}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/30 rounded-full text-xs font-medium text-blue-300 hover:text-blue-200 border border-blue-500/40 hover:border-blue-400 transition-all"
                                            >
                                                <AcademicCapIcon className="w-3 h-3" />
                                                Tutorial
                                            </button>
                                        </>
                                    )}
                                    {onStartTour && (
                                        <>
                                            <span>{onOpenTutorial ? 'or take a' : 'Take a'}</span>
                                            <button
                                                onClick={() => {
                                                    onClose()
                                                    setTimeout(() => {
                                                        onStartTour()
                                                    }, 300)
                                                }}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-500/20 hover:bg-orange-500/30 rounded-full text-xs font-medium text-orange-300 hover:text-orange-200 border border-orange-500/40 hover:border-orange-400 transition-all"
                                            >
                                                <RocketLaunchIcon className="w-3 h-3" />
                                                Quick Tour
                                            </button>
                                        </>
                                    )}
                                </p>
                            )}

                            <p className="text-sm text-gray-400 leading-relaxed mb-3">
                                Check out my{' '}
                                <a
                                    href="https://n8sportfolio.vercel.app/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 rounded-full text-xs font-medium text-red-300 hover:text-red-200 border border-red-500/40 hover:border-red-400 transition-all"
                                >
                                    <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                                    Portfolio
                                </a>{' '}
                                for more projects, or connect with me on social media below!
                            </p>
                        </div>
                    </div>

                    {/* Social Links (icons only) */}
                    <div className="flex flex-wrap items-center justify-center gap-2.5 mt-3">
                        {[
                            {
                                href: 'https://github.com/n8watkins',
                                icon: '/icons/github.svg',
                                label: 'GitHub',
                            },
                            {
                                href: 'https://www.linkedin.com/in/n8watkins/',
                                icon: '/icons/linkedin.svg',
                                label: 'LinkedIn',
                            },
                            { href: 'https://x.com/n8watkins', icon: 'x', label: 'X' },
                        ].map((social) => (
                            <a
                                key={social.label}
                                href={social.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={social.label}
                                className="group w-11 h-11 rounded-full bg-zinc-800/60 hover:bg-zinc-700/80 transition-all duration-300 flex items-center justify-center border border-zinc-700/50 hover:border-red-500/50 hover:scale-110 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                            >
                                {social.icon === 'x' ? (
                                    <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                                        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                                    </svg>
                                ) : (
                                    <Image
                                        src={social.icon}
                                        alt={social.label}
                                        width={20}
                                        height={20}
                                        className="w-5 h-5"
                                    />
                                )}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="relative z-10 flex items-center justify-center gap-1.5 px-4 py-3 border-b border-zinc-800/50 flex-shrink-0">
                    {tabs.map((tab) => {
                        const isSecurityTab = tab.id === 'security'
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                className={`group flex items-center gap-2 px-5 py-2.5 text-base sm:text-lg font-bold rounded-full transition-all duration-300 ${
                                    isActive
                                        ? isSecurityTab
                                            ? 'bg-emerald-500/90 text-white shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                                            : 'bg-red-500/90 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                                        : 'bg-zinc-800/60 text-gray-400 hover:text-white hover:bg-zinc-700/80'
                                }`}
                            >
                                <tab.icon className="w-6 h-6" />
                                <span>{tab.title}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Content Area - pauses on hover */}
                <div
                    className="relative z-10 flex-1 overflow-y-auto p-5 space-y-4"
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                >
                    {/* Focused Item Display with Navigation */}
                    <div className="flex items-center gap-2">
                        {/* Left Arrow */}
                        <button
                            onClick={goToPrev}
                            className="flex-shrink-0 p-2 rounded-full bg-zinc-800/60 text-gray-400 hover:text-white hover:bg-zinc-700/80 transition-all duration-300 hover:scale-110"
                            aria-label="Previous item"
                        >
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>

                        {/* Focused Item */}
                        <div
                            className={`flex-1 transition-all duration-300 ${
                                animationPhase === 'exit'
                                    ? 'opacity-0 -translate-x-8'
                                    : animationPhase === 'enter'
                                      ? 'opacity-0 translate-x-8'
                                      : 'opacity-100 translate-x-0'
                            }`}
                        >
                            {renderFocusedItem()}
                        </div>

                        {/* Right Arrow */}
                        <button
                            onClick={goToNext}
                            className="flex-shrink-0 p-2 rounded-full bg-zinc-800/60 text-gray-400 hover:text-white hover:bg-zinc-700/80 transition-all duration-300 hover:scale-110"
                            aria-label="Next item"
                        >
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Mini Cards Grid */}
                    <div
                        className={`grid gap-2 ${
                            activeTab === 'security' ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'
                        }`}
                    >
                        {renderMiniCards()}
                    </div>
                </div>

                {/* Footer */}
                <div className="relative z-10 px-5 py-3 border-t border-zinc-800/50 flex-shrink-0 space-y-2.5">
                    {/* Quick Links Intro */}
                    <p className="text-xs text-gray-500 text-center">
                        Learn more about this project&apos;s development and security practices
                    </p>

                    {/* Quick Links */}
                    <div className="flex flex-wrap gap-2 justify-center">
                        <Link
                            href="/security"
                            onClick={onClose}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-800/60 text-gray-300 border border-zinc-700/50 hover:border-red-500/50 hover:text-red-400 transition-all duration-300"
                        >
                            <ShieldCheckIcon className="w-3.5 h-3.5" />
                            Security
                        </Link>
                        <Link
                            href="/changelog"
                            onClick={onClose}
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-800/60 text-gray-300 border border-zinc-700/50 hover:border-red-500/50 hover:text-red-400 transition-all duration-300"
                        >
                            <ClipboardDocumentListIcon className="w-3.5 h-3.5" />
                            Changelog
                        </Link>
                        <a
                            href="https://github.com/n8watkins/net_trailer/issues"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-800/60 text-gray-300 border border-zinc-700/50 hover:border-red-500/50 hover:text-red-400 transition-all duration-300"
                        >
                            <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                            GitHub Issues
                        </a>
                    </div>

                    <div className="flex items-center justify-between">
                        {/* Footer text */}
                        <p className="text-xs text-gray-500">
                            Built with <span className="text-red-400">❤️</span> as a portfolio
                            project
                        </p>

                        {/* Keyboard hints */}
                        <div className="hidden sm:flex items-center gap-3 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-gray-400 text-[10px]">
                                    ←/→
                                </kbd>
                                <span className="text-gray-500">navigate</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-gray-400 text-[10px]">
                                    ESC
                                </kbd>
                                <span className="text-gray-500">close</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AboutModal
