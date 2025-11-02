'use client'

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import KeyboardShortcutsModal from '../modals/KeyboardShortcutsModal'
import TutorialModal from '../modals/TutorialModal'
import Footer from './Footer'
import AboutModal from '../modals/AboutModal'
import ScrollToTopButton from '../common/ScrollToTopButton'
import { markAsVisited } from '../../utils/firstVisitTracker'
import { useAppStore } from '../../stores/appStore'
import { shouldShowAboutModal, markAboutModalShown } from '../../utils/aboutModalTimer'
import { LayoutProvider } from '../../contexts/LayoutContext'

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
    const { modal } = useAppStore()
    const isModalOpen = modal.isOpen
    const searchInputRef = useRef<HTMLInputElement>(null)

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

    const handleFocusSearch = useCallback(() => {
        // Focus the search bar in the navbar (works on all pages)
        if (typeof window !== 'undefined') {
            // Try to find by ID first
            let searchInput = document.getElementById('main-search-input') as HTMLInputElement

            // Fallback to query selector if ID not found
            if (!searchInput) {
                searchInput = document.querySelector(
                    'input[type="text"][placeholder*="search" i]'
                ) as HTMLInputElement
            }

            if (searchInput) {
                searchInput.focus()
                searchInput.select()
            }
        }
    }, [])

    // Auto-show About modal every 24 hours
    useEffect(() => {
        // Small delay to ensure page has loaded
        const timer = setTimeout(() => {
            if (shouldShowAboutModal()) {
                setShowAboutModal(true)
            }
        }, 1000) // 1 second delay after page load

        return () => clearTimeout(timer)
    }, [])

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
            <AboutModal isOpen={showAboutModal} onClose={handleCloseAboutModal} />
            <TutorialModal isOpen={showTutorial} onClose={handleCloseTutorial} />
            <KeyboardShortcutsModal
                isOpen={showKeyboardShortcuts}
                onClose={() => setShowKeyboardShortcuts(false)}
            />
            <ScrollToTopButton />
        </LayoutProvider>
    )
}

export default ClientLayout
