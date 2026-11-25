'use client'

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    CheckIcon,
} from '@heroicons/react/24/outline'
import {
    buildTourSteps,
    getPanePosition,
    TOTAL_TOUR_STEPS,
    TOUR,
    type TourEnvironment,
} from '../../constants/tourSteps'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import {
    computeTourLayout,
    findTourTarget,
    revealTourTarget,
    sameLayout,
    type TourLayout,
} from './tourLayout'

const Z_INDEX_OVERLAY = 9997
const Z_INDEX_TOOLTIP = 9999
/** How long a step keeps looking for an element that is not rendered yet. */
const TARGET_RETRY_MS = 100
const TARGET_RETRIES = 15

const CENTERED: TourLayout = { spotlight: null, card: null }

interface InteractiveTourProps {
    onComplete: () => void
    onSkip: () => void
}

function readEnvironment(isGuest: boolean): TourEnvironment {
    const canHover =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(hover: hover) and (pointer: fine)').matches
    // Mirrors hooks/useKeyboardShortcuts.ts: shortcuts are off on touch and below lg
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const hasShortcuts = !isTouchDevice && window.innerWidth >= 1024
    return { isGuest, canHover, hasShortcuts }
}

/** Visitor details that pick the copy and targets, kept current on resize. */
function useTourEnvironment(): TourEnvironment {
    const { isGuest } = useAuthStatus()
    const [env, setEnv] = useState(() => readEnvironment(isGuest))
    useEffect(() => {
        const update = () =>
            setEnv((prev) => {
                const next = readEnvironment(isGuest)
                return prev.isGuest === next.isGuest &&
                    prev.canHover === next.canHover &&
                    prev.hasShortcuts === next.hasShortcuts
                    ? prev
                    : next
            })
        update()
        window.addEventListener('resize', update)
        return () => window.removeEventListener('resize', update)
    }, [isGuest])
    return env
}

function isEditable(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLElement &&
        (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
    )
}

/**
 * Step-by-step guided tour of the home page.
 *
 * - The highlighted element is found once per step (first visible candidate,
 *   with a short bounded retry), scrolled into view once, and then followed
 *   every animation frame, so the highlight and card stay on it while the page
 *   scrolls or its layout shifts.
 * - A step whose element is missing or has no size shows its card centered, so
 *   the page is never dimmed without a visible card.
 * - The card takes focus (Tab stays inside it); Escape skips and the arrow keys
 *   move between steps. Enter is left to the focused button.
 */
