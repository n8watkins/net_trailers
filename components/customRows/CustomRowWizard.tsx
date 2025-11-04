'use client'

import React, { useState } from 'react'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import { CustomRowFormData, AdvancedFilters } from '../../types/customRows'
import { Content } from '../../types/content'

interface CustomRowWizardProps {
    onClose: () => void
    onComplete: (data: CustomRowFormData) => Promise<void>
    isAuthenticated: boolean // Controls access to premium features
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
export function CustomRowWizard({ onClose, onComplete, isAuthenticated }: CustomRowWizardProps) {
    const [currentStep, setCurrentStep] = useState<WizardStep>(1)
    const [useAdvancedFilters, setUseAdvancedFilters] = useState(false)
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
            // If going back from step 3 and we used advanced, go to step 2
            if (currentStep === 3 && useAdvancedFilters) {
                setCurrentStep(2)
            } else {
                setCurrentStep((prev) => (prev - 1) as WizardStep)
            }
        }
    }

    // Quick create - skip advanced and go to name/preview
    const handleQuickCreate = () => {
        setUseAdvancedFilters(false)
        setFormData({ ...formData, advancedFilters: {} })
        goToStep(3)
    }

    // Use advanced features - go to step 2
    const handleUseAdvanced = () => {
        if (!isAuthenticated) {
            // Show sign-in modal (will be handled by parent)
            return
        }
        setUseAdvancedFilters(true)
        goToStep(2)
    }

    // Update form data
    const updateFormData = (updates: Partial<CustomRowFormData>) => {
        setFormData({ ...formData, ...updates })
    }

    // Handle final creation
    const handleCreate = async () => {
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
    const totalSteps = useAdvancedFilters ? 4 : 3 // Skip step 2 if quick create
    const currentStepNumber =
        currentStep === 4
            ? totalSteps
            : currentStep > 2 && !useAdvancedFilters
              ? currentStep - 1
              : currentStep

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
                            <h2 className="text-2xl font-bold text-white">Create Custom Row</h2>
                            <p className="text-gray-400 text-sm mt-1">
                                {currentStep === 1 && 'Choose your media type and genres'}
                                {currentStep === 2 && 'Fine-tune with advanced filters'}
                                {currentStep === 3 && 'Name your row and preview content'}
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
                                {useAdvancedFilters && <span>Advanced Filters</span>}
                                <span>Name & Preview</span>
                            </div>
                        </div>
                    )}

                    {/* Step content */}
                    <div className="p-6">
                        {currentStep === 1 && (
                            <div>
                                <p className="text-gray-300">Step 1: Basic setup goes here</p>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={handleQuickCreate}
                                        disabled={!canProgressFromStep1}
                                        className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Quick Create
                                    </button>
                                    <button
                                        onClick={handleUseAdvanced}
                                        disabled={!canProgressFromStep1}
                                        className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Use Advanced Features
                                    </button>
                                </div>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div>
                                <p className="text-gray-300">Step 2: Advanced filters go here</p>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={prevStep}
                                        className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={nextStep}
                                        className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        Continue
                                    </button>
                                </div>
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div>
                                <p className="text-gray-300">Step 3: Name and preview go here</p>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={prevStep}
                                        className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={!canProgressFromStep3 || isLoading}
                                        className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLoading ? 'Creating...' : 'Create Row'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {currentStep === 4 && (
                            <div>
                                <p className="text-gray-300">Step 4: Confirmation goes here</p>
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={onClose}
                                        className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        View on Homepage
                                    </button>
                                    <button
                                        onClick={() => {
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
                                            setUseAdvancedFilters(false)
                                        }}
                                        className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                                    >
                                        Create Another
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
