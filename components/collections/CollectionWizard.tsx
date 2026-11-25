'use client'
import { uiLog } from '../../utils/debugLogger'

import React, { useState } from 'react'
import { CheckIcon } from '@heroicons/react/24/outline'
import BuilderHeader from './BuilderHeader'
import { CustomRowFormData } from '../../types/collections'
import { Content } from '../../typings'
import { WizardStep1Basic } from './WizardStep1Basic'
import { WizardStep2Advanced } from './WizardStep2Advanced'
import { WizardStep3NamePreview } from './WizardStep3NamePreview'
import { WizardStep4Confirmation } from './WizardStep4Confirmation'

interface CollectionWizardProps {
    onClose: () => void
    onComplete: (data: CustomRowFormData) => Promise<void>
    isAuthenticated: boolean // Controls access to premium features
    onSignIn: () => void // Callback to open sign-in modal
    mode?: 'smart' | 'traditional'
    onModeChange?: (mode: 'smart' | 'traditional') => void
}

type WizardStep = 1 | 2 | 3 | 4

/**
 * CollectionWizard Component
 *
 * Multi-step wizard for creating custom rows with:
 * - Step 1: Basic setup (media type, genres, logic)
 * - Step 2: Advanced filters (premium/auth only)
 * - Step 3: Name, AI generation, preview
 * - Step 4: Confirmation screen
 *
 * Users can skip to Step 3 with "Quick Create" or use advanced features.
 */
export function CollectionWizard({
    onClose,
    onComplete,
    isAuthenticated,
    onSignIn,
    mode = 'traditional',
    onModeChange,
}: CollectionWizardProps) {
    const [currentStep, setCurrentStep] = useState<WizardStep>(1)
    const [formData, setFormData] = useState<CustomRowFormData>({
        name: '',
        genres: [],
        genreLogic: 'AND',
        mediaType: 'movie',
        enabled: true,
        advancedFilters: {},
    })
    const [isLoading, setIsLoading] = useState(false)

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
            uiLog(
                'updateFormData - updating:',
                Object.keys(updates),
                'new previewContent length:',
                updated.previewContent?.length || 0
            )
            return updated
        })
    }

    // Handle final creation
    const handleCreate = async () => {
        uiLog('handleCreate - formData before onComplete:', {
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

    return (
        <>
            {/* Header */}
            <BuilderHeader
                mode={mode}
                onModeChange={onModeChange}
                onClose={onClose}
                subtitle="Pick genres and filters, then name it."
            />

            {/* Progress bar */}
            {currentStep < 4 && (
                <div className="px-5 pt-4 pb-2 sm:px-6">
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
                                                ? 'bg-brand-500 text-white'
                                                : isCurrent
                                                  ? 'bg-brand-500 text-white ring-4 ring-brand-500/30'
                                                  : 'bg-zinc-800 text-gray-400'
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
                                                isCompleted ? 'bg-brand-500' : 'bg-zinc-800'
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
            <div className="px-5 py-5 sm:px-6">
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
        </>
    )
}
