import React, { useEffect } from 'react'
import Link from 'next/link'
import {
    CommandLineIcon,
    HomeIcon,
    MagnifyingGlassIcon,
    TvIcon,
    FilmIcon,
    RectangleStackIcon,
} from '@heroicons/react/24/outline'
import { getFirstVisitStatus } from '../../utils/firstVisitTracker'

interface FooterProps {
    showAboutModal: boolean
    onOpenAboutModal: () => void
    onCloseAboutModal: () => void
    onOpenKeyboardShortcuts?: () => void
}

const movieGenres = [
    { id: 28, name: 'Action', path: '/genres/movie/28' },
    { id: 35, name: 'Comedy', path: '/genres/movie/35' },
    { id: 18, name: 'Drama', path: '/genres/movie/18' },
    { id: 27, name: 'Horror', path: '/genres/movie/27' },
    { id: 878, name: 'Sci-Fi', path: '/genres/movie/878' },
    { id: 53, name: 'Thriller', path: '/genres/movie/53' },
]

const tvGenres = [
    { id: 10759, name: 'Action & Adventure', path: '/genres/tv/10759' },
    { id: 35, name: 'Comedy', path: '/genres/tv/35' },
    { id: 18, name: 'Drama', path: '/genres/tv/18' },
    { id: 9648, name: 'Mystery', path: '/genres/tv/9648' },
    { id: 10765, name: 'Sci-Fi & Fantasy', path: '/genres/tv/10765' },
    { id: 10764, name: 'Reality', path: '/genres/tv/10764' },
]

