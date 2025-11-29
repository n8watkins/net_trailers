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
} from '@heroicons/react/24/outline'

interface AboutModalProps {
    isOpen: boolean
    onClose: () => void
}

type TabId = 'tech' | 'features' | 'architecture' | 'security'

interface Tab {
    id: TabId
    title: string
    icon: React.ComponentType<{ className?: string }>
    itemCount: number
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<TabId>('tech')
    const [highlightedIndex, setHighlightedIndex] = useState(0)
    const [isHovering, setIsHovering] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
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

    // Features data
    const features = [
        {
            id: 'discovery',
            icon: PlayIcon,
            title: 'Movies & TV Shows Discovery',
            desc: 'Browse trending content, genres, and watch trailers',
            color: 'text-red-400',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
            activeBorder: 'border-red-400',
            activeGlow: 'shadow-[0_0_25px_rgba(239,68,68,0.5)]',
            details: [
                'Trending, popular, and top-rated content rows',
                'Genre-based browsing with unified genre system',
                'YouTube trailer integration with ReactPlayer',
                'Content modal with full details and recommendations',
            ],
        },
        {
            id: 'collections',
            icon: HeartIcon,
            title: 'Custom Watchlists & Likes',
            desc: 'Create unlimited lists, like content, organize favorites',
            color: 'text-pink-400',
            bg: 'bg-pink-500/10',
            border: 'border-pink-500/20',
            activeBorder: 'border-pink-400',
            activeGlow: 'shadow-[0_0_25px_rgba(236,72,153,0.5)]',
            details: [
                '3 collection types: Manual, TMDB Genre-Based, AI-Generated',
                'Auto-updating collections via daily cron job (2 AM UTC)',
                'Drag-and-drop reordering with visual feedback',
                'Shareable collection links with public view pages',
            ],
        },
        {
            id: 'search',
            icon: StarIcon,
            title: 'Advanced Search & Filters',
            desc: 'Real-time search with genre, year, and rating filters',
            color: 'text-yellow-400',
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/20',
            activeBorder: 'border-yellow-400',
            activeGlow: 'shadow-[0_0_25px_rgba(250,204,21,0.5)]',
            details: [
                '300ms debounced search with race condition handling',
                'AI Smart Search powered by Google Gemini 2.5 Flash',
                'Voice input with Web Speech API transcription',
                'URL synchronization for shareable search results',
            ],
        },
        {
            id: 'responsive',
            icon: DevicePhoneMobileIcon,
            title: 'Responsive Design',
            desc: 'Seamless experience across desktop, tablet, and mobile',
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
            activeBorder: 'border-blue-400',
            activeGlow: 'shadow-[0_0_25px_rgba(59,130,246,0.5)]',
            details: [
                'Mobile-first design with Tailwind breakpoints',
                'Touch-friendly interactions and gestures',
                'Adaptive layouts for content grids and modals',
                'Optimized images with responsive srcset',
            ],
        },
        {
            id: 'auth',
            icon: UserIcon,
            title: 'Guest Mode & Authentication',
            desc: 'Try without signing up or sync with cloud storage',
            color: 'text-green-400',
            bg: 'bg-green-500/10',
            border: 'border-green-500/20',
            activeBorder: 'border-green-400',
            activeGlow: 'shadow-[0_0_25px_rgba(34,197,94,0.5)]',
            details: [
                'Guest mode with localStorage persistence',
                'Google OAuth and Email/Password authentication',
                'Seamless data migration from guest to auth user',
                'Session management with auto-refresh tokens',
            ],
        },
        {
            id: 'smart',
            icon: Cog6ToothIcon,
            title: 'Smart Features',
            desc: 'Keyboard shortcuts, child safety, CSV export',
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20',
            activeBorder: 'border-purple-400',
            activeGlow: 'shadow-[0_0_25px_rgba(168,85,247,0.5)]',
            details: [
                'PIN-protected child safety mode with content filtering',
                'Keyboard navigation throughout the app',
                'CSV export for collections and watch history',
                'Personalized recommendations based on interactions',
            ],
        },
    ]

