'use client'

import React from 'react'
import { SparklesIcon } from '@heroicons/react/24/outline'
import { AdvancedFiltersSection } from './AdvancedFiltersSection'
import { AdvancedFilters } from '../../types/collections'

interface WizardStep2AdvancedProps {
    filters: AdvancedFilters
    onChange: (filters: AdvancedFilters) => void
    onBack: () => void
    onContinue: () => void
}

/**
 * WizardStep2Advanced Component
 *
 * Second step of collection builder wizard.
 * Wraps AdvancedFiltersSection with navigation and premium indicator.
 */
export function WizardStep2Advanced({
    filters,
    onChange,
    onBack,
    onContinue,
}: WizardStep2AdvancedProps) {
    const hasActiveFilters =
        filters.yearMin ||
        filters.yearMax ||
        filters.ratingMin !== undefined ||
        filters.ratingMax !== undefined ||
        (filters.withCast && filters.withCast.length > 0) ||
        filters.withDirector

    const clearAllFilters = () => {
        onChange({})
    }

    return (
        <div className="space-y-6">
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
                {hasActiveFilters && (
                    <button
                        type="button"
                        onClick={clearAllFilters}
                        className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                    >
                        Clear All Filters
                    </button>
                )}
                <button
                    type="button"
                    onClick={onContinue}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                    Next →
                </button>
            </div>
        </div>
    )
}