function Footer({
    showAboutModal: _showAboutModal,
    onOpenAboutModal,
    onCloseAboutModal: _onCloseAboutModal,
    onOpenKeyboardShortcuts,
}: FooterProps) {
    useEffect(() => {
        const { shouldShowModal } = getFirstVisitStatus()
        if (shouldShowModal) {
            onOpenAboutModal()
        }
    }, [onOpenAboutModal])

    return (
        <>
            <footer className="bg-[#0a0a0a] border-t border-gray-800">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
                        {/* Navigate Section */}
                        <div>
                            <h3 className="text-red-500 text-lg font-semibold mb-4">Navigate</h3>
                            <ul className="space-y-3">
                                <li>
                                    <Link
                                        href="/"
                                        className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center space-x-2"
                                    >
                                        <HomeIcon className="h-4 w-4" />
                                        <span>Home</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/search"
                                        className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center space-x-2"
                                    >
                                        <MagnifyingGlassIcon className="h-4 w-4" />
                                        <span>Search</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link
                                        href="/watch-later"
                                        className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center space-x-2"
                                    >
                                        <RectangleStackIcon className="h-4 w-4" />
                                        <span>Collections</span>
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        {/* Movie Genres Section */}
                        <div>
                            <h3 className="text-red-500 text-lg font-semibold mb-4">
                                Movie Genres
                            </h3>
                            <ul className="space-y-3">
                                {movieGenres.map((genre) => (
                                    <li key={genre.id}>
                                        <Link
                                            href={`${genre.path}?name=${encodeURIComponent(genre.name)}`}
                                            className="text-gray-300 hover:text-white transition-colors duration-200"
                                        >
                                            {genre.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* TV Genres Section */}
                        <div>
                            <h3 className="text-red-500 text-lg font-semibold mb-4">TV Genres</h3>
                            <ul className="space-y-3">
                                {tvGenres.map((genre) => (
                                    <li key={genre.id}>
                                        <Link
                                            href={`${genre.path}?name=${encodeURIComponent(genre.name)}`}
                                            className="text-gray-300 hover:text-white transition-colors duration-200"
                                        >
                                            {genre.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Connect Section */}
                        <div>
                            <h3 className="text-red-500 text-lg font-semibold mb-4">
                                Connect With Me
                            </h3>
                            <div className="flex space-x-4 mb-6">
                                <a
                                    href="https://github.com/n8watkins"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-300 hover:text-red-500 transition-colors duration-200"
                                    aria-label="GitHub"
                                >
                                    <svg
                                        className="w-6 h-6"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                    </svg>
                                </a>
                                <a
                                    href="https://www.linkedin.com/in/n8watkins/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-300 hover:text-red-500 transition-colors duration-200"
                                    aria-label="LinkedIn"
                                >
                                    <svg
                                        className="w-6 h-6"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                    </svg>
                                </a>
                                <a
                                    href="https://x.com/n8watkins"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-300 hover:text-red-500 transition-colors duration-200"
                                    aria-label="Twitter/X"
                                >
                                    <svg
                                        className="w-6 h-6"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
                                    </svg>
                                </a>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-3">
                                    <p className="text-gray-300 text-sm">
                                        <button
                                            onClick={onOpenAboutModal}
                                            className="group hover:text-white transition-colors duration-200 flex items-center gap-2"
                                        >
                                            <svg
                                                className="w-7 h-7 group-hover:text-red-500 transition-colors duration-200"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={1.5}
                                                    d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
                                                />
                                            </svg>
                                            About NetTrailers
                                        </button>
                                    </p>
                                    <p className="text-gray-300 text-sm">
                                        <a
                                            href="https://github.com/n8watkins/net_trailer"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group hover:text-white transition-colors duration-200 flex items-center gap-2"
                                        >
                                            <svg
                                                className="w-6 h-6 group-hover:text-red-500 transition-colors duration-200"
                                                fill="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                            </svg>
                                            Source Code
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Legal & Support Section */}
                        <div>
                            <h3 className="text-red-500 text-lg font-semibold mb-4">
                                Legal & Support
                            </h3>
                            <div className="space-y-3">
                                <p className="text-gray-300 text-sm">
                                    <Link
                                        href="/support"
                                        className="hover:text-white transition-colors duration-200"
                                    >
                                        Contact Us
                                    </Link>
                                </p>
                                <p className="text-gray-300 text-sm">
                                    <Link
                                        href="/privacy"
                                        className="hover:text-white transition-colors duration-200"
                                    >
                                        Privacy Policy
                                    </Link>
                                </p>
                                <p className="text-gray-300 text-sm">
                                    <Link
                                        href="/terms"
                                        className="hover:text-white transition-colors duration-200"
                                    >
                                        Terms of Service
                                    </Link>
                                </p>
                                <p className="text-gray-300 text-sm">
                                    <Link
                                        href="/security"
                                        className="hover:text-white transition-colors duration-200"
                                    >
                                        Security
                                    </Link>
                                </p>
                                <p className="text-gray-300 text-sm">
                                    <Link
                                        href="/changelog"
                                        className="hover:text-white transition-colors duration-200"
                                    >
                                        Changelog
                                    </Link>
                                </p>
                                {/* Hide keyboard shortcuts link on mobile/tablet since shortcuts are disabled */}
                                {onOpenKeyboardShortcuts && (
                                    <p className="hidden lg:block text-gray-300 text-sm">
                                        <button
                                            onClick={onOpenKeyboardShortcuts}
                                            className="group hover:text-white transition-all duration-200 flex items-center gap-2 p-1 rounded-lg hover:bg-gray-700/20"
                                        >
                                            <CommandLineIcon className="w-4 h-4 group-hover:text-red-400 transition-colors duration-200" />
                                            <span className="underline group-hover:no-underline">
                                                Keyboard Shortcuts
                                            </span>
                                        </button>
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Section */}
                    <div className="border-t border-gray-800 mt-8 pt-8">
                        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                            <div className="flex items-center space-x-2">
                                <span className="text-red-600 font-bold text-xl">NetTrailer</span>
                                <span className="text-gray-400 text-sm">
                                    © 2025 All rights reserved.
                                </span>
                            </div>
                            <div className="text-gray-400 text-sm">
                                Powered by{' '}
                                <a
                                    href="https://www.themoviedb.org/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-red-500 hover:text-red-400 transition-colors duration-200"
                                >
                                    TMDB
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </>
    )
}

export default Footer
