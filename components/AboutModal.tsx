import React, { useEffect } from 'react'
import Image from 'next/image'
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
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#181818] rounded-lg max-w-4xl w-full p-6 border border-gray-600/50 relative max-h-[90vh] overflow-y-auto"
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
                                <li className="flex items-start">
                                    <span className="text-red-500 mr-2">•</span>
                                    <span>
                                        Feel free to connect with me on my socials if you&apos;d
                                        like to connect.
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
                                className="w-10 h-10 rounded-full hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center"
                            >
                                <Image
                                    src="/icons/github.svg"
                                    alt="GitHub"
                                    width={24}
                                    height={24}
                                    className="w-6 h-6"
                                />
                            </a>
                            <a
                                href="https://www.linkedin.com/in/n8watkins/"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Nathan's LinkedIn"
                                className="w-10 h-10 rounded-full hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center"
                            >
                                <Image
                                    src="/icons/linkedin.svg"
                                    alt="LinkedIn"
                                    width={24}
                                    height={24}
                                    className="w-6 h-6"
                                />
                            </a>
                            <a
                                href="https://x.com/n8watkins"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Nathan's X (Twitter)"
                                className="w-10 h-10 rounded-full hover:bg-gray-700 transition-colors duration-200 flex items-center justify-center"
                            >
                                <svg className="w-6 h-6 fill-white" viewBox="0 0 24 24">
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
                                    <span className="text-2xl">⚛️</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Recoil</p>
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
                        <div className="space-y-3">
                            <div className="flex items-start space-x-3">
                                <PlayIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        Real-time Search & Infinite Scroll
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Advanced search with optimized performance
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <HeartIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        User Authentication & Favorites
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Firebase-powered user management system
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <StarIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-white">
                                        Responsive Design & Accessibility
                                    </p>
                                    <p className="text-xs text-gray-400">
                                        Mobile-first approach with modern UX
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
                                <span>Custom caching system for API optimization</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="text-red-500">•</span>
                                <span>Advanced TypeScript patterns and error handling</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="text-red-500">•</span>
                                <span>Responsive grid layouts with infinite scroll</span>
                            </li>
                            <li className="flex items-start space-x-2">
                                <span className="text-red-500">•</span>
                                <span>
                                    Real-time search with debouncing and race condition handling
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