    // Architecture data
    const architecture = [
        {
            icon: CpuChipIcon,
            title: 'Zustand State Management',
            text: '18 focused stores for optimal performance',
            details: [
                'Migrated from monolithic "god store" to focused stores',
                'Store factory pattern in createUserStore.ts',
                'Direct store usage without provider wrappers',
                'Type-safe selectors for optimal re-render performance',
            ],
        },
        {
            icon: ServerIcon,
            title: 'Multi-Storage Architecture',
            text: 'Firestore for auth, localStorage for guests',
            details: [
                'FirebaseStorageAdapter for authenticated users',
                'LocalStorageAdapter for guest users (no cloud sync)',
                'User ID validation before all state updates',
                '5-second timeout on Firebase operations',
            ],
        },
        {
            icon: BeakerIcon,
            title: 'Comprehensive Testing',
            text: 'Jest suite with React Testing Library',
            details: [
                'Unit tests for utility functions and hooks',
                'Integration tests for API routes',
                'Mock TMDB and Gemini responses for consistency',
                'Coverage reporting with npm run test:coverage',
            ],
        },
        {
            icon: BoltIcon,
            title: 'Error Monitoring',
            text: 'Sentry integration with GA4 analytics',
            details: [
                'Server-side Sentry via instrumentation.ts',
                'Client-side error boundary with Sentry capture',
                'Google Analytics 4 for user behavior tracking',
                'Privacy-focused error filtering',
            ],
        },
        {
            icon: RocketLaunchIcon,
            title: 'Advanced Search',
            text: 'Debouncing, race condition handling, URL sync',
            details: [
                'Custom useSearch hook for search logic',
                '300ms debounce with 2+ character minimum',
                'Shallow routing for URL state preservation',
                'Proper cleanup to prevent stale results',
            ],
        },
        {
            icon: Cog6ToothIcon,
            title: 'Custom Caching',
            text: 'API optimization for fast performance',
            details: [
                'In-memory cache store for API responses',
                '6-hour cache for recommendations',
                'Smart cache invalidation on user actions',
                'Respects TMDB rate limits (40 req/sec)',
            ],
        },
    ]

    // Security data
    const security = [
        {
            icon: ShieldCheckIcon,
            title: 'Firebase Security Rules',
            desc: 'Comprehensive Firestore access controls',
            details: [
                'User isolation prevents cross-user data access',
                'Field-level validation for all writes',
                'Rate limiting on sensitive operations',
                'Secure authentication state management',
            ],
        },
        {
            icon: LockClosedIcon,
            title: 'Input Sanitization',
            desc: 'XSS protection on all API routes',
            details: [
                'isomorphic-dompurify on all Gemini endpoints',
                'Input validation before database writes',
                'Escaped output in all rendered content',
                'Protection against injection attacks',
            ],
        },
        {
            icon: CodeBracketIcon,
            title: 'Security Headers',
            desc: 'CSP, HSTS, X-Frame-Options',
            details: [
                'Content Security Policy prevents XSS',
                'HSTS enforces HTTPS connections',
                'X-Frame-Options prevents clickjacking',
                'Configured via Next.js middleware',
            ],
        },
        {
            icon: UserIcon,
            title: 'Child Safety Mode',
            desc: 'PIN-protected content filtering',
            details: [
                'bcrypt-encrypted PIN storage',
                'Session-based PIN verification',
                'Content filtering by MPAA/TV ratings',
                'Server-side enforcement on all routes',
            ],
        },
    ]

    // Tab configuration
    const tabs: Tab[] = [
        { id: 'tech', title: 'Tech Stack', icon: CodeBracketIcon, itemCount: techStack.length },
        { id: 'features', title: 'Features', icon: StarIcon, itemCount: features.length },
        {
            id: 'architecture',
            title: 'Architecture',
            icon: CpuChipIcon,
            itemCount: architecture.length,
        },
        { id: 'security', title: 'Security', icon: ShieldCheckIcon, itemCount: security.length },
    ]

