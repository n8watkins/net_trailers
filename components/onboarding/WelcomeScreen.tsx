import React, { useEffect, useRef } from 'react'
import {
    RocketLaunchIcon,
    BookOpenIcon,
    PlayCircleIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline'

interface WelcomeScreenProps {
    isOpen: boolean
    onClose: () => void
    onStartTour: () => void
    onBrowseFeatures: () => void
    onWatchDemo: () => void
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
    isOpen,
    onClose,
    onStartTour,
    onBrowseFeatures,
    onWatchDemo,
}) => {
    const modalRef = useRef<HTMLDivElement>(null)
    const firstButtonRef = useRef<HTMLButtonElement>(null)

    // Handle Escape key to close modal
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    // Focus first button when modal opens
    useEffect(() => {
        if (isOpen && firstButtonRef.current) {
            firstButtonRef.current.focus()
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 z-modal flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-title"
            aria-describedby="welcome-description"
            ref={modalRef}
        >
            {/* Enhanced Background overlay with atmospheric effect */}
            <div className="fixed inset-0">
                <div
                    className="absolute inset-0 bg-black/95 backdrop-blur-md"
                    onClick={onClose}
                    aria-label="Close welcome screen"
                />
                <div className="absolute inset-0 bg-gradient-radial from-orange-900/30 via-transparent to-transparent opacity-60 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-radial from-red-900/20 via-transparent to-transparent opacity-40 pointer-events-none" />
            </div>

            {/* Modal panel with cinematic styling */}
            <div className="relative w-full max-w-3xl px-8 pt-8 pb-6 overflow-hidden text-left transition-all transform bg-zinc-900/95 backdrop-blur-xl border border-orange-500/40 rounded-2xl shadow-2xl shadow-orange-500/20">
                {/* Animated background gradients */}
                <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/80 to-black -z-10" />
                <div
                    className="absolute inset-0 bg-gradient-to-t from-orange-900/20 via-red-900/10 to-black/50 animate-pulse -z-10"
                    style={{ animationDuration: '4s' }}
                />
                <div className="absolute inset-0 bg-gradient-radial from-orange-500/5 via-orange-900/5 to-transparent -z-10" />

                {/* Header */}
                <div className="relative mb-8">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        {/* Glowing welcome icon */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-orange-500/40 blur-2xl scale-150" />
                            <div className="relative text-6xl" role="img" aria-label="Movie camera">
                                🎬
                            </div>
                        </div>
                    </div>
                    <h1
                        id="welcome-title"
                        className="font-black text-4xl text-white text-center mb-2"
                    >
                        <span className="bg-gradient-to-r from-orange-200 via-red-100 to-orange-200 bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                            Welcome to Net Trailers!
                        </span>
                    </h1>
                    <p id="welcome-description" className="text-center text-gray-300 text-lg">
                        Choose your path to get started
                    </p>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Quick Start Option */}
                    <button
                        ref={firstButtonRef}
                        onClick={() => {
                            onStartTour()
                            onClose()
                        }}
                        className="group relative bg-zinc-800/60 backdrop-blur-lg border-2 border-orange-500/30 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:border-orange-500/60 hover:shadow-xl hover:shadow-orange-500/20"
                        aria-label="Quick Start: 60-second interactive tour (Recommended)"
                    >
                        {/* Hover glow effect */}
                        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 bg-orange-500 blur-xl transition-opacity duration-300 -z-10" />

                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-orange-500/30 blur-xl" />
                                <div className="relative w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                    <RocketLaunchIcon className="h-8 w-8 text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <h3 className="text-xl font-bold text-white mb-2 text-center">
                            Quick Start
                        </h3>
                        <p className="text-gray-400 text-sm text-center mb-3">
                            60-second interactive tour
                        </p>
                        <div className="text-orange-400 text-xs font-semibold text-center">
                            RECOMMENDED
                        </div>
                    </button>

                    {/* Browse Features Option */}
                    <button
                        onClick={() => {
                            onBrowseFeatures()
                            onClose()
                        }}
                        className="group relative bg-zinc-800/60 backdrop-blur-lg border-2 border-zinc-700/50 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:border-blue-500/60 hover:shadow-xl hover:shadow-blue-500/20"
                        aria-label="Browse Features: Explore at your own pace"
                    >
                        {/* Hover glow effect */}
                        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 bg-blue-500 blur-xl transition-opacity duration-300 -z-10" />

                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500/20 blur-xl" />
                                <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                    <BookOpenIcon className="h-8 w-8 text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <h3 className="text-xl font-bold text-white mb-2 text-center">
                            Browse Features
                        </h3>
                        <p className="text-gray-400 text-sm text-center mb-3">
                            Explore at your own pace
                        </p>
                        <div className="text-blue-400 text-xs font-semibold text-center">
                            SELF-GUIDED
                        </div>
                    </button>

                    {/* Watch Demo Option */}
                    <button
                        onClick={() => {
                            onWatchDemo()
                            onClose()
                        }}
                        className="group relative bg-zinc-800/60 backdrop-blur-lg border-2 border-zinc-700/50 rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:border-purple-500/60 hover:shadow-xl hover:shadow-purple-500/20"
                        aria-label="Watch Demo: 2-minute video walkthrough"
                    >
                        {/* Hover glow effect */}
                        <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 bg-purple-500 blur-xl transition-opacity duration-300 -z-10" />

                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="relative">
                                <div className="absolute inset-0 bg-purple-500/20 blur-xl" />
                                <div className="relative w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                                    <PlayCircleIcon className="h-8 w-8 text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <h3 className="text-xl font-bold text-white mb-2 text-center">
                            Watch Demo
                        </h3>
                        <p className="text-gray-400 text-sm text-center mb-3">
                            2-minute video walkthrough
                        </p>
                        <div className="text-purple-400 text-xs font-semibold text-center">
                            VISUAL
                        </div>
                    </button>
                </div>

                {/* Skip Button */}
                <div className="flex justify-center pt-4 border-t border-zinc-800/50">
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors duration-200 text-sm font-medium flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/5"
                    >
                        <XMarkIcon className="h-4 w-4" />
                        Skip - I know what I'm doing
                    </button>
                </div>
            </div>
        </div>
    )
}

export default WelcomeScreen
