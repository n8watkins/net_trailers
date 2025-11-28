import React from 'react'
import {
    XMarkIcon,
    AcademicCapIcon,
    EyeSlashIcon,
    ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { HandThumbUpIcon } from '@heroicons/react/24/solid'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import { useModalStore } from '../../stores/modalStore'

interface TutorialModalProps {
    isOpen: boolean
    onClose: () => void
}

const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
    const { isGuest } = useAuthStatus()
    const { openAuthModal } = useModalStore()

    const handleSignUp = () => {
        onClose()
        openAuthModal('signup')
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
            {/* Enhanced Background overlay with atmospheric effect */}
            <div className="fixed inset-0">
                <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
                <div className="absolute inset-0 bg-gradient-radial from-orange-900/20 via-transparent to-transparent opacity-50 pointer-events-none" />
            </div>

            {/* Modal panel with cinematic styling */}
            <div className="relative w-full max-w-3xl px-8 pt-6 pb-6 overflow-hidden text-left transition-all transform bg-zinc-900/95 backdrop-blur-xl border border-orange-500/40 rounded-2xl shadow-2xl shadow-orange-500/20 max-h-[90vh] overflow-y-auto">
                {/* Animated background gradients */}
                <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/80 to-black -z-10" />
                <div
                    className="absolute inset-0 bg-gradient-to-t from-orange-900/20 via-red-900/10 to-black/50 animate-pulse -z-10"
                    style={{ animationDuration: '4s' }}
                />
                <div className="absolute inset-0 bg-gradient-radial from-orange-500/5 via-orange-900/5 to-transparent -z-10" />

                {/* Header */}
                <div className="relative mb-6">
                    <button
                        onClick={onClose}
                        className="absolute right-0 top-0 text-gray-400 hover:text-white transition-colors duration-200 p-2 rounded-full hover:bg-white/10"
                        aria-label="Close tutorial"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                    <div className="flex items-center justify-center gap-3 mb-2">
                        {/* Glowing icon */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-orange-500/30 blur-xl scale-150" />
                            <div className="relative w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                                <AcademicCapIcon className="h-7 w-7 text-white" />
                            </div>
                        </div>
                        <h3 className="font-black text-2xl text-white">
                            <span className="bg-gradient-to-r from-orange-200 via-red-100 to-orange-200 bg-clip-text text-transparent drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                How to Use Net Trailers
                            </span>
                        </h3>
                    </div>
                    <p className="text-center text-gray-400 text-sm">
                        Your guide to discovering amazing content
                    </p>
                </div>

                {/* Content */}
                <div className="text-base space-y-5">
                    {isGuest ? (
                        <>
                            <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl p-4 border border-orange-500/20">
                                <p className="text-orange-400 font-bold text-lg mb-1">
                                    🚀 Guest Mode Features
                                </p>
                                <p className="text-gray-400 text-sm">
                                    Explore without signing up - try these features:
                                </p>
                            </div>

                            <div className="space-y-3 text-gray-100">
                                <div className="flex items-start space-x-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                    <span className="text-orange-500 font-bold text-xl flex-shrink-0">
                                        •
                                    </span>
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
                                <div className="flex items-start space-x-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                    <span className="text-orange-500 font-bold text-xl flex-shrink-0">
                                        •
                                    </span>
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
                                <div className="flex items-start space-x-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                    <span className="text-orange-500 font-bold text-xl flex-shrink-0">
                                        •
                                    </span>
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
                                <div className="flex items-start space-x-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                    <span className="text-orange-500 font-bold text-xl flex-shrink-0">
                                        •
                                    </span>
                                    <div>
                                        <p className="font-semibold text-base">
                                            Browse unlimited content
                                        </p>
                                        <p className="text-sm text-gray-400 mt-1">
                                            Explore movies, TV shows, and trailers
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                    <span className="text-orange-500 font-bold text-xl flex-shrink-0">
                                        •
                                    </span>
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

                            {/* Guest Mode Limitations */}
                            <div className="mt-5 p-5 bg-gradient-to-r from-orange-500/15 to-amber-500/15 rounded-xl border border-orange-400/40 backdrop-blur-sm">
                                <p className="text-white text-base font-bold mb-3 flex items-center gap-2">
                                    🔒 Guest Mode Limitations
                                </p>
                                <ul className="text-gray-200 text-sm space-y-2">
                                    <li className="flex items-start gap-2">
                                        <span className="text-orange-400 font-bold">✗</span>
                                        <span>Cannot create custom lists</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-orange-400 font-bold">✗</span>
                                        <span>Cannot export data to CSV</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-orange-400 font-bold">✗</span>
                                        <span>Cannot enable Child Safety Mode</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-orange-400 font-bold">✗</span>
                                        <span>Data saved locally (not synced across devices)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-orange-400 font-bold">✗</span>
                                        <span>May be lost if you clear browser data</span>
                                    </li>
                                </ul>
                            </div>

                            {/* Call to Action */}
                            <div className="mt-5 text-center">
                                <div className="mb-4 py-4 px-6 bg-gradient-to-r from-red-500/20 via-orange-500/20 to-yellow-500/20 rounded-xl border border-red-500/30 backdrop-blur-sm">
                                    <p className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 text-lg font-black mb-2">
                                        ✨ Unlock the Full Experience
                                    </p>
                                    <p className="text-gray-300 text-sm">
                                        Create an account to sync your data and access all features
                                    </p>
                                </div>
                                <div className="flex justify-center gap-3">
                                    <button
                                        onClick={() => openAuthModal('signin')}
                                        className="px-6 py-3 bg-zinc-800/80 hover:bg-zinc-700 text-white text-sm font-medium rounded-lg transition-all duration-200 border border-zinc-700 hover:border-zinc-600 hover:scale-105"
                                    >
                                        Sign In
                                    </button>
                                    <button
                                        onClick={handleSignUp}
                                        className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-bold rounded-lg transition-all duration-200 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105"
                                    >
                                        Create Account
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl p-4 border border-orange-500/20">
                                <p className="text-orange-400 font-bold text-lg mb-1">
                                    🎯 Welcome to Net Trailers!
                                </p>
                                <p className="text-gray-400 text-sm">
                                    Here&apos;s how to get the most out of your experience:
                                </p>
                            </div>

                            <div className="space-y-3 text-gray-100">
                                <div className="flex items-start space-x-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                    <span className="text-orange-500 font-bold text-xl flex-shrink-0">
                                        •
                                    </span>
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
                                <div className="flex items-start space-x-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                    <span className="text-orange-500 font-bold text-xl flex-shrink-0">
                                        •
                                    </span>
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
                                <div className="flex items-start space-x-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                    <span className="text-orange-500 font-bold text-xl flex-shrink-0">
                                        •
                                    </span>
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
                                <div className="flex items-start space-x-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                    <span className="text-orange-500 font-bold text-xl flex-shrink-0">
                                        •
                                    </span>
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
                                <div className="flex items-start space-x-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                    <span className="text-orange-500 font-bold text-xl flex-shrink-0">
                                        •
                                    </span>
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
                                <div className="flex items-start space-x-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                                    <span className="text-orange-500 font-bold text-xl flex-shrink-0">
                                        •
                                    </span>
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

                            <div className="mt-5 p-4 bg-zinc-800/60 backdrop-blur-sm rounded-xl border border-orange-500/30">
                                <p className="text-gray-300 text-sm">
                                    <span className="font-semibold text-orange-400">
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
