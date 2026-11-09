'use client'

import React, { useState, useRef, useCallback, useMemo } from 'react'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { usePageViewTracking } from '../../hooks/useActivityTracking'
import KeyboardShortcutsModal from '../modals/KeyboardShortcutsModal'
import TutorialModal from '../modals/TutorialModal'
import InteractiveTour from '../onboarding/InteractiveTour'
import Footer from './Footer'
import AboutModal from '../modals/AboutModal'
import ScrollToTopButton from '../common/ScrollToTopButton'
import CustomScrollbar from '../common/CustomScrollbar'
import { useModalStore } from '../../stores/modalStore'
import { LayoutProvider } from '../../contexts/LayoutContext'
import { useOnboardingStore } from '../../stores/onboardingStore'
import { useOnboardingPersistence } from '../../hooks/useOnboardingPersistence'
import { useToast } from '../../hooks/useToast'

interface ClientLayoutProps {
    children: React.ReactNode
}

/**
 * ClientLayout provides the shell around all pages in the App Router.
 * It manages:
 * - Footer
 * - Global modals (About, Tutorial, Keyboard Shortcuts), opened only on request
 * - Scroll to top button
 * - Global keyboard shortcuts
 * - Onboarding persistence
 *
 * This component runs on the client and wraps all page content.
 */
function ClientLayout({ children }: ClientLayoutProps) {
    const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
    const [showAboutModal, setShowAboutModal] = useState(false)
    const [showTutorial, setShowTutorial] = useState(false)
    const [isTourActive, setIsTourActive] = useState(false)
    const { modal } = useModalStore()
    const isModalOpen = modal.isOpen
    const searchInputRef = useRef<HTMLInputElement>(null)
    const { completeTour, skipTour, setCurrentTourStep } = useOnboardingStore()
    const { showSuccess } = useToast()

    // Enable onboarding persistence
    useOnboardingPersistence()

    const handleOpenShortcuts = useCallback(() => {
        setShowKeyboardShortcuts(!showKeyboardShortcuts)
    }, [showKeyboardShortcuts])

    const handleOpenAboutModal = useCallback(() => {
        setShowAboutModal((open) => !open)
    }, [])

    const handleCloseAboutModal = useCallback(() => {
        setShowAboutModal(false)
    }, [])

    const handleOpenTutorial = useCallback(() => {
        setShowTutorial(!showTutorial)
    }, [showTutorial])

    const handleCloseTutorial = useCallback(() => {
        setShowTutorial(false)
    }, [])

    const handleStartTour = useCallback(() => {
        setCurrentTourStep(0) // Reset to first step
        setIsTourActive(true)
    }, [setCurrentTourStep])

    const handleCompleteTour = useCallback(() => {
        completeTour()
        setIsTourActive(false)
        showSuccess('Tour Complete!', "You're all set to explore NetTrailers!")
    }, [completeTour, showSuccess])

    const handleSkipTour = useCallback(() => {
        skipTour()
        setIsTourActive(false)
    }, [skipTour])

    const handleFocusSearch = useCallback(() => {
        // Focus the search bar in the navbar (works on all pages)
        if (typeof window !== 'undefined') {
            const desktopInput = document.getElementById(
                'navbar-search-input'
            ) as HTMLInputElement | null
            const mobileInput = document.getElementById(
                'navbar-mobile-search-input'
            ) as HTMLInputElement | null

            let searchInput = desktopInput || mobileInput

            // Fallback to generic selector if specific IDs are missing
            if (!searchInput) {
                searchInput = document.querySelector(
                    'input[type="search"], input[type="text"][placeholder*="search" i]'
                ) as HTMLInputElement | null
            }

            if (searchInput) {
                searchInput.focus()
                searchInput.select()
            }
        }
    }, [])

    // Track page views for analytics
    usePageViewTracking()

    // Set up global keyboard shortcuts
    useKeyboardShortcuts({
        onOpenShortcuts: handleOpenShortcuts,
        onOpenTutorial: handleOpenTutorial,
        onOpenAbout: handleOpenAboutModal,
        onFocusSearch: handleFocusSearch,
        searchInputRef,
        isModalOpen,
        isShortcutsModalOpen: showKeyboardShortcuts,
        isTutorialModalOpen: showTutorial,
        isAboutModalOpen: showAboutModal,
    })

    // Memoize context value to prevent unnecessary re-renders
    const layoutContextValue = useMemo(
        () => ({
            onOpenAboutModal: handleOpenAboutModal,
            onOpenTutorial: handleOpenTutorial,
            onOpenKeyboardShortcuts: handleOpenShortcuts,
        }),
        [handleOpenAboutModal, handleOpenTutorial, handleOpenShortcuts]
    )

    return (
        <LayoutProvider value={layoutContextValue}>
            {/* At least a screen tall, so the footer never shows (and then jumps) while
                a page is still loading its content */}
            <div className="min-h-screen">{children}</div>
            <Footer
                showAboutModal={showAboutModal}
                onOpenAboutModal={handleOpenAboutModal}
                onCloseAboutModal={handleCloseAboutModal}
                onOpenKeyboardShortcuts={handleOpenShortcuts}
                onOpenTutorial={handleOpenTutorial}
            />
            <AboutModal
                isOpen={showAboutModal}
                onClose={handleCloseAboutModal}
                onOpenTutorial={handleOpenTutorial}
                onStartTour={handleStartTour}
            />
            <TutorialModal
                isOpen={showTutorial}
                onClose={handleCloseTutorial}
                onStartTour={handleStartTour}
            />
            <KeyboardShortcutsModal
                isOpen={showKeyboardShortcuts}
                onClose={() => setShowKeyboardShortcuts(false)}
            />
            <InteractiveTour
                isActive={isTourActive}
                onComplete={handleCompleteTour}
                onSkip={handleSkipTour}
            />
            <ScrollToTopButton />
            <CustomScrollbar />
        </LayoutProvider>
    )
}

export default ClientLayout
