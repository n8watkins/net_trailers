import React, { useEffect, useState, useCallback, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
    XMarkIcon,
    HeartIcon,
    StarIcon,
    PlayIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ShieldCheckIcon,
    CodeBracketIcon,
    SparklesIcon,
    RocketLaunchIcon,
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
    ChevronDownIcon,
} from '@heroicons/react/24/outline'

interface AboutModalProps {
    isOpen: boolean
    onClose: () => void
}

interface CarouselSlide {
    id: string
    title: string
    icon: React.ReactNode
    content: React.ReactNode
}

interface TechItem {
    name: string
    desc: string
    icon?: string
    emoji?: string
    bg: string
    border: string
    hoverBorder: string
    glow: string
    iconBg?: string
    version?: string
    details: string[]
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    const [currentSlide, setCurrentSlide] = useState(0)
    const [isAnimating, setIsAnimating] = useState(false)
    const [direction, setDirection] = useState<'left' | 'right'>('right')
    const [expandedTech, setExpandedTech] = useState<string | null>(null)
    const [expandedFeature, setExpandedFeature] = useState<string | null>(null)
    const [expandedArch, setExpandedArch] = useState<number | null>(null)

    // Define slides first so we can reference slides.length in navigation functions
    const slides: CarouselSlide[] = useMemo(
        () => [
            {
                id: 'welcome',
                title: 'Welcome',
                icon: <SparklesIcon className="w-4 h-4" />,
                content: null,
            },
            {
                id: 'tech',
                title: 'Tech Stack',
                icon: <CodeBracketIcon className="w-4 h-4" />,
                content: null,
            },
            {
                id: 'features',
                title: 'Features',
                icon: <StarIcon className="w-4 h-4" />,
                content: null,
            },
            {
                id: 'architecture',
                title: 'Architecture',
                icon: <CpuChipIcon className="w-4 h-4" />,
                content: null,
            },
            {
                id: 'security',
                title: 'Security & Links',
                icon: <ShieldCheckIcon className="w-4 h-4" />,
                content: null,
            },
        ],
        []
    )

    const totalSlides = slides.length

