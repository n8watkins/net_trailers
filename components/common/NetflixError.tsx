'use client'

import React, { useEffect } from 'react'
import { ExclamationTriangleIcon, ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

interface Props {
    onRetry?: () => void
    showDemoMode?: boolean
    onDemoMode?: () => void
}

const NetflixError: React.FC<Props> = ({ onRetry, showDemoMode = false, onDemoMode }) => {
    const router = useRouter()

    // Prefetch home page for instant loading
    useEffect(() => {
        router.prefetch('/')
    }, [router])

    const handleRetry = () => {
        if (onRetry) {
            onRetry()
        } else {
            // Default: refresh the page
            window.location.reload()
        }
    }

    const handleGoHome = () => {
        router.push('/')
    }

    return (
        <div className="min-h-screen bg-[#141414] flex items-center justify-center px-4">
            <div className="text-center max-w-md mx-auto">
                {/* Netflix-style error icon */}
                <div className="flex justify-center mb-8">
                    <div className="relative">
                        <div className="w-24 h-24 bg-[#e50914] rounded-full flex items-center justify-center">
                            <ExclamationTriangleIcon className="w-12 h-12 text-white" />
                        </div>
                        {/* Subtle pulsing animation */}
                        <div className="absolute inset-0 w-24 h-24 bg-[#e50914] rounded-full animate-ping opacity-20"></div>
                    </div>
                </div>

                {/* Error message */}
                <h1 className="text-white text-3xl font-bold mb-4">Oops, something went wrong</h1>

                <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                    We&apos;re having trouble loading your movies right now. This usually happens
                    when our movie database isn&apos;t configured properly.
                </p>

                {/* Action buttons */}
                <div className="space-y-4">
                    {/* Retry button */}
                    <button
                        onClick={handleRetry}
                        className="w-full bg-[#e50914] hover:bg-[#b8070f] text-white font-semibold py-3 px-8 rounded transition-colors duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
                    >
                        <ArrowPathIcon className="w-5 h-5" />
                        <span>Refresh</span>
                    </button>

                    {/* Go to Home button */}
                    <button
                        onClick={handleGoHome}
                        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                        <HomeIcon className="w-5 h-5" />
                        <span>Go to Home</span>
                    </button>

                    {/* Demo mode button (optional) */}
                    {showDemoMode && onDemoMode && (
                        <button
                            onClick={onDemoMode}
                            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-8 rounded transition-colors duration-200"
                        >
                            Browse Demo Content
                        </button>
                    )}

                    {/* Help text */}
                    <p className="text-gray-500 text-sm mt-6">Error Code: TMDB_UNAVAILABLE</p>
                </div>
            </div>
        </div>
    )
}

export default NetflixError
