'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useModalStore } from '../../stores/modalStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useToast } from '../../hooks/useToast'
import useUserData from '../../hooks/useUserData'
import { SimplifiedSmartBuilder } from '../customRows/smart/SimplifiedSmartBuilder'
import { SmartRowBuilder } from '../customRows/smart/SmartRowBuilder'
import { CustomRowWizard } from '../customRows/CustomRowWizard'
import { CustomRowFormData } from '../../types/customRows'
import {
    inferMediaTypeFromContent,
    inferTopGenresFromContent,
} from '../../utils/collectionGenreUtils'

type CreationMode = 'traditional' | 'smart'

/**
 * CollectionBuilderModal Component
 *
 * Modal wrapper for collection creation.
 * Supports two modes:
 * - Traditional: Manual collection creation with name, emoji, color
 * - Smart: AI-powered with natural language query
 *
 * This component reuses the Smart Row Builder and Traditional Wizard
 * but creates collections instead of custom rows.
 */
function CollectionBuilderModal() {
    const router = useRouter()
    const { collectionBuilderModal, closeCollectionBuilderModal, openAuthModal } = useModalStore()
    const getUserId = useSessionStore((state: any) => state.getUserId)
    const sessionType = useSessionStore((state: any) => state.sessionType)
    const { showSuccess, showError } = useToast()
    const { createList, addToList } = useUserData()

    const [mode, setMode] = useState<CreationMode>('smart')

    // Feature flag: Use simplified builder
    const USE_SIMPLIFIED_BUILDER = true

    const userId = getUserId()
    const isOpen = collectionBuilderModal.isOpen
    const isAuthenticated = sessionType === 'authenticated'

    if (!isOpen) return null

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
                isPublic: formData.isPublic ?? false,
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
        <>
            {/* Render selected mode */}
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
                    <SmartRowBuilder
                        onClose={closeCollectionBuilderModal}
                        onComplete={handleComplete}
                        isAuthenticated={isAuthenticated}
                        onSignIn={handleSignIn}
                    />
                )
            ) : (
                <CustomRowWizard
                    onClose={closeCollectionBuilderModal}
                    onComplete={handleComplete}
                    isAuthenticated={isAuthenticated}
                    onSignIn={handleSignIn}
                    mode={mode}
                    onModeChange={setMode}
                />
            )}
        </>
    )
}

export default CollectionBuilderModal
