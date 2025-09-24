import React, { useState, useRef, useCallback } from 'react'
import { useRecoilValue } from 'recoil'
import { modalState } from '../atoms/modalAtom'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import KeyboardShortcutsModal from './KeyboardShortcutsModal'
import TutorialModal from './TutorialModal'
import Footer from './Footer'
import AboutModal from './AboutModal'
import ScrollToTopButton from './ScrollToTopButton'
import { markAsVisited } from '../utils/firstVisitTracker'

interface LayoutProps {
    children: React.ReactNode
}

function Layout({ children }: LayoutProps) {
    const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
    const [showAboutModal, setShowAboutModal] = useState(false)
    const [showTutorial, setShowTutorial] = useState(false)
    const isModalOpen = useRecoilValue(modalState)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const handleOpenShortcuts = useCallback(() => {
        setShowKeyboardShortcuts(!showKeyboardShortcuts)
    }, [showKeyboardShortcuts])

    const handleOpenAboutModal = useCallback(() => {
        setShowAboutModal(true)
    }, [])

    const handleCloseAboutModal = useCallback(() => {
        setShowAboutModal(false)
        markAsVisited()
    }, [])

    const handleOpenTutorial = useCallback(() => {
        setShowTutorial(true)
    }, [])

    const handleCloseTutorial = useCallback(() => {
        setShowTutorial(false)
    }, [])

    const handleFocusSearch = () => {
        // Navigate to search page if not already there
        const router = require('next/router').default
        if (typeof window !== 'undefined' && window.location.pathname !== '/search') {
            router.push('/search')
            // Wait for navigation then focus
            setTimeout(() => {
                const searchInput = document.querySelector(
                    'input[type="text"][placeholder*="search" i]'
                ) as HTMLInputElement
                if (searchInput) {
                    searchInput.focus()
                    searchInput.select()
                }
            }, 100)
        } else {
            // Already on search page, just focus the input
            const searchInput = document.querySelector(
                'input[type="text"][placeholder*="search" i]'
            ) as HTMLInputElement
            if (searchInput) {
                searchInput.focus()
                searchInput.select()
            }
        }
    }

    // Set up global keyboard shortcuts
    useKeyboardShortcuts({
        onOpenShortcuts: handleOpenShortcuts,
        onFocusSearch: handleFocusSearch,
        searchInputRef,
        isModalOpen,
        isShortcutsModalOpen: showKeyboardShortcuts,
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
