import React from 'react'
import { XMarkIcon, HeartIcon, StarIcon, PlayIcon } from '@heroicons/react/24/outline'

interface AboutModalProps {
    isOpen: boolean
    onClose: () => void
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#181818] rounded-lg max-w-lg w-full p-6 border border-gray-600/50 relative max-h-[90vh] overflow-y-auto"
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
                    <h2 className="text-white text-2xl font-bold mb-2">
                        About NetTrailer
                    </h2>
                    <p className="text-red-500 text-sm font-medium">
                        Your Movie & TV Show Discovery Platform
                    </p>
                </div>

                {/* Content */}
                <div className="space-y-6 text-gray-300">
                    <div>
                        <h3 className="text-white text-lg font-semibold mb-3">Project Purpose</h3>
                        <p className="text-sm leading-relaxed">
                            NetTrailer is a <span className="text-red-400 font-medium">personal portfolio project</span> showcasing modern web development skills
                            and best practices. Built as a comprehensive movie and TV show discovery platform, it demonstrates
                            proficiency in full-stack development, API integration, and user experience design.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-white text-lg font-semibold mb-3">Tech Stack</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">TS</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">TypeScript</p>
                                    <p className="text-xs text-gray-400">Type-safe development</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center border border-white">
                                    <span className="text-white text-xs font-bold">⚫</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Next.js</p>
                                    <p className="text-xs text-gray-400">React framework</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">🎨</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Tailwind CSS</p>
                                    <p className="text-xs text-gray-400">Utility-first styling</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">🔥</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Firebase</p>
                                    <p className="text-xs text-gray-400">Auth & database</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">⚛</span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Recoil</p>
                                    <p className="text-xs text-gray-400">State management</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">📡</span>
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
                                    <p className="text-sm font-medium text-white">Real-time Search & Infinite Scroll</p>
                                    <p className="text-xs text-gray-400">Advanced search with optimized performance</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <HeartIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-white">User Authentication & Favorites</p>
                                    <p className="text-xs text-gray-400">Firebase-powered user management system</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-3">
                                <StarIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-white">Responsive Design & Accessibility</p>
                                    <p className="text-xs text-gray-400">Mobile-first approach with modern UX</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-white text-lg font-semibold mb-3">Development Highlights</h3>
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
                                <span>Real-time search with debouncing and race condition handling</span>
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