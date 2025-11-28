import React, { useState } from 'react'
import {
    XMarkIcon,
    AcademicCapIcon,
    EyeSlashIcon,
    ShieldCheckIcon,
    MagnifyingGlassIcon,
    SparklesIcon,
    ChatBubbleLeftRightIcon,
    BellIcon,
    ShareIcon,
    TrophyIcon,
    MicrophoneIcon,
} from '@heroicons/react/24/outline'
import { HandThumbUpIcon, RectangleStackIcon } from '@heroicons/react/24/solid'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import { useModalStore } from '../../stores/modalStore'

interface TutorialModalProps {
    isOpen: boolean
    onClose: () => void
}

const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
    const { isGuest } = useAuthStatus()
    const { openAuthModal } = useModalStore()
    const [activeTab, setActiveTab] = useState<'basics' | 'advanced' | 'community'>('basics')

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
            <div className="relative w-full max-w-4xl px-8 pt-6 pb-6 overflow-hidden text-left transition-all transform bg-zinc-900/95 backdrop-blur-xl border border-orange-500/40 rounded-2xl shadow-2xl shadow-orange-500/20 max-h-[90vh] overflow-y-auto">
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
                        Your complete guide to discovering amazing content
                    </p>
                </div>

                {!isGuest && (
                    /* Tabs for authenticated users */
                    <div className="flex gap-2 mb-6 justify-center">
                        <button
                            onClick={() => setActiveTab('basics')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                activeTab === 'basics'
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                    : 'bg-zinc-800/60 text-gray-300 hover:bg-zinc-800'
                            }`}
                        >
                            Basics
                        </button>
                        <button
                            onClick={() => setActiveTab('advanced')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                activeTab === 'advanced'
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                    : 'bg-zinc-800/60 text-gray-300 hover:bg-zinc-800'
                            }`}
                        >
                            Advanced
                        </button>
                        <button
                            onClick={() => setActiveTab('community')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                activeTab === 'community'
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                    : 'bg-zinc-800/60 text-gray-300 hover:bg-zinc-800'
                            }`}
                        >
                            Community
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="text-base space-y-5">
                    {isGuest ? (
                        /* Guest Mode Content */
                        <>
                            <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl p-4 border border-orange-500/20">
                                <p className="text-orange-400 font-bold text-lg mb-1">
                                    🚀 Guest Mode Features
                                </p>
                                <p className="text-gray-400 text-sm">
                                    Explore without signing up - try these features:
                                </p>
                            </div>

                            <div className="space-y-2">
                                <FeatureItem
                                    icon={<HandThumbUpIcon className="w-5 h-5 text-white" />}
                                    title="Like & Dislike Content"
                                    description="Rate content to help build your personalized recommendations"
                                />
                                <FeatureItem
                                    icon={<EyeSlashIcon className="w-5 h-5 text-gray-400" />}
                                    title="Hide Unwanted Content"
                                    description="Hide content you're not interested in - won't appear in recommendations"
                                />
                                <FeatureItem
                                    icon={<RectangleStackIcon className="w-5 h-5 text-blue-400" />}
                                    title="Build Your Watchlist"
                                    description="Add movies and TV shows to watch later - saved locally on your device"
                                />
                                <FeatureItem
                                    icon={<MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />}
                                    title="Search with Filters"
                                    description="Use the search bar and apply genre, year, rating filters"
                                />
                                <FeatureItem
                                    icon={<SparklesIcon className="w-5 h-5 text-purple-400" />}
                                    title="Browse Personalized Content"
                                    description="Explore trending, top-rated, and AI-recommended content"
                                />
                            </div>

                            {/* Guest Mode Limitations */}
                            <div className="mt-5 p-5 bg-gradient-to-r from-orange-500/15 to-amber-500/15 rounded-xl border border-orange-400/40 backdrop-blur-sm">
                                <p className="text-white text-base font-bold mb-3 flex items-center gap-2">
                                    🔒 Guest Mode Limitations
                                </p>
                                <ul className="text-gray-200 text-sm space-y-2">
                                    <li className="flex items-start gap-2">
                                        <span className="text-orange-400 font-bold">✗</span>
                                        <span>Cannot create or share custom collections</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-orange-400 font-bold">✗</span>
                                        <span>
                                            Cannot create rankings or participate in community
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-orange-400 font-bold">✗</span>
                                        <span>Cannot use AI-powered smart search</span>
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
                        /* Authenticated User Content with Tabs */
                        <>
                            {activeTab === 'basics' && (
                                <>
                                    <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 rounded-xl p-4 border border-orange-500/20">
                                        <p className="text-orange-400 font-bold text-lg mb-1">
                                            🎯 Essential Features
                                        </p>
                                        <p className="text-gray-400 text-sm">
                                            Master these core features to get started:
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <FeatureItem
                                            icon={
                                                <HandThumbUpIcon className="w-5 h-5 text-white" />
                                            }
                                            title="Like & Dislike Content"
                                            description="Build your taste profile - liked content influences recommendations"
                                        />
                                        <FeatureItem
                                            icon={
                                                <EyeSlashIcon className="w-5 h-5 text-gray-400" />
                                            }
                                            title="Hide Content"
                                            description="Hide unwanted content - filtered from all recommendations"
                                        />
                                        <FeatureItem
                                            icon={
                                                <RectangleStackIcon className="w-5 h-5 text-blue-400" />
                                            }
                                            title="Create Collections"
                                            description="Organize content with custom collections - manual, AI-generated, or auto-updating"
                                        />
                                        <FeatureItem
                                            icon={
                                                <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                                            }
                                            title="Advanced Search"
                                            description="Filter by genre, year, rating, cast, director, and more"
                                        />
                                        <FeatureItem
                                            icon={
                                                <SparklesIcon className="w-5 h-5 text-purple-400" />
                                            }
                                            title="Personalized Recommendations"
                                            description="'For You' row updates based on your viewing habits and ratings"
                                        />
                                        <FeatureItem
                                            icon={
                                                <ShieldCheckIcon className="w-5 h-5 text-red-500" />
                                            }
                                            title="Child Safety Mode"
                                            description="Filter adult content with PIN protection for family-safe browsing"
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'advanced' && (
                                <>
                                    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-4 border border-purple-500/20">
                                        <p className="text-purple-400 font-bold text-lg mb-1">
                                            ⚡ Power User Features
                                        </p>
                                        <p className="text-gray-400 text-sm">
                                            Advanced tools for content discovery:
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <FeatureItem
                                            icon={
                                                <SparklesIcon className="w-5 h-5 text-blue-400" />
                                            }
                                            title="AI Smart Search"
                                            description="Natural language queries - try 'rainy day movies' or 'mind-bending thrillers'"
                                        />
                                        <FeatureItem
                                            icon={
                                                <MicrophoneIcon className="w-5 h-5 text-green-400" />
                                            }
                                            title="Voice Search"
                                            description="Use voice input for hands-free search and AI queries"
                                        />
                                        <FeatureItem
                                            icon={
                                                <RectangleStackIcon className="w-5 h-5 text-cyan-400" />
                                            }
                                            title="Auto-Updating Collections"
                                            description="Collections that refresh daily with new matching content"
                                        />
                                        <FeatureItem
                                            icon={<ShareIcon className="w-5 h-5 text-yellow-400" />}
                                            title="Share Collections"
                                            description="Generate shareable links to showcase your curated collections"
                                        />
                                        <FeatureItem
                                            icon={<BellIcon className="w-5 h-5 text-red-400" />}
                                            title="Notifications"
                                            description="Get notified when collections update or watchlist items release"
                                        />
                                        <FeatureItem
                                            icon={
                                                <svg
                                                    className="w-5 h-5 text-gray-400"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M13 10V3L4 14h7v7l9-11h-7z"
                                                    />
                                                </svg>
                                            }
                                            title="Keyboard Shortcuts"
                                            description="Press '?' to view all shortcuts for faster navigation"
                                        />
                                    </div>
                                </>
                            )}

                            {activeTab === 'community' && (
                                <>
                                    <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-xl p-4 border border-yellow-500/20">
                                        <p className="text-yellow-400 font-bold text-lg mb-1">
                                            👥 Community Features
                                        </p>
                                        <p className="text-gray-400 text-sm">
                                            Connect with other movie and TV enthusiasts:
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <FeatureItem
                                            icon={
                                                <TrophyIcon className="w-5 h-5 text-yellow-400" />
                                            }
                                            title="Create Rankings"
                                            description="Build and share top 10 lists - get likes and comments from the community"
                                        />
                                        <FeatureItem
                                            icon={
                                                <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-400" />
                                            }
                                            title="Discussion Forums"
                                            description="Start threads, join conversations about movies and TV shows"
                                        />
                                        <FeatureItem
                                            icon={
                                                <svg
                                                    className="w-5 h-5 text-purple-400"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                                                    />
                                                </svg>
                                            }
                                            title="Community Polls"
                                            description="Create and vote on polls - single or multiple choice with results"
                                        />
                                        <FeatureItem
                                            icon={
                                                <svg
                                                    className="w-5 h-5 text-green-400"
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
                                            }
                                            title="Public Profiles"
                                            description="View other users' rankings, collections, and forum activity"
                                        />
                                        <FeatureItem
                                            icon={
                                                <HandThumbUpIcon className="w-5 h-5 text-red-400" />
                                            }
                                            title="Like & Comment"
                                            description="Engage with rankings and forum posts - build community connections"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="mt-5 p-4 bg-zinc-800/60 backdrop-blur-sm rounded-xl border border-orange-500/30">
                                <p className="text-gray-300 text-sm">
                                    <span className="font-semibold text-orange-400">
                                        Portfolio project showcasing:
                                    </span>{' '}
                                    Next.js + TypeScript + Firebase + Real-time sync + AI
                                    Integration
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

// Helper component for feature items
const FeatureItem: React.FC<{
    icon: React.ReactNode
    title: string
    description: string
}> = ({ icon, title, description }) => (
    <div className="flex items-start space-x-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
        <span className="flex-shrink-0 mt-0.5">{icon}</span>
        <div>
            <p className="font-semibold text-base text-white flex items-center gap-2">{title}</p>
            <p className="text-sm text-gray-400 mt-1">{description}</p>
        </div>
    </div>
)

export default TutorialModal
