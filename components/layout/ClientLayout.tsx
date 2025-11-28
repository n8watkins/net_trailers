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

/**
 * ClientLayout provides the shell around all pages in the App Router.
 * It manages:
 * - Footer
 * - Global modals (About, Tutorial, Keyboard Shortcuts)
 * - Scroll to top button
 * - Global keyboard shortcuts
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

    // Auto-show Welcome screen on first visit
    useEffect(() => {
        // Small delay to ensure page has loaded
        const timer = setTimeout(() => {
            if (shouldShowWelcomeScreen()) {
                setShowWelcome(true)
            }
        }, 500) // 0.5 second delay after page load

        return () => clearTimeout(timer)
    }, [])

    // Auto-show About modal every 24 hours (only if welcome screen not shown)
    useEffect(() => {
        // Small delay to ensure page has loaded
        const timer = setTimeout(() => {
            if (!shouldShowWelcomeScreen() && shouldShowAboutModal()) {
                setShowAboutModal(true)
            }
        }, 1000) // 1 second delay after page load

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
