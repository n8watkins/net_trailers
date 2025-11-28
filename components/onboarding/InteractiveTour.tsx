import React, { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CheckIcon,
} from '@heroicons/react/24/outline'
import { useOnboardingStore } from '../../stores/onboardingStore'
import { TOUR_STEPS, TOTAL_TOUR_STEPS, TourStep } from '../../constants/tourSteps'

interface InteractiveTourProps {
    isActive: boolean
    onComplete: () => void
    onSkip: () => void
}

/**
 * InteractiveTour component - Step-by-step guided tour with tooltips
 *
 * Features:
 * - Spotlight effect highlighting target elements
 * - Dynamic tooltip positioning
 * - Keyboard navigation (arrows, Escape)
 * - Progress tracking
 * - Smooth animations
 */
const InteractiveTour: React.FC<InteractiveTourProps> = ({ isActive, onComplete, onSkip }) => {
    const { currentTourStep, setCurrentTourStep } = useOnboardingStore()
    const [targetElement, setTargetElement] = useState<HTMLElement | null>(null)
    const [tooltipPosition, setTooltipPosition] = useState<{
        top: number
        left: number
    } | null>(null)
    const [mounted, setMounted] = useState(false)
    const tooltipRef = useRef<HTMLDivElement>(null)

    const currentStep = TOUR_STEPS[currentTourStep]
    const isFirstStep = currentTourStep === 0
    const isLastStep = currentTourStep === TOTAL_TOUR_STEPS - 1

    // Mount detection for portal
    useEffect(() => {
        setMounted(true)
        return () => setMounted(false)
    }, [])

    // Find and track target element
    useEffect(() => {
        if (!isActive || !currentStep) return

        const findTarget = () => {
            // For 'body' selector or center position, use null (centered tooltip)
            if (currentStep.targetSelector === 'body' || currentStep.position === 'center') {
                setTargetElement(null)
                setTooltipPosition(null)
                return
            }

            // Handle multiple selectors (comma-separated)
            const selectors = currentStep.targetSelector.split(',').map((s) => s.trim())

            for (const selector of selectors) {
                const element = document.querySelector(selector) as HTMLElement
                if (element) {
                    setTargetElement(element)
                    return
                }
            }

            // Target not found - fall back to center
            console.warn(`[Tour] Target element not found: ${currentStep.targetSelector}`)
            setTargetElement(null)
            setTooltipPosition(null)
        }

        // Initial find
        findTarget()

        // Re-find on DOM changes (for dynamically rendered elements)
        const observer = new MutationObserver(findTarget)
        observer.observe(document.body, {
            childList: true,
            subtree: true,
        })

        return () => observer.disconnect()
    }, [isActive, currentStep])

    // Calculate tooltip position relative to target
    useEffect(() => {
        if (!targetElement || !tooltipRef.current || !currentStep) return

        const calculatePosition = () => {
            const targetRect = targetElement.getBoundingClientRect()
            const tooltipRect = tooltipRef.current!.getBoundingClientRect()
            const padding = 16 // Gap between target and tooltip
            const viewportPadding = 20 // Minimum distance from viewport edges

            let top = 0
            let left = 0

            switch (currentStep.position) {
                case 'top':
                    top = targetRect.top - tooltipRect.height - padding
                    left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
                    break
                case 'bottom':
                    top = targetRect.bottom + padding
                    left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2
                    break
                case 'left':
                    top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2
                    left = targetRect.left - tooltipRect.width - padding
                    break
                case 'right':
                    top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2
                    left = targetRect.right + padding
                    break
                default:
                    // Center of viewport
                    top = window.innerHeight / 2 - tooltipRect.height / 2
                    left = window.innerWidth / 2 - tooltipRect.width / 2
            }

            // Keep tooltip within viewport bounds
            top = Math.max(
                viewportPadding,
                Math.min(top, window.innerHeight - tooltipRect.height - viewportPadding)
            )
            left = Math.max(
                viewportPadding,
                Math.min(left, window.innerWidth - tooltipRect.width - viewportPadding)
            )

            setTooltipPosition({ top, left })
        }

        calculatePosition()

        // Recalculate on window resize/scroll
        window.addEventListener('resize', calculatePosition)
        window.addEventListener('scroll', calculatePosition, true)

        return () => {
            window.removeEventListener('resize', calculatePosition)
            window.removeEventListener('scroll', calculatePosition, true)
        }
    }, [targetElement, currentStep])

    // Keyboard navigation
    useEffect(() => {
        if (!isActive) return

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'Escape':
                    onSkip()
                    break
                case 'ArrowRight':
                case 'ArrowDown':
                    if (!isLastStep) {
                        handleNext()
                    }
                    break
                case 'ArrowLeft':
                case 'ArrowUp':
                    if (!isFirstStep) {
                        handlePrevious()
                    }
                    break
                case 'Enter':
                    if (isLastStep) {
                        handleFinish()
                    } else {
                        handleNext()
                    }
                    break
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isActive, currentTourStep, isLastStep, isFirstStep])

    const handleNext = useCallback(() => {
        if (currentTourStep < TOTAL_TOUR_STEPS - 1) {
            setCurrentTourStep(currentTourStep + 1)
        }
    }, [currentTourStep, setCurrentTourStep])

    const handlePrevious = useCallback(() => {
        if (currentTourStep > 0) {
            setCurrentTourStep(currentTourStep - 1)
        }
    }, [currentTourStep, setCurrentTourStep])

    const handleFinish = useCallback(() => {
        onComplete()
    }, [onComplete])

    if (!isActive || !currentStep || !mounted) return null

    // Calculate spotlight dimensions
    const spotlightStyle: React.CSSProperties = targetElement
        ? (() => {
              const rect = targetElement.getBoundingClientRect()
              const padding = currentStep.spotlightPadding ?? 8
              return {
                  position: 'fixed',
                  top: rect.top - padding,
                  left: rect.left - padding,
                  width: rect.width + padding * 2,
                  height: rect.height + padding * 2,
                  borderRadius: '8px',
                  pointerEvents: 'none',
                  zIndex: 9998,
              }
          })()
        : {}

    const tooltipStyle: React.CSSProperties = tooltipPosition
        ? {
              position: 'fixed',
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              zIndex: 9999,
          }
        : {
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999,
          }

    return createPortal(
        <div className="tour-overlay" role="dialog" aria-modal="true" aria-labelledby="tour-title">
            {/* Backdrop with spotlight cutout effect */}
            <div className="fixed inset-0 z-[9997]">
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

                {/* Spotlight highlight */}
                {targetElement && (
                    <div style={spotlightStyle}>
                        <div className="absolute inset-0 rounded-lg ring-4 ring-orange-500/60 ring-offset-4 ring-offset-black/50 animate-pulse" />
                    </div>
                )}
            </div>

            {/* Tooltip card */}
            <div
                ref={tooltipRef}
                style={tooltipStyle}
                className="w-full max-w-md bg-zinc-900/98 backdrop-blur-xl border-2 border-orange-500/40 rounded-2xl shadow-2xl shadow-orange-500/20 p-6 animate-fade-in"
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                        <h2 id="tour-title" className="text-xl font-bold text-white mb-1">
                            {currentStep.title}
                        </h2>
                        <p className="text-sm text-gray-400">
                            Step {currentTourStep + 1} of {TOTAL_TOUR_STEPS}
                        </p>
                    </div>
                    {currentStep.skippable !== false && (
                        <button
                            onClick={onSkip}
                            className="ml-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                            aria-label="Skip tour"
                        >
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-zinc-800 rounded-full mb-4 overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-600 transition-all duration-300 ease-out"
                        style={{
                            width: `${((currentTourStep + 1) / TOTAL_TOUR_STEPS) * 100}%`,
                        }}
                    />
                </div>

                {/* Content */}
                <p className="text-gray-300 text-base leading-relaxed mb-6">
                    {currentStep.description}
                </p>

                {/* Action hint */}
                {currentStep.action && (
                    <div className="mb-6 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                        <p className="text-sm text-orange-300">
                            💡 Try it:{' '}
                            <span className="font-medium capitalize">{currentStep.action}</span> the
                            highlighted element
                        </p>
                    </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between gap-3">
                    <button
                        onClick={handlePrevious}
                        disabled={isFirstStep}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-white/5"
                    >
                        <ChevronLeftIcon className="h-4 w-4" />
                        Previous
                    </button>

                    <div className="flex gap-2">
                        {currentStep.skippable !== false && (
                            <button
                                onClick={onSkip}
                                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                            >
                                Skip Tour
                            </button>
                        )}
                        {isLastStep ? (
                            <button
                                onClick={handleFinish}
                                className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all shadow-lg hover:shadow-orange-500/50"
                            >
                                <CheckIcon className="h-4 w-4" />
                                Finish
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 rounded-lg hover:from-orange-600 hover:to-red-700 transition-all shadow-lg hover:shadow-orange-500/50"
                            >
                                Next
                                <ChevronRightIcon className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Keyboard hints */}
                <div className="mt-4 pt-4 border-t border-zinc-800">
                    <p className="text-xs text-gray-500 text-center">
                        Use arrow keys to navigate • Press ESC to skip
                    </p>
                </div>
            </div>
        </div>,
        document.body
    )
}

export default InteractiveTour
