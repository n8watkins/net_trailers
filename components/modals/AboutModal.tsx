import React, { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { XMarkIcon, HeartIcon, StarIcon, PlayIcon } from '@heroicons/react/24/outline'

interface AboutModalProps {
    isOpen: boolean
    onClose: () => void
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }

        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-modal flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#0a0a0a] rounded-xl max-w-4xl w-full p-6 border border-red-500/40 shadow-2xl shadow-red-500/20 relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>

                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-white text-2xl font-bold mb-2">Welcome to NetTrailers</h2>
                    <p className="text-red-500 text-sm font-medium">
                        Your Movie & TV Show Discovery Platform
                    </p>
                </div>

                {/* Content */}
                <div className="space-y-6 text-gray-300">
                    <div>
                        <div className="flex items-center gap-4 mb-6">
                            <Image
                                src="/images/portrait-medium.jpg"
                                alt="Nathan's Portrait"
                                width={64}
                                height={64}
                                className="w-16 h-16 rounded-full object-cover border-2 border-white"
                            />
                            <h3 className="text-white text-lg font-semibold">Hi all, 👋</h3>
                        </div>

                        <div className="space-y-4">
                            <p className="text-sm leading-relaxed">
                                I&apos;m Nathan, and NetTrailers is a Portfolio project designed to
                                showcase modern web dev practices with a real-world application. It
                                highlights my skills in full-stack development, API integration, and
                                user experience design. I hope you enjoy NetTrailers and if
                                you&apos;d like to explore further:
                            </p>

                            <ul className="text-sm space-y-2 ml-4">
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

                        <div className="flex items-center justify-center gap-4 mt-6">
                            <a
                                href="https://github.com/n8watkins"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Nathan's GitHub"
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center"
                            >
                                <Image
                                    src="/icons/github.svg"
                                    alt="GitHub"
                                    width={24}
                                    height={24}
                                    className="w-6 h-6 md:w-7 md:h-7"
                                />
                            </a>
                            <a
                                href="https://www.linkedin.com/in/n8watkins/"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Nathan's LinkedIn"
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center"
                            >
                                <Image
                                    src="/icons/linkedin.svg"
                                    alt="LinkedIn"
                                    width={24}
                                    height={24}
                                    className="w-6 h-6 md:w-7 md:h-7"
                                />
                            </a>
                            <a
                                href="https://x.com/n8watkins"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Nathan's X (Twitter)"
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center"
                            >
                                <svg
                                    className="w-6 h-6 md:w-7 md:h-7 fill-white"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-white text-lg font-semibold mb-3">Tech Stack</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-transparent rounded-lg flex items-center justify-center">
                                    <Image
                                        src="/icons/typescript.svg"
                                        alt="TypeScript"
                                        width={24}
                                        height={24}
                                        className="w-6 h-6"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">TypeScript</p>
                                    <p className="text-xs text-gray-400">Type-safe development</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center border border-white">
                                    <Image
                                        src="/icons/nextjs.svg"
                                        alt="Next.js"
                                        width={20}
                                        height={20}
                                        className="w-5 h-5"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Next.js</p>
                                    <p className="text-xs text-gray-400">React framework</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center">
                                    <Image
                                        src="/icons/tailwind.svg"
                                        alt="Tailwind CSS"
                                        width={24}
                                        height={16}
                                        className="w-6 h-4"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Tailwind CSS</p>
                                    <p className="text-xs text-gray-400">Utility-first styling</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-transparent rounded-lg flex items-center justify-center">
                                    <Image
                                        src="/icons/firebase.png"
                                        alt="Firebase"
                                        width={24}
                                        height={24}
                                        className="w-6 h-6"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Firebase</p>
                                    <p className="text-xs text-gray-400">Auth & database</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 flex items-center justify-center">
                                    <span className="text-2xl">🐻</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Zustand</p>
                                    <p className="text-xs text-gray-400">State management</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 flex items-center justify-center">
                                    <span className="text-2xl">🎬</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">TMDB API</p>
                                    <p className="text-xs text-gray-400">Movie database</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-white text-lg font-semibold mb-3">Key Features</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-start space-x-3">
                                <PlayIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        Movies & TV Shows Discovery
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Browse trending content, genres, and watch trailers
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <HeartIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        Custom Watchlists & Likes
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Create unlimited lists, like content, organize favorites
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <StarIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        Advanced Search & Filters
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Real-time search with genre, year, and rating filters
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <svg
                                    className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                    />
                                </svg>
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        Responsive Design
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Seamless experience across desktop, tablet, and mobile
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <svg
                                    className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                    />
                                </svg>
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        Guest Mode & Authentication
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Try without signing up or sync with cloud storage
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <svg
                                    className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                                    />
                                </svg>
                                <div>
                                    <p className="text-sm font-medium text-white">Smart Features</p>
                                    <p className="text-xs text-gray-400">
                                        Keyboard shortcuts, child safety, CSV export
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-white text-lg font-semibold mb-3">
                            Development Highlights
                        </h3>
                        <ul className="text-sm space-y-1">
                            <li className="flex items-start space-x-2">
                                <span className="text-red-500">•</span>
                                <span>Zustand state management for optimal performance</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="text-red-500">•</span>
                                <span>
                                    Multi-storage architecture (Firestore for auth, localStorage for
                                    guests)
                                </span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="text-red-500">•</span>
                                <span>
                                    Comprehensive Jest test suite with React Testing Library
                                </span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="text-red-500">•</span>
                                <span>
                                    Error monitoring with Sentry and analytics with GA4 integration
                                </span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="text-red-500">•</span>
                                <span>
                                    Advanced search with debouncing, race condition handling, and
                                    URL sync
                                </span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="text-red-500">•</span>
                                <span>
                                    Custom caching system for API optimization and performance
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-gray-600/50 text-center">
                    <p className="text-xs text-gray-400">
                        Built with ❤️ as a portfolio project showcasing modern web development
                    </p>
                </div>
            </div>
        </div>
    )
}

export default AboutModal
