import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'

interface UseKeyboardShortcutsProps {
    onOpenShortcuts?: () => void
    onOpenTutorial?: () => void
    onOpenAbout?: () => void
    onToggleModal?: () => void
    onFocusSearch?: () => void
    onToggleMute?: () => void
    onTogglePlayPause?: () => void
    onToggleFullscreen?: () => void
    onLikeContent?: () => void
    onDislikeContent?: () => void
    onAddToFavorites?: () => void
    searchInputRef?: React.RefObject<HTMLInputElement>
    isModalOpen?: boolean
    isShortcutsModalOpen?: boolean
}

export function useKeyboardShortcuts({
    onOpenShortcuts,
    onOpenTutorial,
    onOpenAbout,
    onToggleModal,
    onFocusSearch,
    onToggleMute,
    onTogglePlayPause,
    onToggleFullscreen,
    onLikeContent,
    onDislikeContent,
    onAddToFavorites,
    searchInputRef,
    isModalOpen = false,
    isShortcutsModalOpen = false,
}: UseKeyboardShortcutsProps = {}) {
    const router = useRouter()

    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            // Don't handle shortcuts if typing in input fields
            const target = event.target as HTMLElement
            const isTyping =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable ||
                target.closest('input') ||
                target.closest('textarea')

            // Handle specific shortcuts regardless of context
            if (event.key === '?' && !isTyping) {
                event.preventDefault()
                onOpenShortcuts?.()
                return
            }

            // Don't handle shortcuts when shortcuts modal is open (except escape and ?)
            if (isShortcutsModalOpen && event.key !== 'Escape') {
                return
            }

            // Global shortcuts that work even when typing (with modifiers)
            // Alt+/ to focus search (works globally, even when typing)
            if (event.altKey && event.key === '/') {
                event.preventDefault()
                onFocusSearch?.()
                return
            }

            // Alt+T to open tutorial modal (works globally, even when typing)
            if (event.altKey && event.key.toLowerCase() === 't') {
                event.preventDefault()
                onOpenTutorial?.()
                return
            }

            // Alt+A to open about modal (works globally, even when typing)
            if (event.altKey && event.key.toLowerCase() === 'a') {
                event.preventDefault()
                onOpenAbout?.()
                return
            }

            // Don't handle other shortcuts if typing
            if (isTyping) return

            // Navigation shortcuts
            switch (event.key.toLowerCase()) {
                case 'h':
                    // Use Alt+H to navigate to home page
                    if (event.altKey && !isModalOpen) {
                        event.preventDefault()
                        // Only navigate if not already on home page
                        if (router.pathname !== '/') {
                            router.push('/')
                        }
                    }
                    break

                case 'l':
                    // Use Alt+L to navigate to liked page
                    // Plain 'L' is reserved for like/unlike in modal
                    if (event.altKey && !isModalOpen) {
                        event.preventDefault()
                        // Only navigate if not already on liked page
                        if (router.pathname !== '/liked') {
                            router.push('/liked')
                        }
                    }
                    // Don't handle plain 'L' here - let modal handle it
                    break

                case 'escape':
                    event.preventDefault()
                    if (isModalOpen) {
                        onToggleModal?.()
                    } else if (isShortcutsModalOpen) {
                        onOpenShortcuts?.()
                    } else {
                        // Clear search if on search page
                        if (router.pathname === '/search' && searchInputRef?.current) {
                            searchInputRef.current.value = ''
                            searchInputRef.current.dispatchEvent(
                                new Event('input', { bubbles: true })
                            )
                            searchInputRef.current.blur()
                        }
                    }
                    break

                // Video player shortcuts (only when modal is open)
                case ' ':
                    if (isModalOpen) {
                        event.preventDefault()
                        onTogglePlayPause?.()
                    }
                    break

                case 'm':
                    if (isModalOpen) {
                        event.preventDefault()
                        onToggleMute?.()
                    }
                    break

                case 'f':
                    if (isModalOpen) {
                        event.preventDefault()
                        onToggleFullscreen?.()
                    }
                    break

                // Content action shortcuts (work globally)
                case '1':
                    event.preventDefault()
                    onLikeContent?.()
                    break

                case '2':
                    event.preventDefault()
                    onDislikeContent?.()
                    break

                case '3':
                    event.preventDefault()
                    onAddToFavorites?.()
                    break
            }
        },
        [
            router,
            onOpenShortcuts,
            onOpenTutorial,
            onOpenAbout,
            onToggleModal,
            onFocusSearch,
            onToggleMute,
            onTogglePlayPause,
            onToggleFullscreen,
            onLikeContent,
            onDislikeContent,
            onAddToFavorites,
            searchInputRef,
            isModalOpen,
            isShortcutsModalOpen,
        ]
    )

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [handleKeyDown])

    // Focus search shortcut helper
    const focusSearch = useCallback(() => {
        if (searchInputRef?.current) {
            searchInputRef.current.focus()
            searchInputRef.current.select()
        } else {
            // If no search ref provided, try to find search input on page
            const searchInput = document.querySelector(
                'input[type="text"][placeholder*="search" i], input[type="search"]'
            ) as HTMLInputElement
            if (searchInput) {
                searchInput.focus()
                searchInput.select()
            }
        }
    }, [searchInputRef])

    return {
        focusSearch,
    }
}
