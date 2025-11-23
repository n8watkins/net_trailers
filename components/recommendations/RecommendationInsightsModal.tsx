/**
 * Recommendation Insights Modal
 *
 * Displays brief information about how recommendations work,
 * with options to customize via quiz or disable in settings.
 */

'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { SparklesIcon, Cog6ToothIcon, AcademicCapIcon } from '@heroicons/react/24/solid'

interface RecommendationInsightsModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function RecommendationInsightsModal({
    isOpen,
    onClose,
}: RecommendationInsightsModalProps) {
    const router = useRouter()

    if (!isOpen) return null

    const handleGoToSettings = () => {
        onClose()
        router.push('/settings/preferences')
    }

    return (
        <div className="fixed inset-0 z-[50000] flex items-center justify-center p-4">
            {/* Background overlay */}
            <div
                className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
                onClick={onClose}
            />

            {/* Modal panel */}
            <div className="relative w-full max-w-md overflow-hidden transition-all transform bg-[#0a0a0a] border border-gray-700/50 rounded-lg shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700/50">
                    <div className="flex items-center gap-3">
                        <SparklesIcon className="w-6 h-6 text-yellow-400" />
                        <h2 className="text-xl font-bold text-white">Your Recommendations</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors duration-200 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/10"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Brief explanation */}
                    <p className="text-gray-300 text-sm leading-relaxed">
                        Recommendations are personalized based on content you&apos;ve liked and
                        added to your collections. The more you interact, the better your
                        recommendations become.
                    </p>

                    {/* Quiz Option */}
                    <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/50">
                        <div className="flex items-start gap-3">
                            <AcademicCapIcon className="w-6 h-6 text-purple-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="text-white font-semibold text-sm mb-1">
                                    Customize Recommendations
                                </h3>
                                <p className="text-gray-400 text-xs mb-3">
                                    Take a quick quiz to tell us what you like
                                </p>
                                <button
                                    disabled
                                    className="px-4 py-2 bg-purple-600/50 text-purple-200 rounded-lg text-sm font-medium cursor-not-allowed opacity-60"
                                >
                                    Coming Soon
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Settings Option */}
                    <div className="bg-gray-800/40 rounded-lg p-4 border border-gray-700/50">
                        <div className="flex items-start gap-3">
                            <Cog6ToothIcon className="w-6 h-6 text-gray-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="text-white font-semibold text-sm mb-1">
                                    Manage Settings
                                </h3>
                                <p className="text-gray-400 text-xs mb-3">
                                    Disable recommendations in your preferences
                                </p>
                                <button
                                    onClick={handleGoToSettings}
                                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                                >
                                    Go to Settings
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-800/30 border-t border-gray-700/50">
                    <button
                        onClick={onClose}
                        className="w-full px-6 py-3 bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 hover:bg-gray-600"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