const InteractiveTour: React.FC<InteractiveTourProps> = ({ onComplete, onSkip }) => {
    const env = useTourEnvironment()
    const steps = useMemo(() => buildTourSteps(env), [env])
    const [stepIndex, setStepIndex] = useState(0)
    const [target, setTarget] = useState<{ stepId: string; el: HTMLElement } | null>(null)
    const [layout, setLayout] = useState<TourLayout>(CENTERED)
    const [mounted, setMounted] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)
    const primaryRef = useRef<HTMLButtonElement>(null)
    const overlayRef = useRef<HTMLDivElement>(null)

    const step = steps[stepIndex]
    const isFirstStep = stepIndex === 0
    const isLastStep = stepIndex === TOTAL_TOUR_STEPS - 1
    const panePosition = getPanePosition(stepIndex)
    const feature = panePosition.featureIndex >= 0 ? TOUR.features[panePosition.featureIndex] : null
    const targetEl = target && target.stepId === step.id ? target.el : null
    const anchored = !!targetEl && !!layout.card

    useEffect(() => setMounted(true), [])

    useFocusTrap(cardRef, mounted)

    // Lock page scrolling while the tour runs: the body lock, plus wheel and
    // touch moves on the overlay itself, whichever element ends up scrolling
    useEffect(() => {
        const original = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = original
        }
    }, [])
    useEffect(() => {
        const overlay = overlayRef.current
        if (!overlay) return
        const block = (event: Event) => event.preventDefault()
        overlay.addEventListener('wheel', block, { passive: false })
        overlay.addEventListener('touchmove', block, { passive: false })
        return () => {
            overlay.removeEventListener('wheel', block)
            overlay.removeEventListener('touchmove', block)
        }
    }, [mounted])

    // Find this step's element once, retrying briefly while it renders; scroll it into view once
    useLayoutEffect(() => {
        if (step.targets.length === 0) {
            setTarget(null)
            return
        }
        let tries = 0
        let timer: ReturnType<typeof setTimeout> | undefined
        const attempt = () => {
            const el = findTourTarget(step.targets)
            if (el) {
                setTarget({ stepId: step.id, el })
                revealTourTarget(el, step.spotlightPadding)
                return
            }
            if (process.env.NODE_ENV === 'development' && tries === 0) {
                console.warn(`[Tour] Target not visible yet: ${step.targets.join(', ')}`)
            }
            if (++tries < TARGET_RETRIES) timer = setTimeout(attempt, TARGET_RETRY_MS)
        }
        attempt()
        return () => clearTimeout(timer)
    }, [step.id, step.targets, step.spotlightPadding])

    // Follow the element every frame (scrolling, layout shifts, resizes)
    useEffect(() => {
        if (!targetEl) {
            setLayout(CENTERED)
            return
        }
        let frame = 0
        const measure = () => {
            frame = requestAnimationFrame(measure)
            if (!targetEl.isConnected) {
                // The row re-rendered: look the element up again
                setTarget(null)
                const el = findTourTarget(step.targets)
                if (el) setTarget({ stepId: step.id, el })
                return
            }
            const rect = targetEl.getBoundingClientRect()
            const next =
                rect.width < 1 || rect.height < 1
                    ? CENTERED
                    : computeTourLayout({
                          target: {
                              top: rect.top,
                              left: rect.left,
                              width: rect.width,
                              height: rect.height,
                          },
                          cardHeight: cardRef.current?.offsetHeight ?? 0,
                          viewport: {
                              width: document.documentElement.clientWidth || window.innerWidth,
                              height: window.innerHeight,
                          },
                          position: step.position,
                          spotlightPadding: step.spotlightPadding,
                      })
            setLayout((prev) => (sameLayout(prev, next) ? prev : next))
        }
        measure()
        return () => cancelAnimationFrame(frame)
    }, [targetEl, step.id, step.targets, step.position, step.spotlightPadding])

    const handleNext = useCallback(() => {
        setStepIndex((i) => Math.min(i + 1, TOTAL_TOUR_STEPS - 1))
    }, [])
    const handlePrevious = useCallback(() => {
        setStepIndex((i) => Math.max(i - 1, 0))
    }, [])

    // Each step puts focus on its main button, so Enter and Space act on it once
    useEffect(() => {
        if (!mounted) return
        primaryRef.current?.focus({ preventScroll: true })
    }, [stepIndex, mounted])

    // Escape skips; arrows move between steps. Enter is handled by the focused button.
    // Captured on window so the tour, the top layer, gets these keys before page
    // handlers (carousel arrows, other Escape listeners) can act on or swallow them.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isEditable(e.target)) return
            const action =
                e.key === 'Escape'
                    ? onSkip
                    : e.key === 'ArrowRight' || e.key === 'ArrowDown'
                      ? handleNext
                      : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
                        ? handlePrevious
                        : null
            if (!action) return
            e.preventDefault()
            e.stopPropagation()
            action()
        }
        window.addEventListener('keydown', handleKeyDown, true)
        return () => window.removeEventListener('keydown', handleKeyDown, true)
    }, [handleNext, handlePrevious, onSkip])

    if (!mounted || !step) return null

    const progressLabel = panePosition.isWelcome
        ? 'Welcome'
        : panePosition.isComplete
          ? 'Tour complete'
          : feature
            ? `${feature.name} • ${panePosition.paneIndexInFeature + 1} of ${feature.panes.length}`
            : null

    const spot = anchored ? layout.spotlight : null
    const cardBox = anchored ? layout.card : null

    const card = (
        <div
            ref={cardRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
            aria-describedby="tour-description"
            data-testid="tour-card"
            data-placement={cardBox ? 'anchored' : 'centered'}
            className={`pointer-events-auto relative overflow-hidden rounded-2xl border border-zinc-700 bg-[#0d0d0f] shadow-2xl shadow-black/60 outline-none ${
                cardBox ? 'p-5 sm:p-6' : 'w-[min(36rem,calc(100vw-32px))] p-5 sm:p-8'
            }`}
            style={
                cardBox
                    ? {
                          position: 'fixed',
                          top: cardBox.top,
                          left: cardBox.left,
                          width: cardBox.width,
                          zIndex: Z_INDEX_TOOLTIP,
                      }
                    : undefined
            }
        >
            <div key={stepIndex} className="animate-tour-pane-change">
                <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                        <h2
                            id="tour-title"
                            className={`font-bold text-white ${cardBox ? 'text-xl' : 'text-2xl sm:text-3xl'}`}
                        >
                            {step.title}
                        </h2>
                        {progressLabel && (
                            <p className="mt-1 text-sm text-gray-400">{progressLabel}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onSkip}
                        aria-label="Close tour"
                        className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                    >
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                </div>

                <div
                    className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800"
                    role="progressbar"
                    aria-label="Tour progress"
                    aria-valuemin={1}
                    aria-valuemax={TOTAL_TOUR_STEPS}
                    aria-valuenow={stepIndex + 1}
                >
                    <div
                        className="h-full rounded-full bg-brand-500 transition-[width] duration-300 ease-out"
                        style={{ width: `${((stepIndex + 1) / TOTAL_TOUR_STEPS) * 100}%` }}
                    />
                </div>

                <p
                    id="tour-description"
                    className={`mt-4 leading-relaxed text-gray-300 [text-wrap:pretty] ${cardBox ? 'text-base' : 'text-base sm:text-lg'}`}
                >
                    {step.description}
                </p>

                <div className="mt-6 flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={handlePrevious}
                        disabled={isFirstStep}
                        className="-ml-2 flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                    >
                        <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
                        Previous
                    </button>
                    <div className="flex items-center gap-1 sm:gap-2">
                        {!isLastStep && (
                            <button
                                type="button"
                                onClick={onSkip}
                                className="flex h-10 items-center rounded-lg px-3 text-sm font-medium text-gray-400 transition-colors hover:bg-white/5 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                            >
                                Skip tour
                            </button>
                        )}
                        <button
                            ref={primaryRef}
                            type="button"
                            onClick={isLastStep ? onComplete : handleNext}
                            className="flex h-10 items-center gap-1.5 rounded-lg bg-brand-500 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d0d0f]"
                        >
                            {isLastStep ? (
                                <>
                                    <CheckIcon className="h-4 w-4" aria-hidden="true" />
                                    Finish
                                </>
                            ) : (
                                <>
                                    Next
                                    <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {env.canHover && (
                    <p className="mt-4 border-t border-zinc-800 pt-4 text-center text-xs text-gray-500">
                        Use the arrow keys to move between steps • Esc to skip
                    </p>
                )}
            </div>
        </div>
    )

    return createPortal(
        <div ref={overlayRef} className="tour-overlay" data-testid="tour-overlay">
            {/* Dims the page and blocks clicks; the spotlight is a hole drawn by its shadow */}
            <div
                className={`fixed inset-0 cursor-default ${spot ? '' : 'bg-black/60'}`}
                style={{ zIndex: Z_INDEX_OVERLAY }}
                aria-hidden="true"
            />
            {spot && (
                <div
                    data-testid="tour-spotlight"
                    aria-hidden="true"
                    className="pointer-events-none fixed rounded-xl"
                    style={{
                        top: spot.top,
                        left: spot.left,
                        width: spot.width,
                        height: spot.height,
                        zIndex: Z_INDEX_OVERLAY,
                        // Inset brand ring, red glow, then the dim around the hole
                        boxShadow:
                            'inset 0 0 0 2px rgb(229, 9, 20), 0 0 24px 4px rgba(229, 9, 20, 0.55), 0 0 0 9999px rgba(0, 0, 0, 0.6)',
                    }}
                />
            )}
            {/* One wrapper for both placements, so the card (and its focus) survives the switch */}
            <div
                className="pointer-events-none fixed inset-0 flex items-center justify-center p-4"
                style={{ zIndex: Z_INDEX_TOOLTIP }}
            >
                {card}
            </div>
        </div>,
        document.body
    )
}

export default InteractiveTour
