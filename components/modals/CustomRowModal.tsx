'use client'

import React, { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/solid'
import { useAppStore } from '../../stores/appStore'
import { useSessionStore } from '../../stores/sessionStore'
import { useCustomRowsStore } from '../../stores/customRowsStore'
import { CustomRowsFirestore } from '../../utils/firestore/customRows'
import { CustomRowForm } from '../customRows/CustomRowForm'
import { CustomRowFormData } from '../../types/customRows'
import { useToast } from '../../hooks/useToast'

/**
 * CustomRowModal Component
 *
 * Modal for creating and editing custom rows.
 * Matches the design pattern of ListSelectionModal for consistency.
 */
function CustomRowModal() {
    const { customRowModal, closeCustomRowModal } = useAppStore()
    const getUserId = useSessionStore((state) => state.getUserId)
    const { getRow, addRow, updateRow } = useCustomRowsStore()
    const { showSuccess, showError } = useToast()

    const [isSubmitting, setIsSubmitting] = useState(false)

    const userId = getUserId()
    const isOpen = customRowModal.isOpen
    const mode = customRowModal.mode
    const editingRowId = customRowModal.editingRowId

    // Get the row being edited (if any)
    const editingRow =
        mode === 'edit' && editingRowId && userId ? getRow(userId, editingRowId) : undefined

    // Reset submitting state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setIsSubmitting(false)
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleSubmit = async (formData: CustomRowFormData) => {
        if (!userId) {
            showError('Authentication required')
            return
        }

        setIsSubmitting(true)

        try {
            if (mode === 'create') {
                // Create new row
                const newRow = await CustomRowsFirestore.createCustomRow(userId, formData)
                addRow(userId, newRow)
                showSuccess('Custom row created!')
                closeCustomRowModal()
            } else if (mode === 'edit' && editingRowId) {
                // Update existing row
                const updatedRow = await CustomRowsFirestore.updateCustomRow(
                    userId,
                    editingRowId,
                    formData
                )
                updateRow(userId, editingRowId, updatedRow)
                showSuccess('Custom row updated!')
                closeCustomRowModal()
            }
        } catch (error) {
            console.error('Error saving custom row:', error)
            showError((error as Error).message || 'Failed to save custom row')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleCancel = () => {
        closeCustomRowModal()
    }

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[998]"
                onClick={handleCancel}
                aria-hidden="true"
            />

            {/* Modal */}
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="bg-[#1a1a1a] rounded-xl shadow-2xl shadow-red-500/20 border border-red-500/40 w-full max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="sticky top-0 bg-[#1a1a1a] border-b border-gray-700 px-6 py-4 flex items-center justify-between z-10">
                        <h2 className="text-2xl font-bold text-white">
                            {mode === 'create' ? 'Create Custom Row' : 'Edit Custom Row'}
                        </h2>
                        <button
                            onClick={handleCancel}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            aria-label="Close modal"
                        >
                            <XMarkIcon className="w-6 h-6 text-gray-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                        <CustomRowForm
                            initialData={editingRow}
                            onSubmit={handleSubmit}
                            onCancel={handleCancel}
                            isLoading={isSubmitting}
                        />
                    </div>
                </div>
            </div>
        </>
    )
}

export default CustomRowModal
