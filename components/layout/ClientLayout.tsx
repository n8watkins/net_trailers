'use client'

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { usePageViewTracking } from '../../hooks/useActivityTracking'
import KeyboardShortcutsModal from '../modals/KeyboardShortcutsModal'
import TutorialModal from '../modals/TutorialModal'
import WelcomeScreen from '../onboarding/WelcomeScreen'
import Footer from './Footer'
import AboutModal from '../modals/AboutModal'
import ScrollToTopButton from '../common/ScrollToTopButton'
import CustomScrollbar from '../common/CustomScrollbar'
import { markAsVisited } from '../../utils/firstVisitTracker'
import { useModalStore } from '../../stores/modalStore'
import { shouldShowAboutModal, markAboutModalShown } from '../../utils/aboutModalTimer'
import { LayoutProvider } from '../../contexts/LayoutContext'
import { useOnboardingStore } from '../../stores/onboardingStore'
import { useOnboardingPersistence } from '../../hooks/useOnboardingPersistence'
import { shouldShowWelcomeScreen } from '../../utils/onboardingStorage'
import { useToast } from '../../hooks/useToast'

interface ClientLayoutProps {
    children: React.ReactNode
}

// Modal display delays (in milliseconds)
const MODAL_DISPLAY_DELAY = 500 // Delay before showing welcome/about modal

/**
 * ClientLayout provides the shell around all pages in the App Router.
 * It manages:
 * - Footer
 * - Global modals (About, Tutorial, Keyboard Shortcuts, Welcome Screen)
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
    const [showWelcome, setShowWelcome] = useState(false)
    const { modal } = useModalStore()
    const isModalOpen = modal.isOpen
    const searchInputRef = useRef<HTMLInputElement>(null)
    const { markWelcomeScreenSeen } = useOnboardingStore()
    const { showSuccess } = useToast()

    // Enable onboarding persistence
    useOnboardingPersistence()

    const handleOpenShortcuts = useCallback(() => {
        setShowKeyboardShortcuts(!showKeyboardShortcuts)
    }, [showKeyboardShortcuts])

    const handleOpenAboutModal = useCallback(() => {
        setShowAboutModal(!showAboutModal)
        if (!showAboutModal) {
            // Only mark as visited when opening
        } else {
            markAsVisited()
        }
    }, [showAboutModal])

    const handleCloseAboutModal = useCallback(() => {
        setShowAboutModal(false)
        markAsVisited()
        markAboutModalShown() // Mark as shown when closing
    }, [])

    const handleOpenTutorial = useCallback(() => {
        setShowTutorial(!showTutorial)
    }, [showTutorial])

    const handleCloseTutorial = useCallback(() => {
        setShowTutorial(false)
    }, [])

    const handleCloseWelcome = useCallback(() => {
        setShowWelcome(false)
        markWelcomeScreenSeen()
    }, [markWelcomeScreenSeen])

    const handleStartTour = useCallback(() => {
        // TODO: This will be implemented in Step 3
        showSuccess('Coming Soon', 'Interactive tour will be available in the next update!')
    }, [showSuccess])

    const handleBrowseFeatures = useCallback(() => {
        setShowTutorial(true)
    }, [])

    const handleWatchDemo = useCallback(() => {
        // For now, just open the tutorial modal
        // In the future, this could link to a video
        setShowTutorial(true)
    }, [])

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

    // Auto-show Welcome screen on first visit OR About modal every 24 hours
    // Combined to avoid duplicate localStorage reads
    useEffect(() => {
        const timer = setTimeout(() => {
            const shouldShowWelcome = shouldShowWelcomeScreen()

            if (shouldShowWelcome) {
                // Show welcome screen on first visit
                setShowWelcome(true)
            } else if (shouldShowAboutModal()) {
                // Show about modal if welcome already seen
                setShowAboutModal(true)
            }
        }, MODAL_DISPLAY_DELAY)

        return () => clearTimeout(timer)
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
            {children}
            <Footer
                showAboutModal={showAboutModal}
                onOpenAboutModal={handleOpenAboutModal}
                onCloseAboutModal={handleCloseAboutModal}
                onOpenKeyboardShortcuts={handleOpenShortcuts}
                onOpenTutorial={handleOpenTutorial}
            />
            <WelcomeScreen
                isOpen={showWelcome}
                onClose={handleCloseWelcome}
                onStartTour={handleStartTour}
                onBrowseFeatures={handleBrowseFeatures}
                onWatchDemo={handleWatchDemo}
            />
            <AboutModal isOpen={showAboutModal} onClose={handleCloseAboutModal} />
            <TutorialModal isOpen={showTutorial} onClose={handleCloseTutorial} />
            <KeyboardShortcutsModal
                isOpen={showKeyboardShortcuts}
                onClose={() => setShowKeyboardShortcuts(false)}
            />
            <ScrollToTopButton />
            <CustomScrollbar />
        </LayoutProvider>
    )
}

export default ClientLayout
