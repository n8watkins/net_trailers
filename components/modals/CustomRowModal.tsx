'use client'

import React, { useState } from 'react'
import { useAppStore } from '../../stores/appStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useCustomRowsStore } from '../../stores/customRowsStore'
import { CustomRowsFirestore } from '../../utils/firestore/customRows'
import { CustomRowWizard } from '../customRows/CustomRowWizard'
import { SmartRowBuilder } from '../customRows/smart/SmartRowBuilder'
import { SimplifiedSmartBuilder } from '../customRows/smart/SimplifiedSmartBuilder'
import { CustomRowFormData } from '../../types/customRows'
import { useToast } from '../../hooks/useToast'
import { useAuthStatus } from '../../hooks/useAuthStatus'

type CreationMode = 'traditional' | 'smart'

/**
 * CustomRowModal Component
 *
 * Modal wrapper for custom row creation.
 * Supports two modes:
 * - Traditional: Step-by-step wizard with manual filter selection
 * - Smart: AI-powered with entity tagging and TMDB suggestions
 */
function CustomRowModal() {
    const { customRowModal, closeCustomRowModal, openAuthModal } = useAppStore()
    const getUserId = useSessionStore((state: any) => state.getUserId)
    const sessionType = useSessionStore((state: any) => state.sessionType)
    const { addRow } = useCustomRowsStore()
    const { showSuccess, showError } = useToast()
    const { isGuest } = useAuthStatus()

    const [mode, setMode] = useState<CreationMode>('smart')

    // Feature flag: Use simplified builder (set to true to test new flow)
    const USE_SIMPLIFIED_BUILDER = true

    const userId = getUserId()
    const isOpen = customRowModal.isOpen
    const isAuthenticated = sessionType === 'authenticated'

    if (!isOpen) return null

    const handleComplete = async (formData: CustomRowFormData) => {
        if (!userId) {
            showError('Authentication required')
            return
        }

        try {
            // Create new row (pass isGuest for max row validation)
            const newRow = await CustomRowsFirestore.createCustomRow(userId, formData, isGuest)
            addRow(userId, newRow)
            showSuccess('Custom row created!')
            // Note: Modal close happens in Step 4 when user clicks "View on Homepage"
        } catch (error) {
            console.error('Error creating custom row:', error)
            showError((error as Error).message || 'Failed to create custom row')
            throw error // Re-throw so wizard can handle the error state
        }
    }

    const handleSignIn = () => {
        // Open authentication modal
        openAuthModal('signin')
    }

    return (
        <div className="relative">
            {/* Mode Switcher - Floating at top of modal */}
            <div className="fixed top-32 left-1/2 -translate-x-1/2 z-[60]">
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-1 shadow-lg">
                    <div className="flex gap-1">
                        <button
                            onClick={() => setMode('smart')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                mode === 'smart'
                                    ? 'bg-red-600 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                            }`}
                        >
                            ✨ Smart Builder
                        </button>
                        <button
                            onClick={() => setMode('traditional')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                                mode === 'traditional'
                                    ? 'bg-red-600 text-white'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                            }`}
                        >
                            🔧 Traditional
                        </button>
                    </div>
                </div>
            </div>

            {/* Render selected mode */}
            {mode === 'smart' ? (
                USE_SIMPLIFIED_BUILDER ? (
                    <SimplifiedSmartBuilder
                        onClose={closeCustomRowModal}
                        onComplete={handleComplete}
                        isAuthenticated={isAuthenticated}
                        onSignIn={handleSignIn}
                    />
                ) : (
                    <SmartRowBuilder
                        onClose={closeCustomRowModal}
                        onComplete={handleComplete}
                        isAuthenticated={isAuthenticated}
                        onSignIn={handleSignIn}
                    />
                )
            ) : (
                <CustomRowWizard
                    onClose={closeCustomRowModal}
                    onComplete={handleComplete}
                    isAuthenticated={isAuthenticated}
                    onSignIn={handleSignIn}
                />
            )}
        </div>
    )
}

export default CustomRowModal
