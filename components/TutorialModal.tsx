import React from 'react'
import { XMarkIcon, AcademicCapIcon } from '@heroicons/react/24/outline'
import { useAuthStatus } from '../hooks/useAuthStatus'
import { useRecoilState } from 'recoil'
import { authModalState } from '../atoms/authModalAtom'

interface TutorialModalProps {
    isOpen: boolean
    onClose: () => void
}

const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
    const { isGuest, isAuthenticated } = useAuthStatus()
    const [authModal, setAuthModal] = useRecoilState(authModalState)

    const handleSignUp = () => {
        onClose()
        setAuthModal({ isOpen: true, mode: 'signup' })
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[50000] flex items-center justify-center p-4">
            {/* Background overlay */}
            <div
                className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
                onClick={onClose}
            />

            {/* Modal panel */}
            <div className="relative w-full max-w-lg px-6 pt-5 pb-4 overflow-hidden text-left transition-all transform bg-[#0a0a0a] border border-red-500/40 rounded-xl shadow-2xl shadow-red-500/20 sm:p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-[#e50914] rounded-full flex items-center justify-center shadow-lg">
                            <AcademicCapIcon className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="font-bold text-xl text-white">How to Use Net Trailers</h3>
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
                                            Like and hide content 👍 ❤️ 👁
                                        </p>
                                        <p className="text-sm text-gray-400">
                                            Like content with the thumbs up button, or hide unwanted
                                            content using the eye button. Hidden content won&apos;t
                                            appear in recommendations!
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
                                            Add movies and TV shows to watch later - saved locally
                                            on your device
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <span className="text-[#e50914] font-bold">•</span>
                                    <div>
                                        <p className="font-semibold">Browse unlimited content</p>
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
                                            Use the search bar and apply genre, year, rating filters
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 p-3 bg-[#1a1a1a] rounded-lg border border-[#e50914]/40">
                                <p className="text-gray-300 text-sm font-semibold mb-3">
                                    🔒 Guest mode limitations:
                                </p>
                                <ul className="text-gray-400 text-xs space-y-1 mb-3">
                                    <li>• Cannot create custom lists</li>
                                    <li>• Data saved locally (not synced across devices)</li>
                                    <li>• May be lost if you clear browser data</li>
                                </ul>
                                <button
                                    onClick={handleSignUp}
                                    className="w-full bg-[#e50914] hover:bg-[#f40612] text-white font-semibold py-2 px-4 rounded transition-colors duration-200"
                                >
                                    Create Account to Sync Across Devices
                                </button>
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
                                        <p className="font-semibold">Like & Hide Content</p>
                                        <p className="text-sm text-gray-400">
                                            Like content with 👍 ❤️ or hide unwanted content with
                                            👁. Hidden content is filtered from recommendations and
                                            stored in your Hidden list!
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <span className="text-[#e50914] font-bold">•</span>
                                    <div>
                                        <p className="font-semibold">Create Custom Lists</p>
                                        <p className="text-sm text-gray-400">
                                            Organize content with custom lists - watchlist for
                                            later, themed collections, and more!
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <span className="text-[#e50914] font-bold">•</span>
                                    <div>
                                        <p className="font-semibold">Sync Across Devices</p>
                                        <p className="text-sm text-gray-400">
                                            Your watchlist, likes, and custom lists sync
                                            automatically across all devices
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <span className="text-[#e50914] font-bold">•</span>
                                    <div>
                                        <p className="font-semibold">Keyboard Shortcuts</p>
                                        <p className="text-sm text-gray-400">
                                            Press &lsquo;?&rsquo; to view all keyboard shortcuts for
                                            faster navigation
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 p-3 bg-[#1a1a1a] rounded-lg border border-[#e50914]/40">
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
    )
}

export default TutorialModal
