'use client'

import React from 'react'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { SparklesIcon } from '@heroicons/react/24/outline'

interface WizardStep4ConfirmationProps {
    rowName: string
    onViewHomepage: () => void
    onCreateAnother: () => void
    type?: 'row' | 'collection' // Type of item created
}

/**
 * WizardStep4Confirmation Component
 *
 * Final step of custom row/collection creation wizard.
 * Shows success message and provides next actions.
 */
export function WizardStep4Confirmation({
    rowName,
    onViewHomepage,
    onCreateAnother,
    type = 'row',
}: WizardStep4ConfirmationProps) {
    const itemType = type === 'collection' ? 'Collection' : 'Row'
    const itemTypeLower = type === 'collection' ? 'collection' : 'row'
    return (
        <div className="space-y-8">
            {/* Success Animation */}
            <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                    {/* Animated glow effect */}
                    <div className="absolute inset-0 bg-green-600 blur-3xl opacity-30 animate-pulse" />

                    {/* Success icon */}
                    <CheckCircleIcon className="relative w-24 h-24 text-green-500 animate-bounce" />
                </div>

                <h3 className="text-3xl font-bold text-white mb-3">
                    {itemType} Created Successfully!
                </h3>

                <p className="text-lg text-gray-300 mb-2">
                    Your {itemTypeLower}{' '}
                    <span className="text-red-400 font-semibold">"{rowName}"</span>
                </p>
                <p className="text-gray-400">is now live and ready to enjoy</p>
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-r from-red-600/10 to-pink-600/10 border border-red-500/30 rounded-lg p-6">
                <div className="flex items-start gap-3">
                    <SparklesIcon className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-2">
                        <h4 className="text-white font-semibold">What's Next?</h4>
                        <ul className="text-gray-300 text-sm space-y-1.5">
                            {type === 'collection' ? (
                                <>
                                    <li>
                                        • Your collection is ready to view in your Collections page
                                    </li>
                                    <li>• Add more content to it anytime</li>
                                    <li>• Share your collection with friends</li>
                                </>
                            ) : (
                                <>
                                    <li>• Your row will appear on your homepage</li>
                                    <li>
                                        • Content updates automatically as new titles are added to
                                        TMDB
                                    </li>
                                    <li>
                                        • You can edit or disable this row anytime from your
                                        settings
                                    </li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onViewHomepage}
                    className="flex-1 px-6 py-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-lg shadow-lg shadow-red-600/20"
                >
                    {type === 'collection' ? '📚 View Collections' : '🏠 View on Homepage'}
                </button>
                <button
                    type="button"
                    onClick={onCreateAnother}
                    className="px-6 py-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                    + Create Another
                </button>
            </div>

            {/* Subtle hint */}
            <p className="text-center text-gray-500 text-sm">
                Pro tip: Create multiple {type === 'collection' ? 'collections' : 'rows'} to
                organize your content library
            </p>
        </div>
    )
}
