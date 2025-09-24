import React from 'react'
import { XMarkIcon, AcademicCapIcon } from '@heroicons/react/24/outline'
import useUserData from '../hooks/useUserData'

interface TutorialModalProps {
    isOpen: boolean
    onClose: () => void
}

const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
    const { isGuest, isAuthenticated } = useUserData()

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[9999] overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div
                    className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
                    onClick={onClose}
                />

                {/* Modal panel */}
                <div className="inline-block w-full max-w-lg px-6 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-[#181818] border border-gray-600/50 rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-[#e50914] rounded-full flex items-center justify-center shadow-lg">
                                <AcademicCapIcon className="h-6 w-6 text-white" />
                            </div>
                            <h3 className="font-bold text-xl text-white">
                                How to Use Net Trailers
                            </h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors duration-200 p-1 rounded-full hover:bg-white/10"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="text-base space-y-4">
                        {isGuest ? (
                            <>
                                <p className="text-[#ff6b6b] font-bold text-lg">
                                    🚀 Guest Mode Features
                                </p>
                                <div className="space-y-3 text-gray-100">
                                    <div className="flex items-start space-x-3">
                                        <span className="text-[#e50914] font-bold">•</span>
                                        <div>
                                            <p className="font-semibold">
                                                Rate and hide content 👍 👎 ❤️ 👁‍🗨
                                            </p>
                                            <p className="text-sm text-gray-400">
                                                Click rating buttons below posters or use the hide
                                                button (👁‍🗨) in detail view. Hidden content
                                                won&apos;t appear in recommendations and can be
                                                managed in My Lists!
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <span className="text-[#e50914] font-bold">•</span>
                                        <div>
                                            <p className="font-semibold">
                                                Build your personal watchlist
                                            </p>
                                            <p className="text-sm text-gray-400">
                                                Click the + button to add movies to watch later
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <span className="text-[#e50914] font-bold">•</span>
                                        <div>
                                            <p className="font-semibold">
                                                Browse unlimited content
                                            </p>
                                            <p className="text-sm text-gray-400">
                                                Explore movies, TV shows, and trailers
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <span className="text-[#e50914] font-bold">•</span>
                                        <div>
                                            <p className="font-semibold">Search with filters</p>
                                            <p className="text-sm text-gray-400">
                                                Use the search bar and apply genre, year, rating
                                                filters
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 p-3 bg-[#333]/50 rounded-lg border border-[#f5c518]/30">
                                    <p className="text-[#f5c518] text-sm font-semibold">
                                        💡 Create account to sync across devices!
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-[#ff6b6b] font-bold text-lg">
                                    🎯 Welcome to Net Trailers!
                                </p>
                                <div className="space-y-3 text-gray-100">
                                    <div className="flex items-start space-x-3">
                                        <span className="text-[#e50914] font-bold">•</span>
                                        <div>
                                            <p className="font-semibold">Rate & Hide Content</p>
                                            <p className="text-sm text-gray-400">
                                                Rate with 👍 👎 ❤️ or hide content using the 👁‍🗨
                                                button in detail view. Hidden content is filtered
                                                from recommendations and stored in your Hidden list
                                                in My Lists!
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <span className="text-[#e50914] font-bold">•</span>
                                        <div>
                                            <p className="font-semibold">Personal Watchlist</p>
                                            <p className="text-sm text-gray-400">
                                                Save movies to watch later, accessible anywhere
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <span className="text-[#e50914] font-bold">•</span>
                                        <div>
                                            <p className="font-semibold">Advanced Search</p>
                                            <p className="text-sm text-gray-400">
                                                Filter by genre, year, rating, and content type
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <span className="text-[#e50914] font-bold">•</span>
                                        <div>
                                            <p className="font-semibold">Keyboard Shortcuts</p>
                                            <p className="text-sm text-gray-400">
                                                Press &lsquo;?&rsquo; or use the dropdown menu for
                                                shortcuts
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 p-3 bg-[#333]/50 rounded-lg border border-[#e50914]/30">
                                    <p className="text-gray-300 text-sm">
                                        <span className="font-semibold">
                                            Portfolio project showcasing:
                                        </span>
                                        <br />
                                        Next.js + TypeScript + Firebase + Real-time sync
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default TutorialModal
