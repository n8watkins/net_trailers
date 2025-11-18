'use client'

import React, { useState } from 'react'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import { SmartStep1Input } from './SmartStep1Input'
import { SmartStep2Suggestions } from './SmartStep2Suggestions'
import { SmartStep3Preview } from './SmartStep3Preview'
import { WizardStep4Confirmation } from '../WizardStep4Confirmation'
import type { Suggestion } from '@/utils/smartRowSuggestions'
import type { CustomRowFormData } from '@/types/customRows'

interface SmartRowBuilderProps {
    onClose: () => void
    onComplete: (data: CustomRowFormData) => Promise<void>
    isAuthenticated: boolean
    onSignIn: () => void
}

type WizardStep = 1 | 2 | 3 | 4

/**
 * SmartRowBuilder - AI-powered custom row creation wizard
 *
 * Flow:
 * 1. Smart input (entities + text + media type)
 * 2. TMDB-based suggestions
 * 3. Preview & name (reuses traditional wizard step)
 * 4. Success confirmation
 */
export function SmartRowBuilder({
    onClose,
    onComplete,
    isAuthenticated,
    onSignIn,
}: SmartRowBuilderProps) {
    const [currentStep, setCurrentStep] = useState<WizardStep>(1)
    const [isLoading, setIsLoading] = useState(false)

    // Step 1 data
    const [step1Data, setStep1Data] = useState<{
        rawText: string
        mediaType: 'movie' | 'tv' | 'both'
    }>({
        rawText: '',
        mediaType: 'movie',
    })

    // Step 2 data (includes AI-inferred mediaType)
    const [step2Data, setStep2Data] = useState<{
        selectedSuggestions: Suggestion[]
        selectedRowName: string
        mediaType: 'movie' | 'tv' | 'both'
    }>({
        selectedSuggestions: [],
        selectedRowName: '',
        mediaType: 'both',
    })

    // Final form data
    const [formData, setFormData] = useState<CustomRowFormData>({
        name: '',
        genres: [],
        genreLogic: 'AND',
        mediaType: 'movie',
        enabled: true,
        advancedFilters: {},
    })

    const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 4) as WizardStep)
    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1) as WizardStep)

    // Step 1 → Step 2
    const handleStep1Complete = (data: typeof step1Data) => {
        setStep1Data(data)
        nextStep()
    }

    // Step 2 → Step 3
    const handleStep2Complete = (data: typeof step2Data) => {
        setStep2Data(data)

        // Convert suggestions to CustomRowFormData (use inferred mediaType)
        const convertedData = convertSuggestionsToFormData(
            { ...step1Data, mediaType: data.mediaType },
            data.selectedSuggestions,
            data.selectedRowName
        )
        setFormData(convertedData)

        nextStep()
    }

    // Step 3 → Step 4
    const handleStep3Create = async () => {
        setIsLoading(true)
        try {
            await onComplete(formData)
            nextStep()
        } catch (error) {
            console.error('Error creating row:', error)
        } finally {
            setIsLoading(false)
        }
    }

    // Reset for "Create Another"
    const handleCreateAnother = () => {
        setCurrentStep(1)
        setStep1Data({ rawText: '', mediaType: 'movie' })
        setStep2Data({ selectedSuggestions: [], selectedRowName: '', mediaType: 'movie' })
        setFormData({
            name: '',
            genres: [],
            genreLogic: 'AND',
            mediaType: 'movie',
            enabled: true,
            advancedFilters: {},
        })
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="relative bg-[#181818] rounded-lg shadow-2xl max-w-4xl w-full border border-gray-700">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-700">
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <span>✨</span>
                                Smart Row Builder
                            </h2>
                            <p className="text-gray-400 text-sm mt-1">
                                {currentStep === 1 && 'Describe what you want to watch'}
                                {currentStep === 2 && 'Review AI-powered suggestions'}
                                {currentStep === 3 && 'Preview and finalize your row'}
                                {currentStep === 4 && 'Your custom row is ready!'}
                            </p>
                        </div>

                        {/* Close button */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Progress bar */}
                    {currentStep < 4 && (
                        <div className="px-6 pt-4 pb-2">
                            <div className="flex items-center gap-2">
                                {[1, 2, 3].map((step) => {
                                    const isCompleted = step < currentStep
                                    const isCurrent = step === currentStep

                                    return (
                                        <React.Fragment key={step}>
                                            <div
                                                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all ${
                                                    isCompleted
                                                        ? 'bg-red-600 text-white'
                                                        : isCurrent
                                                          ? 'bg-red-600 text-white ring-4 ring-red-600/30'
                                                          : 'bg-gray-700 text-gray-400'
                                                }`}
                                            >
                                                {isCompleted ? (
                                                    <CheckIcon className="w-4 h-4" />
                                                ) : (
                                                    step
                                                )}
                                            </div>
                                            {step < 3 && (
                                                <div
                                                    className={`flex-1 h-1 rounded transition-all ${
                                                        isCompleted ? 'bg-red-600' : 'bg-gray-700'
                                                    }`}
                                                />
                                            )}
                                        </React.Fragment>
                                    )
                                })}
                            </div>
                            <div className="flex justify-between mt-2 text-xs text-gray-400">
                                <span>Input</span>
                                <span>Suggestions</span>
                                <span>Preview</span>
                            </div>
                        </div>
                    )}

                    {/* Step content */}
                    <div className="p-6">
                        {currentStep === 1 && (
                            <SmartStep1Input
                                onContinue={handleStep1Complete}
                                initialData={step1Data}
                            />
                        )}

                        {currentStep === 2 && (
                            <SmartStep2Suggestions
                                inputData={step1Data}
                                onBack={prevStep}
                                onContinue={handleStep2Complete}
                            />
                        )}

                        {currentStep === 3 && (
                            <SmartStep3Preview
                                key={JSON.stringify(step2Data.selectedSuggestions)} // Force re-mount when suggestions change
                                selectedSuggestions={step2Data.selectedSuggestions}
                                selectedRowName={step2Data.selectedRowName}
                                mediaType={step2Data.mediaType}
                                formData={formData}
                                onChange={(updates) => setFormData({ ...formData, ...updates })}
                                onBack={prevStep}
                                onCreate={handleStep3Create}
                                isCreating={isLoading}
                                isAuthenticated={isAuthenticated}
                                onSignIn={onSignIn}
                            />
                        )}

                        {currentStep === 4 && (
                            <WizardStep4Confirmation
                                rowName={formData.name}
                                onViewHomepage={onClose}
                                onCreateAnother={handleCreateAnother}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

/**
 * Convert suggestions to CustomRowFormData
 */
function convertSuggestionsToFormData(
    step1Data: { rawText: string; mediaType: 'movie' | 'tv' | 'both' },
    suggestions: Suggestion[],
    rowName: string
): CustomRowFormData {
    const formData: CustomRowFormData = {
        name: rowName,
        genres: [],
        genreLogic: 'OR', // Default to OR - Gemini will override to AND if certain
        mediaType: step1Data.mediaType,
        enabled: true,
        advancedFilters: {},
    }

    // Extract genres from suggestions
    const genreSuggestions = suggestions.filter((s) => s.type === 'genre')
    genreSuggestions.forEach((suggestion) => {
        if (Array.isArray(suggestion.value)) {
            formData.genres.push(...suggestion.value)
        } else {
            formData.genres.push(suggestion.value)
        }
    })

    // Remove duplicates
    formData.genres = Array.from(new Set(formData.genres))

    // Build advanced filters
    suggestions.forEach((suggestion) => {
        switch (suggestion.type) {
            case 'rating':
                if (suggestion.value.min) {
                    formData.advancedFilters!.ratingMin = suggestion.value.min
                }
                if (suggestion.value.max) {
                    formData.advancedFilters!.ratingMax = suggestion.value.max
                }
                break

            case 'year_range':
                if (suggestion.value.min) {
                    formData.advancedFilters!.yearMin = suggestion.value.min
                }
                if (suggestion.value.max) {
                    formData.advancedFilters!.yearMax = suggestion.value.max
                }
                break

            case 'director':
                formData.advancedFilters!.withDirector = String(suggestion.value)
                break

            case 'actor':
                if (!formData.advancedFilters!.withCast) {
                    formData.advancedFilters!.withCast = []
                }
                formData.advancedFilters!.withCast.push(String(suggestion.value))
                break

            case 'content_list':
                // Gemini-curated specific content IDs
                formData.advancedFilters!.contentIds = suggestion.value
                break
        }
    })

    return formData
}
