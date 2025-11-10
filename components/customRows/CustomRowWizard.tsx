'use client'

import React, { useState } from 'react'
import { XMarkIcon, CheckIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline'
import { CustomRowFormData } from '../../types/customRows'
import { Content } from '../../typings'
import { WizardStep1Basic } from './WizardStep1Basic'
import { WizardStep2Advanced } from './WizardStep2Advanced'
import { WizardStep3NamePreview } from './WizardStep3NamePreview'
import { WizardStep4Confirmation } from './WizardStep4Confirmation'

interface CustomRowWizardProps {
    onClose: () => void
    onComplete: (data: CustomRowFormData) => Promise<void>
    isAuthenticated: boolean // Controls access to premium features
    onSignIn: () => void // Callback to open sign-in modal
    mode?: 'smart' | 'traditional'
    onModeChange?: (mode: 'smart' | 'traditional') => void
}

type WizardStep = 1 | 2 | 3 | 4

/**
 * CustomRowWizard Component
 *
 * Multi-step wizard for creating custom rows with:
 * - Step 1: Basic setup (media type, genres, logic)
 * - Step 2: Advanced filters (premium/auth only)
 * - Step 3: Name, AI generation, preview
 * - Step 4: Confirmation screen
 *
 * Users can skip to Step 3 with "Quick Create" or use advanced features.
 */
export function CustomRowWizard({
    onClose,
    onComplete,
    isAuthenticated,
    onSignIn,
    mode = 'traditional',
    onModeChange,
}: CustomRowWizardProps) {
    const [currentStep, setCurrentStep] = useState<WizardStep>(1)
    const [formData, setFormData] = useState<CustomRowFormData>({
        name: '',
        genres: [],
        genreLogic: 'AND',
        mediaType: 'movie',
        enabled: true,
        advancedFilters: {},
    })
    const [previewResults, setPreviewResults] = useState<Content[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [createdRowId, setCreatedRowId] = useState<string | null>(null)
    const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false)

    // Navigation
    const goToStep = (step: WizardStep) => {
        setCurrentStep(step)
    }

    const nextStep = () => {
        if (currentStep < 4) {
            setCurrentStep((prev) => (prev + 1) as WizardStep)
        }
    }

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep((prev) => (prev - 1) as WizardStep)
        }
    }

    // Update form data
    const updateFormData = (updates: Partial<CustomRowFormData>) => {
        setFormData((prev) => {
            const updated = { ...prev, ...updates }
            console.log('updateFormData - updating:', Object.keys(updates), 'new previewContent length:', updated.previewContent?.length || 0)
            return updated
        })
    }

    // Handle final creation
    const handleCreate = async () => {
        console.log('handleCreate - formData before onComplete:', {
            name: formData.name,
            genres: formData.genres,
            previewContentLength: formData.previewContent?.length || 0,
            hasPreviewContent: !!formData.previewContent,
        })
        setIsLoading(true)
        try {
            await onComplete(formData)
            // Move to confirmation step
            goToStep(4)
        } catch (error) {
            console.error('Error creating row:', error)
        } finally {
            setIsLoading(false)
        }
    }

    // Step validation
    const canProgressFromStep1 = formData.genres.length > 0 && formData.mediaType !== undefined
    const canProgressFromStep2 = true // Advanced filters are all optional
    const canProgressFromStep3 = formData.name.trim().length >= 3

    // Progress indicator
    const totalSteps = 4
    const currentStepNumber = currentStep

    const handleBackdropMouseDown = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            setMouseDownOnBackdrop(true)
        }
    }

    const handleBackdropClick = (e: React.MouseEvent) => {
        // Only close if both mousedown and mouseup happened on the backdrop
        if (e.target === e.currentTarget && mouseDownOnBackdrop) {
            onClose()
        }
        setMouseDownOnBackdrop(false)
    }

    return (
        <div className="fixed inset-0 z-[250] overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                onMouseDown={handleBackdropMouseDown}
                onClick={handleBackdropClick}
            />

            {/* Modal */}
            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div className="relative bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-lg shadow-2xl max-w-6xl w-full border border-gray-700">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-700">
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                <WrenchScrewdriverIcon className="w-6 h-6 text-blue-400" />
                                Collection Builder
                            </h2>
                            <p className="text-gray-400 text-sm mt-1">
                                Build your collection step by step
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Mode Toggle */}
                            {onModeChange && (
                                <div className="bg-gray-800 border border-gray-700 rounded-lg p-1 shadow-lg">
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => onModeChange('smart')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                                mode === 'smart'
                                                    ? 'bg-red-600 text-white'
                                                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                            }`}
                                        >
                                            ✨ Smart
                                        </button>
                                        <button
                                            onClick={() => onModeChange('traditional')}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                                mode === 'traditional'
                                                    ? 'bg-red-600 text-white'
                                                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                                            }`}
                                        >
                                            🔧 Traditional
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Close button */}
                            <button
                                type="button"
                                onClick={onClose}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Progress bar */}
                    {currentStep < 4 && (
                        <div className="px-6 pt-4 pb-2">
                            <div className="flex items-center gap-2">
                                {Array.from({ length: totalSteps }).map((_, index) => {
                                    const stepNumber = index + 1
                                    const isCompleted = stepNumber < currentStepNumber
                                    const isCurrent = stepNumber === currentStepNumber

                                    return (
                                        <React.Fragment key={index}>
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
                                                    stepNumber
                                                )}
                                            </div>
                                            {index < totalSteps - 1 && (
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
                                <span>Basic Setup</span>
                                <span>Advanced Filters</span>
                                <span>Name & Preview</span>
                            </div>
                        </div>
                    )}

                    {/* Step content */}
                    <div className="p-6 min-h-[600px]">
                        {currentStep === 1 && (
                            <WizardStep1Basic
                                formData={formData}
                                onChange={updateFormData}
                                onNext={nextStep}
                                canProgress={canProgressFromStep1}
                            />
                        )}

                        {currentStep === 2 && (
                            <WizardStep2Advanced
                                filters={formData.advancedFilters || {}}
                                onChange={(advancedFilters) => updateFormData({ advancedFilters })}
                                onBack={prevStep}
                                onContinue={nextStep}
                            />
                        )}

                        {currentStep === 3 && (
                            <WizardStep3NamePreview
                                formData={formData}
                                onChange={updateFormData}
                                onBack={prevStep}
                                onCreate={handleCreate}
                                isCreating={isLoading}
                                isAuthenticated={isAuthenticated}
                                onSignIn={onSignIn}
                            />
                        )}

                        {currentStep === 4 && (
                            <WizardStep4Confirmation
                                rowName={formData.name}
                                onViewHomepage={onClose}
                                onCreateAnother={() => {
                                    // Reset and start over
                                    setCurrentStep(1)
                                    setFormData({
                                        name: '',
                                        genres: [],
                                        genreLogic: 'AND',
                                        mediaType: 'movie',
                                        enabled: true,
                                        advancedFilters: {},
                                    })
                                }}
                                type="collection"
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
