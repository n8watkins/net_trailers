'use client'

import React, { useState } from 'react'
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
    const { createList, addToList } = useUserData()

    const [mode, setMode] = useState<CreationMode>('smart')
    const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false)

    // Feature flag: Use simplified builder
    const USE_SIMPLIFIED_BUILDER = true

    const userId = getUserId()
    const isOpen = collectionBuilderModal.isOpen
    const isAuthenticated = sessionType === 'authenticated'

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
                autoUpdateEnabled: false, // Collections created here don't auto-update
                updateFrequency: 'never',
                genres: normalizedGenres,
                genreLogic,
                mediaType: derivedMediaType,
                advancedFilters: formData.advancedFilters,
                canGenerateMore: infiniteEnabled,
            })

            // Handle both sync and async returns
            const listId = typeof newListResult === 'string' ? newListResult : await newListResult

            // Add preview content to the collection if it exists
            if (formData.previewContent && formData.previewContent.length > 0) {
                await Promise.all(
                    formData.previewContent.map((content) => addToList(listId, content))
                )
            }

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
            className="fixed inset-0 z-[56000] overflow-y-auto"
            onMouseDown={handleBackdropMouseDown}
            onMouseUp={handleBackdropMouseUp}
        >
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" />

            {/* Modal Container */}
            <div className="relative min-h-screen flex items-center justify-center p-4">
                <div
                    data-modal-content
                    className="relative bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] rounded-lg shadow-2xl max-w-6xl w-full border border-gray-700"
                >
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
