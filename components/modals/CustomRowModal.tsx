'use client'

import React from 'react'
import { useAppStore } from '../../stores/appStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useCustomRowsStore } from '../../stores/customRowsStore'
import { CustomRowsFirestore } from '../../utils/firestore/customRows'
import { CustomRowWizard } from '../customRows/CustomRowWizard'
import { CustomRowFormData } from '../../types/customRows'
import { useToast } from '../../hooks/useToast'
import { useAuthStatus } from '../../hooks/useAuthStatus'

/**
 * CustomRowModal Component
 *
 * Modal wrapper for the CustomRowWizard.
 * Handles authentication state and integrates with app stores.
 */
function CustomRowModal() {
    const { customRowModal, closeCustomRowModal, openAuthModal } = useAppStore()
    const getUserId = useSessionStore((state: any) => state.getUserId)
    const sessionType = useSessionStore((state: any) => state.sessionType)
    const { addRow } = useCustomRowsStore()
    const { showSuccess, showError } = useToast()
    const { isGuest } = useAuthStatus()

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
        <CustomRowWizard
            onClose={closeCustomRowModal}
            onComplete={handleComplete}
            isAuthenticated={isAuthenticated}
            onSignIn={handleSignIn}
        />
    )
}

export default CustomRowModal
