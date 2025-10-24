import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import KeyboardShortcutsModal from './KeyboardShortcutsModal'
import TutorialModal from './TutorialModal'
import Footer from './Footer'
import AboutModal from './AboutModal'
import ScrollToTopButton from './ScrollToTopButton'
import { markAsVisited } from '../utils/firstVisitTracker'
import { useAppStore } from '../stores/appStore'
import { shouldShowAboutModal, markAboutModalShown } from '../utils/aboutModalTimer'

interface LayoutProps {
    children: React.ReactNode
}

function Layout({ children }: LayoutProps) {
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

    return (
        <>
            {React.cloneElement(children as React.ReactElement, {
                onOpenAboutModal: handleOpenAboutModal,
                onOpenTutorial: handleOpenTutorial,
                onOpenKeyboardShortcuts: handleOpenShortcuts,
            })}
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
        </>
    )
}

export default Layout