    // Get current tab's item count
    const getCurrentTabItemCount = useCallback(() => {
        const tab = tabs.find((t) => t.id === activeTab)
        return tab?.itemCount || 0
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
            setIsAnimating(true)
            setTimeout(() => {
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
                setTimeout(() => setIsAnimating(false), 200)
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
            setIsAnimating(false)
        } else {
            document.body.style.overflow = 'unset'
        }

        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    // Handle tab change
    const handleTabChange = useCallback((tabId: TabId) => {
        setIsAnimating(true)
        setTimeout(() => {
            setActiveTab(tabId)
            setHighlightedIndex(0)
            setTimeout(() => setIsAnimating(false), 200)
        }, 200)
    }, [])

    // Handle item click to highlight
    const handleItemClick = useCallback(
        (index: number) => {
            if (index === highlightedIndex) return
            setIsAnimating(true)
            setTimeout(() => {
                setHighlightedIndex(index)
                setTimeout(() => setIsAnimating(false), 200)
            }, 200)
        },
        [highlightedIndex]
    )

    // Navigate to previous item (wraps to previous tab if at first item)
    const goToPrev = useCallback(() => {
        setIsAnimating(true)
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
            setTimeout(() => setIsAnimating(false), 200)
        }, 200)
    }, [highlightedIndex, activeTab, tabs])

    // Navigate to next item (wraps to next tab if at last item)
    const goToNext = useCallback(() => {
        const itemCount = getCurrentTabItemCount()
        setIsAnimating(true)
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
            setTimeout(() => setIsAnimating(false), 200)
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
                                    <h4 className="text-lg sm:text-xl font-bold text-white">
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
                                <h4 className="text-lg sm:text-xl font-bold text-white mb-2">
                                    {feature.title}
                                </h4>
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
                                <h4 className="text-lg sm:text-xl font-bold text-white mb-2">
                                    {arch.title}
                                </h4>
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
                                <h4 className="text-lg sm:text-xl font-bold text-white mb-2">
                                    {sec.title}
                                </h4>
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
        // Common card height class for consistency
        const cardClass =
            'flex items-start gap-3 px-4 py-3 rounded-xl border transition-all duration-300 h-[76px]'

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
                                className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${tech.iconBg || 'bg-white/5'}`}
                            >
                                {tech.emoji ? (
                                    <span className="text-xl">{tech.emoji}</span>
                                ) : (
                                    <Image
                                        src={tech.icon!}
                                        alt={tech.name}
                                        width={24}
                                        height={24}
                                        className="w-6 h-6"
                                    />
                                )}
                            </div>
                            <div className="flex flex-col items-start min-w-0">
                                <span className="text-base font-semibold text-white">
                                    {tech.name}
                                </span>
                                <span className="text-xs text-gray-400 truncate w-full">
                                    {tech.desc}
                                </span>
                            </div>
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
                            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                                <feature.icon className={`w-6 h-6 ${feature.color}`} />
                            </div>
                            <div className="flex flex-col items-start min-w-0">
                                <span className="text-base font-semibold text-white">
                                    {feature.title.split(' ')[0]}
                                </span>
                                <span className="text-xs text-gray-400 truncate w-full">
                                    {feature.desc}
                                </span>
                            </div>
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
                            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                                <arch.icon className="w-6 h-6 text-red-400" />
                            </div>
                            <div className="flex flex-col items-start min-w-0">
                                <span className="text-base font-semibold text-white">
                                    {arch.title.split(' ')[0]}
                                </span>
                                <span className="text-xs text-gray-400 truncate w-full">
                                    {arch.text}
                                </span>
                            </div>
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
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                                <sec.icon className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div className="flex flex-col items-start min-w-0">
                                <span className="text-base font-semibold text-white">
                                    {sec.title.split(' ')[0]}
                                </span>
                                <span className="text-xs text-gray-400 truncate w-full">
                                    {sec.desc}
                                </span>
                            </div>
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
                            <p className="text-sm text-gray-300 leading-relaxed mb-3">
                                NetTrailers is a portfolio project designed to showcase modern web
                                development practices with a real-world application. It highlights
                                my skills in full-stack development, API integration, and user
                                experience design.
                            </p>

                            {/* Social Links */}
                            <div className="flex gap-2 mb-3">
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
                                        aria-label={`Nathan's ${social.label}`}
                                        className="group w-8 h-8 rounded-full bg-zinc-800/60 hover:bg-zinc-700/80 transition-all duration-300 flex items-center justify-center border border-zinc-700/50 hover:border-red-500/50 hover:scale-110 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                                    >
                                        {social.icon === 'x' ? (
                                            <svg
                                                className="w-3.5 h-3.5 fill-white"
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                                            </svg>
                                        ) : (
                                            <Image
                                                src={social.icon}
                                                alt={social.label}
                                                width={14}
                                                height={14}
                                                className="w-3.5 h-3.5"
                                            />
                                        )}
                                    </a>
                                ))}
                            </div>

                            {/* Quick Links */}
                            <div className="flex flex-wrap gap-2">
                                <Link
                                    href="/security"
                                    onClick={onClose}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-800/60 text-gray-300 border border-zinc-700/50 hover:border-red-500/50 hover:text-red-400 transition-all duration-300"
                                >
                                    <DocumentTextIcon className="w-3.5 h-3.5" />
                                    Security
                                </Link>
                                <Link
                                    href="/changelog"
                                    onClick={onClose}
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-800/60 text-gray-300 border border-zinc-700/50 hover:border-red-500/50 hover:text-red-400 transition-all duration-300"
                                >
                                    <DocumentTextIcon className="w-3.5 h-3.5" />
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
                                <a
                                    href="https://n8sportfolio.vercel.app/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-zinc-800/60 text-gray-300 border border-zinc-700/50 hover:border-red-500/50 hover:text-red-400 transition-all duration-300"
                                >
                                    <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                    Portfolio
                                </a>
                            </div>
                        </div>
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
                                className={`group flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-300 ${
                                    isActive
                                        ? isSecurityTab
                                            ? 'bg-emerald-500/90 text-white shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                                            : 'bg-red-500/90 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                                        : 'bg-zinc-800/60 text-gray-400 hover:text-white hover:bg-zinc-700/80'
                                }`}
                            >
                                <tab.icon className="w-5 h-5" />
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
                                isAnimating
                                    ? 'opacity-0 translate-y-2'
                                    : 'opacity-100 translate-y-0'
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
                <div className="relative z-10 px-5 py-2.5 border-t border-zinc-800/50 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        {/* Progress indicator */}
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="font-medium">
                                {highlightedIndex + 1}/{getCurrentTabItemCount()}
                            </span>
                            {isHovering && (
                                <span className="text-yellow-500 text-[10px] font-medium">
                                    PAUSED
                                </span>
                            )}
                        </div>

                        {/* Footer text */}
                        <p className="text-xs text-gray-500">
                            Built with <span className="text-red-400">❤️</span> as a portfolio
                            project
                        </p>

                        {/* Keyboard hint */}
                        <div className="hidden sm:flex items-center gap-1 text-xs text-gray-600">
                            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-gray-400 text-[10px]">
                                ←/→
                            </kbd>
                            <span className="text-gray-500">to navigate</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AboutModal