    // Reset expanded states when changing slides
    useEffect(() => {
        setExpandedTech(null)
        setExpandedFeature(null)
        setExpandedArch(null)
    }, [currentSlide])

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
            setCurrentSlide(0)
            setExpandedTech(null)
            setExpandedFeature(null)
            setExpandedArch(null)
        } else {
            document.body.style.overflow = 'unset'
        }

        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    const goToSlide = useCallback(
        (index: number) => {
            if (isAnimating || index === currentSlide) return
            setDirection(index > currentSlide ? 'right' : 'left')
            setIsAnimating(true)
            setCurrentSlide(index)
            setTimeout(() => setIsAnimating(false), 300)
        },
        [currentSlide, isAnimating]
    )

    const goToNextSlide = useCallback(() => {
        if (isAnimating) return
        setDirection('right')
        setIsAnimating(true)
        setCurrentSlide((prev) => (prev + 1) % totalSlides)
        setTimeout(() => setIsAnimating(false), 300)
    }, [isAnimating, totalSlides])

    const goToPrevSlide = useCallback(() => {
        if (isAnimating) return
        setDirection('left')
        setIsAnimating(true)
        setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides)
        setTimeout(() => setIsAnimating(false), 300)
    }, [isAnimating, totalSlides])

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                goToPrevSlide()
            } else if (e.key === 'ArrowRight') {
                goToNextSlide()
            } else if (e.key === 'Escape') {
                onClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, goToNextSlide, goToPrevSlide, onClose])

    // Tech stack data with detailed information
    const techStack: TechItem[] = [
        {
            name: 'TypeScript',
            desc: 'Type-safe development',
            icon: '/icons/typescript.svg',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/30',
            hoverBorder: 'hover:border-blue-400',
            glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]',
            version: '5.x',
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
            hoverBorder: 'hover:border-white/50',
            glow: 'hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]',
            iconBg: 'bg-black border border-white/30',
            version: '15.x (App Router)',
            details: [
                'App Router with React Server Components',
                'API routes for TMDB proxy and Gemini AI integration',
                'Image optimization with next/image for TMDB CDN',
                'Middleware for security headers (CSP, HSTS, X-Frame-Options)',
            ],
        },
        {
            name: 'Tailwind CSS',
            desc: 'Utility-first styling',
            icon: '/icons/tailwind.svg',
            bg: 'bg-cyan-500/10',
            border: 'border-cyan-500/30',
            hoverBorder: 'hover:border-cyan-400',
            glow: 'hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]',
            version: '3.x',
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
            hoverBorder: 'hover:border-orange-400',
            glow: 'hover:shadow-[0_0_20px_rgba(249,115,22,0.3)]',
            version: '10.x',
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
            hoverBorder: 'hover:border-amber-400',
            glow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]',
            version: '4.x',
            details: [
                '18 focused stores (auth, session, UI, notifications, etc.)',
                'Storage adapters: Firebase for auth users, localStorage for guests',
                'Optimized selectors to prevent unnecessary re-renders',
                'Devtools integration for debugging state changes',
            ],
        },
        {
            name: 'TMDB API',
            desc: 'Movie database',
            emoji: '🎬',
            bg: 'bg-green-500/10',
            border: 'border-green-500/30',
            hoverBorder: 'hover:border-green-400',
            glow: 'hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]',
            version: 'v3',
            details: [
                '49+ internal API routes proxying TMDB calls',
                'Custom caching layer for performance optimization',
                'Rate limiting respect (40 requests/second)',
                'Unified genre system mapping TMDB IDs to app genres',
            ],
        },
    ]

    // Features data with detailed information
    const features = [
        {
            id: 'discovery',
            icon: PlayIcon,
            title: 'Movies & TV Shows Discovery',
            desc: 'Browse trending content, genres, and watch trailers',
            color: 'text-red-400',
            bg: 'bg-red-500/10',
            border: 'border-red-500/20',
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
            details: [
                'PIN-protected child safety mode with content filtering',
                'Keyboard navigation throughout the app',
                'CSV export for collections and watch history',
                'Personalized recommendations based on interactions',
            ],
        },
    ]

    // Architecture data with detailed information
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

    // Slide content components
    const WelcomeSlide = (
        <div className="space-y-5">
            {/* Profile Section */}
            <div className="flex items-center gap-4">
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
                <h3 className="text-white text-xl font-bold">Hi all, 👋</h3>
            </div>

            {/* Introduction Text */}
            <div className="space-y-4 text-gray-300 text-sm leading-relaxed">
                <p>
                    I&apos;m Nathan, and NetTrailers is a Portfolio project designed to showcase
                    modern web dev practices with a real-world application. It highlights my skills
                    in full-stack development, API integration, and user experience design. I hope
                    you enjoy NetTrailers and if you&apos;d like to explore further:
                </p>

                <ul className="space-y-2 ml-1">
                    <li className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <span>
                            View the{' '}
                            <Link
                                href="/security"
                                className="text-red-400 hover:text-red-300 underline underline-offset-2"
                                onClick={onClose}
                            >
                                Security page
                            </Link>{' '}
                            to see all security measures implemented.
                        </span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <span>
                            Check the{' '}
                            <Link
                                href="/changelog"
                                className="text-red-400 hover:text-red-300 underline underline-offset-2"
                                onClick={onClose}
                            >
                                Changelog
                            </Link>{' '}
                            for version history and updates.
                        </span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <span>
                            Share feedback or report issues on{' '}
                            <a
                                href="https://github.com/n8watkins/net_trailer/issues"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-red-400 hover:text-red-300 underline underline-offset-2"
                            >
                                GitHub Issues
                            </a>
                            .
                        </span>
                    </li>
                    <li className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <span>
                            Check out my{' '}
                            <a
                                href="https://n8sportfolio.vercel.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-red-400 hover:text-red-300 underline underline-offset-2"
                            >
                                Portfolio page
                            </a>{' '}
                            for more projects.
                        </span>
                    </li>
                </ul>
            </div>

            {/* Social Links with hover effects */}
            <div className="flex items-center justify-center gap-4 pt-2">
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
                        className="group relative w-11 h-11 rounded-full bg-zinc-800/60 hover:bg-zinc-700/80 transition-all duration-300 flex items-center justify-center border border-zinc-700/50 hover:border-red-500/50 hover:scale-110 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                    >
                        {social.icon === 'x' ? (
                            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
                                <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                            </svg>
                        ) : (
                            <Image
                                src={social.icon}
                                alt={social.label}
                                width={22}
                                height={22}
                                className="w-5.5 h-5.5"
                            />
                        )}
                    </a>
                ))}
            </div>
        </div>
    )

    const TechStackSlide = (
        <div className="space-y-4">
            <p className="text-gray-400 text-sm text-center">
                Built with modern technologies — click any item for details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {techStack.map((tech) => {
                    const isExpanded = expandedTech === tech.name
                    return (
                        <div
                            key={tech.name}
                            className={`group relative rounded-xl ${tech.bg} border ${tech.border} ${!isExpanded ? tech.hoverBorder : ''} ${!isExpanded ? tech.glow : ''} transition-all duration-300 cursor-pointer overflow-hidden ${isExpanded ? 'ring-1 ring-white/20' : ''}`}
                            onClick={() => setExpandedTech(isExpanded ? null : tech.name)}
                        >
                            {/* Main content */}
                            <div className="p-3 flex items-center gap-3">
                                <div
                                    className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${tech.iconBg || 'bg-transparent'}`}
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
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-semibold text-white">
                                            {tech.name}
                                        </p>
                                        {tech.version && (
                                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-white/10 text-gray-300">
                                                {tech.version}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-400">{tech.desc}</p>
                                </div>
                                <ChevronDownIcon
                                    className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                />
                            </div>

                            {/* Expandable details */}
                            <div
                                className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}
                            >
                                <div className="px-3 pb-3 pt-1 border-t border-white/10">
                                    <ul className="space-y-1.5">
                                        {tech.details.map((detail, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-start gap-2 text-xs text-gray-300"
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
                })}
            </div>
        </div>
    )

    const FeaturesSlide = (
        <div className="space-y-4">
            <p className="text-gray-400 text-sm text-center">
                Comprehensive features — click any item for details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {features.map((feature) => {
                    const isExpanded = expandedFeature === feature.id
                    return (
                        <div
                            key={feature.id}
                            className={`group rounded-xl ${feature.bg} border ${feature.border} transition-all duration-300 cursor-pointer overflow-hidden ${isExpanded ? 'ring-1 ring-white/20' : 'hover:border-opacity-60'}`}
                            onClick={() => setExpandedFeature(isExpanded ? null : feature.id)}
                        >
                            {/* Main content */}
                            <div className="p-3 flex items-start gap-3">
                                <feature.icon
                                    className={`w-5 h-5 ${feature.color} mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white">
                                        {feature.title}
                                    </p>
                                    <p className="text-xs text-gray-400">{feature.desc}</p>
                                </div>
                                <ChevronDownIcon
                                    className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                />
                            </div>

                            {/* Expandable details */}
                            <div
                                className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}
                            >
                                <div className="px-3 pb-3 pt-1 border-t border-white/10">
                                    <ul className="space-y-1.5">
                                        {feature.details.map((detail, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-start gap-2 text-xs text-gray-300"
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
                })}
            </div>
        </div>
    )

    const ArchitectureSlide = (
        <div className="space-y-4">
            <p className="text-gray-400 text-sm text-center">
                Technical architecture — click any item for details
            </p>
            <div className="space-y-2">
                {architecture.map((item, index) => {
                    const isExpanded = expandedArch === index
                    return (
                        <div
                            key={index}
                            className={`group rounded-xl bg-zinc-800/40 border border-zinc-700/50 transition-all duration-300 cursor-pointer overflow-hidden ${isExpanded ? 'ring-1 ring-white/20' : 'hover:border-zinc-600 hover:bg-zinc-800/60'}`}
                            onClick={() => setExpandedArch(isExpanded ? null : index)}
                        >
                            {/* Main content */}
                            <div className="p-3 flex items-start gap-3">
                                <item.icon className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white">{item.title}</p>
                                    <p className="text-xs text-gray-400">{item.text}</p>
                                </div>
                                <ChevronDownIcon
                                    className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                />
                            </div>

                            {/* Expandable details */}
                            <div
                                className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}
                            >
                                <div className="px-3 pb-3 pt-1 border-t border-white/10">
                                    <ul className="space-y-1.5">
                                        {item.details.map((detail, idx) => (
                                            <li
                                                key={idx}
                                                className="flex items-start gap-2 text-xs text-gray-300"
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
                })}
            </div>
        </div>
    )

    const SecuritySlide = (
        <div className="space-y-4">
            <p className="text-gray-400 text-sm text-center">
                Security measures and additional resources
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                    {
                        icon: ShieldCheckIcon,
                        title: 'Firebase Security Rules',
                        desc: 'Comprehensive Firestore access controls',
                        details: 'User isolation, field validation, rate limiting',
                    },
                    {
                        icon: LockClosedIcon,
                        title: 'Input Sanitization',
                        desc: 'XSS protection on all API routes',
                        details: 'isomorphic-dompurify on Gemini endpoints',
                    },
                    {
                        icon: CodeBracketIcon,
                        title: 'Security Headers',
                        desc: 'CSP, HSTS, X-Frame-Options',
                        details: 'Configured via Next.js middleware',
                    },
                    {
                        icon: UserIcon,
                        title: 'Child Safety Mode',
                        desc: 'PIN-protected content filtering',
                        details: 'bcrypt-encrypted PIN, session-based verification',
                    },
                ].map((item) => (
                    <div
                        key={item.title}
                        className="group p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-400/40 transition-all duration-300"
                    >
                        <div className="flex items-start gap-3">
                            <item.icon className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                            <div>
                                <p className="text-sm font-medium text-white">{item.title}</p>
                                <p className="text-xs text-gray-400">{item.desc}</p>
                                <p className="text-xs text-emerald-400/70 mt-1">{item.details}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Links */}
            <div className="pt-3">
                <p className="text-xs text-gray-500 mb-3 text-center">Quick Links</p>
                <div className="flex flex-wrap gap-2 justify-center">
                    {[
                        { label: 'Security Details', href: '/security', internal: true },
                        { label: 'Changelog', href: '/changelog', internal: true },
                        {
                            label: 'GitHub Issues',
                            href: 'https://github.com/n8watkins/net_trailer/issues',
                            internal: false,
                        },
                        {
                            label: 'Portfolio',
                            href: 'https://n8sportfolio.vercel.app/',
                            internal: false,
                        },
                    ].map((link) =>
                        link.internal ? (
                            <Link
                                key={link.label}
                                href={link.href}
                                onClick={onClose}
                                className="group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-zinc-800/60 text-gray-300 border border-zinc-700/50 hover:border-red-500/50 hover:text-red-400 transition-all duration-300"
                            >
                                <DocumentTextIcon className="w-3.5 h-3.5" />
                                {link.label}
                            </Link>
                        ) : (
                            <a
                                key={link.label}
                                href={link.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-zinc-800/60 text-gray-300 border border-zinc-700/50 hover:border-red-500/50 hover:text-red-400 transition-all duration-300"
                            >
                                <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                {link.label}
                            </a>
                        )
                    )}
                </div>
            </div>
        </div>
    )

    // Map slide content
    const slideContents = [
        WelcomeSlide,
        TechStackSlide,
        FeaturesSlide,
        ArchitectureSlide,
        SecuritySlide,
    ]

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-modal flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="relative bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-black rounded-2xl max-w-3xl w-full border border-red-500/30 shadow-2xl shadow-red-500/10 overflow-hidden"
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

                {/* Header */}
                <div className="relative z-10 pt-6 pb-4 px-6 text-center border-b border-zinc-800/50">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-red-100 to-white bg-clip-text text-transparent">
                        Welcome to NetTrailers
                    </h2>
                    <p className="text-red-400 text-sm font-medium mt-1">
                        Your Movie & TV Show Discovery Platform
                    </p>
                </div>

                {/* Slide Navigation Pills */}
                <div className="relative z-10 flex justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 border-b border-zinc-800/50 overflow-x-auto">
                    {slides.map((slide, index) => (
                        <button
                            key={slide.id}
                            onClick={() => goToSlide(index)}
                            className={`group flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-300 flex-shrink-0 ${
                                currentSlide === index
                                    ? 'bg-red-500/90 text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                                    : 'bg-zinc-800/60 text-gray-400 hover:text-white hover:bg-zinc-700/80'
                            }`}
                        >
                            {slide.icon}
                            <span className="hidden sm:inline">{slide.title}</span>
                        </button>
                    ))}
                </div>

                {/* Carousel Content */}
                <div className="relative z-10 px-6 py-5 min-h-[420px] max-h-[55vh] overflow-y-auto">
                    {/* Navigation Arrows */}
                    <button
                        onClick={goToPrevSlide}
                        className="absolute left-1 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-zinc-800/80 text-gray-400 hover:text-white hover:bg-zinc-700 transition-all duration-300 hover:scale-110 opacity-50 hover:opacity-100"
                        aria-label="Previous slide"
                    >
                        <ChevronLeftIcon className="w-5 h-5" />
                    </button>
                    <button
                        onClick={goToNextSlide}
                        className="absolute right-1 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full bg-zinc-800/80 text-gray-400 hover:text-white hover:bg-zinc-700 transition-all duration-300 hover:scale-110 opacity-50 hover:opacity-100"
                        aria-label="Next slide"
                    >
                        <ChevronRightIcon className="w-5 h-5" />
                    </button>

                    {/* Slide Content with Animation */}
                    <div
                        className={`px-4 transition-all duration-300 ease-out ${
                            isAnimating
                                ? direction === 'right'
                                    ? 'opacity-0 translate-x-4'
                                    : 'opacity-0 -translate-x-4'
                                : 'opacity-100 translate-x-0'
                        }`}
                    >
                        {slideContents[currentSlide]}
                    </div>
                </div>

                {/* Footer with dot indicators */}
                <div className="relative z-10 px-6 py-3 border-t border-zinc-800/50">
                    <div className="flex items-center justify-between">
                        {/* Dot indicators */}
                        <div className="flex gap-1.5">
                            {slides.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => goToSlide(index)}
                                    aria-label={`Go to slide ${index + 1}`}
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        currentSlide === index
                                            ? 'bg-red-500 w-6'
                                            : 'bg-zinc-600 hover:bg-zinc-500 w-2'
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Footer text */}
                        <p className="text-xs text-gray-500">
                            Built with <span className="text-red-400">❤️</span> as a portfolio
                            project
                        </p>

                        {/* Keyboard hint */}
                        <div className="hidden sm:flex items-center gap-1 text-xs text-gray-600">
                            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-gray-400 text-[10px]">
                                ←
                            </kbd>
                            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-gray-400 text-[10px]">
                                →
                            </kbd>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AboutModal
