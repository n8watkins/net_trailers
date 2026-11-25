'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useModalStore } from '../../stores/modalStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useToast } from '../../hooks/useToast'
import useUserData from '../../hooks/useUserData'
import { SimplifiedSmartBuilder } from '../collections/smart/SimplifiedSmartBuilder'
import { SmartCollectionBuilder } from '../collections/smart/SmartCollectionBuilder'
import { CollectionWizard } from '../collections/CollectionWizard'
import { CustomRowFormData } from '../../types/collections'
import {
    inferMediaTypeFromContent,
    inferTopGenresFromContent,
} from '../../utils/collectionGenreUtils'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { BUILDER_TITLE_ID } from '../collections/BuilderHeader'

type CreationMode = 'traditional' | 'smart'

/**
 * CollectionBuilderModal Component
 *
 * Shared modal wrapper for collection creation with unified click-outside-to-close logic.
 * Supports two modes:
 * - Traditional: Manual collection creation with step-by-step wizard
 * - Smart: AI-powered with natural language query
 *
 * This component provides the modal container and click handling.
 * Child components (SimplifiedSmartBuilder, CollectionWizard) are content-only.
 */
function CollectionBuilderModal() {
    const router = useRouter()
    const { collectionBuilderModal, closeCollectionBuilderModal, openAuthModal } = useModalStore()
    const getUserId = useSessionStore((state: any) => state.getUserId)
    const sessionType = useSessionStore((state: any) => state.sessionType)
    const { showSuccess, showError } = useToast()
    const { createList } = useUserData()

    const [mode, setMode] = useState<CreationMode>('smart')
    const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false)
    const dialogRef = useRef<HTMLDivElement>(null)

    // Feature flag: Use simplified builder
    const USE_SIMPLIFIED_BUILDER = true

    const userId = getUserId()
    const isOpen = collectionBuilderModal.isOpen
    const isAuthenticated = sessionType === 'authenticated'

    useEscapeKey(isOpen, closeCollectionBuilderModal)
    useFocusTrap(dialogRef, isOpen)

    useEffect(() => {
        if (!isOpen) return
        const previous = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = previous
        }
    }, [isOpen])

    if (!isOpen) return null

    // Unified click-outside-to-close logic (from SimplifiedSmartBuilder)
    const handleBackdropMouseDown = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement
        // Only mark if click is OUTSIDE modal content
        if (!target.closest('[data-modal-content]')) {
            setMouseDownOnBackdrop(true)
        }
    }

    const handleBackdropMouseUp = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement
        // Only close if BOTH mousedown AND mouseup happened outside
        if (!target.closest('[data-modal-content]') && mouseDownOnBackdrop) {
            closeCollectionBuilderModal()
        }
        setMouseDownOnBackdrop(false)
    }

    const handleComplete = async (formData: CustomRowFormData) => {
        if (!userId) {
            showError('Authentication required')
            return
        }

        try {
            const previewContent = formData.previewContent ?? []
            const normalizedGenres = (
                formData.genres?.length
                    ? formData.genres
                    : inferTopGenresFromContent(previewContent, 2)
            ).slice(0, 2)
            const derivedMediaType =
                formData.mediaType || inferMediaTypeFromContent(previewContent, 'both')
            const infiniteEnabled = formData.enableInfiniteContent ?? normalizedGenres.length > 0
            const genreLogic = formData.genreLogic || (normalizedGenres.length >= 2 ? 'AND' : 'OR')

            // Create collection from the form data
            const newListResult = createList({
                name: formData.name,
                emoji: '📺', // Default emoji for AI-generated collections
                color: '#3b82f6', // Default blue color
                displayAsRow: formData.displayAsRow ?? false,
                collectionType: mode === 'smart' ? 'ai-generated' : 'manual',
                // NOTE: Auto-update feature was removed during refactor
                // autoUpdateEnabled: false,
                // updateFrequency: 'never',
                genres: normalizedGenres,
                genreLogic,
                mediaType: derivedMediaType,
                advancedFilters: formData.advancedFilters,
                canGenerateMore: infiniteEnabled,
                // Saved with the collection in one write, not one save per title
                items: formData.previewContent ?? [],
            })

            // Handle both sync and async returns
            const listId = typeof newListResult === 'string' ? newListResult : await newListResult

            const itemCount = formData.previewContent?.length || 0
            showSuccess(
                'Collection created!',
                `"${formData.name}" with ${itemCount} title${itemCount !== 1 ? 's' : ''}`
            )
            closeCollectionBuilderModal()

            // Navigate to collections page and refresh to load new data
            await router.push('/collections')
            router.refresh()
        } catch (error) {
            // Error already shown to user via toast
            showError((error as Error).message || 'Failed to create collection')
            throw error
        }
    }

    const handleSignIn = () => {
        openAuthModal('signin')
    }

    return (
        <div
            className="fixed inset-0 z-[56000] flex items-end justify-center sm:items-center sm:p-4"
            onMouseDown={handleBackdropMouseDown}
            onMouseUp={handleBackdropMouseUp}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" aria-hidden="true" />

            {/* Sized to its content, like About: no fixed 600px stage */}
            <div
                ref={dialogRef}
                data-modal-content
                role="dialog"
                aria-modal="true"
                aria-labelledby={BUILDER_TITLE_ID}
                tabIndex={-1}
                data-testid="collection-builder"
                className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-zinc-700 bg-[#0d0d0f] shadow-2xl outline-none sm:max-w-4xl sm:rounded-2xl"
            >
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    {/* Render selected mode content */}
                    {mode === 'smart' ? (
                        USE_SIMPLIFIED_BUILDER ? (
                            <SimplifiedSmartBuilder
                                onClose={closeCollectionBuilderModal}
                                onComplete={handleComplete}
                                isAuthenticated={isAuthenticated}
                                onSignIn={handleSignIn}
                                mode={mode}
                                onModeChange={setMode}
                            />
                        ) : (
                            <SmartCollectionBuilder
                                onClose={closeCollectionBuilderModal}
                                onComplete={handleComplete}
                                isAuthenticated={isAuthenticated}
                                onSignIn={handleSignIn}
                            />
                        )
                    ) : (
                        <CollectionWizard
                            onClose={closeCollectionBuilderModal}
                            onComplete={handleComplete}
                            isAuthenticated={isAuthenticated}
                            onSignIn={handleSignIn}
                            mode={mode}
                            onModeChange={setMode}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}

export default CollectionBuilderModal
