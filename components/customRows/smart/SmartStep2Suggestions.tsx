'use client'

import React, { useState, useEffect } from 'react'
import { CheckIcon } from '@heroicons/react/24/solid'
import type { Entity } from './SmartInput'
import type { Suggestion } from '@/utils/smartRowSuggestions'

interface SmartStep2SuggestionsProps {
    inputData: {
        entities: Entity[]
        rawText: string
        mediaType: 'movie' | 'tv' | 'both'
    }
    onBack: () => void
    onContinue: (data: { selectedSuggestions: Suggestion[]; selectedRowName: string }) => void
}

/**
 * SmartStep2Suggestions - Display TMDB-based suggestions
 *
 * Features:
 * - Instant rule-based suggestions
 * - Confidence scores
 * - Auto-select high-confidence suggestions
 * - Live result count
 * - Row name suggestions
 */
export function SmartStep2Suggestions({
    inputData,
    onBack,
    onContinue,
}: SmartStep2SuggestionsProps) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([])
    const [rowNames, setRowNames] = useState<string[]>([])
    const [insight, setInsight] = useState('')
    const [selected, setSelected] = useState<Set<number>>(new Set())
    const [isLoading, setIsLoading] = useState(true)
    const [selectedRowName, setSelectedRowName] = useState('')

    useEffect(() => {
        generateSuggestions()
    }, [])

    const generateSuggestions = async () => {
        setIsLoading(true)
        try {
            const response = await fetch('/api/smart-suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(inputData),
            })

            if (!response.ok) throw new Error('Failed to generate suggestions')

            const data = await response.json()
            setSuggestions(data.suggestions || [])
            setRowNames(data.rowNames || [])
            setInsight(data.insight || '')
            setSelectedRowName(data.rowNames[0] || '')

            // Auto-select high-confidence suggestions (90%+)
            const autoSelect = new Set<number>()
            data.suggestions.forEach((s: Suggestion, idx: number) => {
                if (s.confidence >= 90) {
                    autoSelect.add(idx)
                }
            })
            setSelected(autoSelect)
        } catch (error) {
            console.error('Suggestion generation error:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const toggleSuggestion = (index: number) => {
        const newSelected = new Set(selected)
        if (newSelected.has(index)) {
            newSelected.delete(index)
        } else {
            newSelected.add(index)
        }
        setSelected(newSelected)
    }

    const handleContinue = () => {
        const selectedSuggestions = Array.from(selected).map((idx) => suggestions[idx])
        onContinue({
            selectedSuggestions,
            selectedRowName,
        })
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mb-4"></div>
                <p className="text-white text-lg font-medium">Analyzing your selections...</p>
                <p className="text-gray-400 text-sm mt-2">Fetching filmography data from TMDB</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-2">Smart Suggestions</h3>
                {insight && <p className="text-gray-400 text-sm italic">💡 {insight}</p>}
            </div>

            {/* Suggestions List */}
            <div className="space-y-3">
                {suggestions.map((suggestion, index) => {
                    const isSelected = selected.has(index)
                    const isAutoSelected = suggestion.confidence >= 90
                    const isUserSelection = suggestion.source === 'user'

                    return (
                        <button
                            key={index}
                            onClick={() => toggleSuggestion(index)}
                            className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                                isSelected
                                    ? 'border-red-600 bg-red-600/20'
                                    : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                {/* Checkbox */}
                                <div
                                    className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                        isSelected ? 'border-red-600 bg-red-600' : 'border-gray-600'
                                    }`}
                                >
                                    {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-white font-medium">
                                            {formatSuggestionLabel(suggestion)}
                                        </span>
                                        {isUserSelection && (
                                            <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 text-xs rounded-full">
                                                Your Pick
                                            </span>
                                        )}
                                        {isAutoSelected && !isUserSelection && (
                                            <span className="px-2 py-0.5 bg-purple-600/20 text-purple-400 text-xs rounded-full">
                                                Recommended
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-gray-400 text-sm mb-2">
                                        {suggestion.reason}
                                    </p>

                                    {suggestion.estimatedResults && (
                                        <p className="text-gray-500 text-xs">
                                            ~{suggestion.estimatedResults} results
                                        </p>
                                    )}
                                </div>

                                {/* Confidence Score */}
                                <div className="text-right flex-shrink-0">
                                    <div
                                        className={`text-sm font-medium ${
                                            suggestion.confidence >= 90
                                                ? 'text-green-400'
                                                : suggestion.confidence >= 75
                                                  ? 'text-yellow-400'
                                                  : 'text-gray-400'
                                        }`}
                                    >
                                        {suggestion.confidence}%
                                    </div>
                                    <div className="text-xs text-gray-500">confidence</div>
                                </div>
                            </div>
                        </button>
                    )
                })}
            </div>

            {/* Row Name Suggestions */}
            {rowNames.length > 0 && (
                <div>
                    <label className="block text-sm font-medium text-gray-200 mb-3">
                        Suggested Row Names:
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                        {rowNames.map((name, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedRowName(name)}
                                className={`px-4 py-3 rounded-lg border-2 transition-all text-left ${
                                    selectedRowName === name
                                        ? 'border-red-600 bg-red-600/20 text-white'
                                        : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                                }`}
                            >
                                <span className="font-medium">{name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Summary */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                <p className="text-gray-300 text-sm">
                    <span className="font-medium text-white">{selected.size}</span> filter
                    {selected.size !== 1 ? 's' : ''} selected
                </p>
            </div>

            {/* Navigation */}
            <div className="flex gap-3 pt-4">
                <button
                    onClick={onBack}
                    className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                    ← Back
                </button>
                <button
                    onClick={handleContinue}
                    disabled={selected.size === 0}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                    Preview Row →
                </button>
            </div>
        </div>
    )
}

function formatSuggestionLabel(suggestion: Suggestion): string {
    switch (suggestion.type) {
        case 'genre':
            return `Genres: ${Array.isArray(suggestion.value) ? 'Multiple' : suggestion.value}`
        case 'rating': {
            const min = suggestion.value.min
            return `High Ratings (${min}+ stars)`
        }
        case 'actor':
        case 'director':
            return `${suggestion.type.charAt(0).toUpperCase() + suggestion.type.slice(1)}: ${suggestion.value}`
        case 'studio':
            return `Studio: ${suggestion.value}`
        case 'year_range': {
            const range = suggestion.value
            if (range.min && range.max) return `Years: ${range.min}-${range.max}`
            if (range.min) return `Since ${range.min}`
            if (range.max) return `Before ${range.max}`
            return 'Year Range'
        }
        case 'certification':
            return `Rating: ${Array.isArray(suggestion.value) ? suggestion.value.join(', ') : suggestion.value}`
        default:
            return String(suggestion.value)
    }
}
