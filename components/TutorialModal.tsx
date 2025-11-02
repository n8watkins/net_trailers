import React from 'react'
import {
    XMarkIcon,
    AcademicCapIcon,
    EyeSlashIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { HandThumbUpIcon } from '@heroicons/react/24/solid'
import { useAuthStatus } from '../hooks/useAuthStatus'
import { useAppStore } from '../stores/appStore'

interface TutorialModalProps {
    isOpen: boolean
    onClose: () => void
}

const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
    const { isGuest } = useAuthStatus()
    const { openAuthModal } = useAppStore()

    const handleSignUp = () => {
        onClose()
        openAuthModal('signup')
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
            <div className="relative w-full max-w-3xl px-8 pt-5 pb-5 overflow-hidden text-left transition-all transform bg-[#0a0a0a] border border-red-500/40 rounded-xl shadow-2xl shadow-red-500/20 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="relative mb-5">
                    <button
                        onClick={onClose}
                        className="absolute right-0 top-0 text-gray-400 hover:text-white transition-colors duration-200 p-1 rounded-full hover:bg-white/10"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                    <div className="flex items-center justify-center gap-3">
                        <div className="w-8 h-8 bg-[#e50914] rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                            <AcademicCapIcon className="h-5 w-5 text-white" />
                        </div>
                        <h3 className="font-bold text-xl text-white">How to Use Net Trailers</h3>
                    </div>
                </div>

                {/* Content */}
                <div className="text-base space-y-4">
                    {isGuest ? (
                        <>
                            <p className="text-[#ff6b6b] font-bold text-base">
                                🚀 Guest Mode Features
                            </p>
                            <div className="space-y-3 text-gray-100">
                                <div className="flex items-start space-x-4">
                                    <span className="text-[#e50914] font-bold text-lg">•</span>
                                    <div>
                                        <p className="font-semibold text-base flex items-center gap-2">
                                            Like content{' '}
                                            <HandThumbUpIcon className="w-5 h-5 text-white" />
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Like content with the thumbs up button to keep track of
                                            your favorites
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <span className="text-[#e50914] font-bold text-lg">•</span>
                                    <div>
                                        <p className="font-semibold text-base flex items-center gap-2">
                                            Hide unwanted content{' '}
                                            <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Hide content using the eye button. Hidden content
                                            won&apos;t appear in recommendations!
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <span className="text-[#e50914] font-bold text-lg">•</span>
                                    <div>
                                        <p className="font-semibold text-base">
                                            Build your personal watchlist
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Add movies and TV shows to watch later - saved locally
                                            on your device
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <span className="text-[#e50914] font-bold text-lg">•</span>
                                    <div>
                                        <p className="font-semibold text-base">
                                            Browse unlimited content
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Explore movies, TV shows, and trailers
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <span className="text-[#e50914] font-bold text-lg">•</span>
                                    <div>
                                        <p className="font-semibold text-base">
                                            Search with filters
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Use the search bar and apply genre, year, rating filters
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Guest Mode Limitations - Larger & Clearer */}
                            <div className="mt-5 p-4 bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-lg border border-orange-400/30">
                                <p className="text-white text-base font-bold mb-3 flex items-center gap-2">
                                    🔒 Guest Mode Limitations
                                </p>
                                <ul className="text-gray-200 text-sm space-y-1.5">
                                    <li className="flex items-start gap-2">
                                        <span className="text-orange-300">✗</span>
                                        <span>Cannot create custom lists</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-orange-300">✗</span>
                                        <span>Cannot export data to CSV</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-orange-300">✗</span>
                                        <span>Cannot enable Child Safety Mode</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-orange-300">✗</span>
                                        <span>Data saved locally (not synced across devices)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-orange-300">✗</span>
                                        <span>May be lost if you clear browser data</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Call to Action - Outside limitations box */}
                            <div className="mt-4 text-center">
                                <div className="mb-3 py-3 px-5 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-yellow-500/10 rounded-lg border border-red-500/20">
                                    <p className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 text-base font-bold mb-1">
                                        ✨ Unlock the Full Experience
                                    </p>
                                    <p className="text-gray-400 text-xs">
                                        Create an account to sync your data and access all features
                                    </p>
                                </div>
                                <div className="flex justify-center gap-3">
                                    <button
                                        onClick={() => openAuthModal('signin')}
                                        className="px-5 py-2 bg-[#1a1a1a] hover:bg-[#252525] text-white text-sm font-medium rounded-lg transition-colors border border-[#454545]"
                                    >
                                        Sign In
                                    </button>
                                    <button
                                        onClick={handleSignUp}
                                        className="px-5 py-2 bg-[#e50914] hover:bg-[#f40612] text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg"
                                    >
                                        Create Account
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-[#ff6b6b] font-bold text-base">
                                🎯 Welcome to Net Trailers!
                            </p>
                            <div className="space-y-3 text-gray-100">
                                <div className="flex items-start space-x-4">
                                    <span className="text-[#e50914] font-bold text-lg">•</span>
                                    <div>
                                        <p className="font-semibold text-base flex items-center gap-2">
                                            Like Content{' '}
                                            <HandThumbUpIcon className="w-5 h-5 text-white" />
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Like content with the thumbs up button to keep track of
                                            your favorites
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <span className="text-[#e50914] font-bold text-lg">•</span>
                                    <div>
                                        <p className="font-semibold text-base flex items-center gap-2">
                                            Hide Content{' '}
                                            <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Hide unwanted content which is filtered from
                                            recommendations and stored in your Hidden list!
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <span className="text-[#e50914] font-bold text-lg">•</span>
                                    <div>
                                        <p className="font-semibold text-base">
                                            Create Custom Lists
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Organize content with custom lists - watchlist for
                                            later, themed collections, and more!
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <span className="text-[#e50914] font-bold text-lg">•</span>
                                    <div>
                                        <p className="font-semibold text-base">
                                            Sync Across Devices
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Your watchlist, likes, and custom lists sync
                                            automatically across all devices
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <span className="text-[#e50914] font-bold text-lg">•</span>
                                    <div>
                                        <p className="font-semibold text-base">
                                            Keyboard Shortcuts
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Press &lsquo;?&rsquo; to view all keyboard shortcuts for
                                            faster navigation
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4">
                                    <span className="text-[#e50914] font-bold text-lg">•</span>
                                    <div>
                                        <p className="font-semibold text-base flex items-center gap-2">
                                            Child Safety Mode{' '}
                                            <ShieldCheckIcon className="w-5 h-5 text-red-500" />
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Enable Child Safety Mode to filter out adult content and
                                            create a safe browsing experience for children
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 p-3 bg-[#1a1a1a] rounded-lg border border-[#e50914]/40">
                                <p className="text-gray-300 text-xs">
                                    <span className="font-semibold">
                                        Portfolio project showcasing:
                                    </span>{' '}
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
