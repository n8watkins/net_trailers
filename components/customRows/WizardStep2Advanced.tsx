'use client'

import React from 'react'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { AdvancedFiltersSection } from './AdvancedFiltersSection'
import { AdvancedFilters } from '../../types/customRows'

interface WizardStep2AdvancedProps {
    filters: AdvancedFilters
    onChange: (filters: AdvancedFilters) => void
    onBack: () => void
    onContinue: () => void
}

/**
 * WizardStep2Advanced Component
 *
 * Second step of custom row creation wizard (authenticated users only).
 * Wraps AdvancedFiltersSection with navigation and premium indicator.
 */
export function WizardStep2Advanced({
    filters,
    onChange,
    onBack,
    onContinue,
}: WizardStep2AdvancedProps) {
    return (
        <div className="space-y-6">
            {/* Premium Feature Indicator */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-red-600/10 to-pink-600/10 border border-red-500/30 rounded-lg">
                <SparklesIcon className="w-6 h-6 text-red-400 flex-shrink-0" />
                <div>
                    <h4 className="text-white font-medium">Advanced Filters</h4>
                    <p className="text-gray-300 text-sm">
                        Fine-tune your row with advanced filtering options
                    </p>
                </div>
            </div>

            {/* Advanced Filters Section */}
            <AdvancedFiltersSection filters={filters} onChange={onChange} />

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                    ← Back
                </button>
                <button
                    type="button"
                    onClick={onContinue}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                    Continue →
                </button>
            </div>
        </div>
    )
}
