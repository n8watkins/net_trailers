'use client'

import React, { useState, useEffect } from 'react'
import { PlusIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { CustomRowForm } from '../../components/customRows/CustomRowForm'
import { CustomRowCard } from '../../components/customRows/CustomRowCard'
import { useSessionStore } from '../../stores/sessionStore'
import { useCustomRowsStore } from '../../stores/customRowsStore'
import { useAppStore } from '../../stores/appStore'
import { CustomRow, CustomRowFormData, CUSTOM_ROW_CONSTRAINTS } from '../../types/customRows'

type ViewMode = 'list' | 'create' | 'edit'

/**
 * My Rows Page
 *
 * Management interface for custom rows.
 * Allows users to create, edit, delete, and toggle custom rows.
 */
export default function MyRowsPage() {
    const router = useRouter()
    const [viewMode, setViewMode] = useState<ViewMode>('list')
    const [editingRow, setEditingRow] = useState<CustomRow | null>(null)

    // Stores
    const getUserId = useSessionStore((state) => state.getUserId)
    const { getRows, setRows, addRow, updateRow, removeRow, setLoading, setError } =
        useCustomRowsStore()
    const showToast = useAppStore((state) => state.showToast)

    const userId = getUserId()
    const rows = userId ? getRows(userId) : []
    const atMaxRows = rows.length >= CUSTOM_ROW_CONSTRAINTS.MAX_ROWS_PER_USER

    // Load rows on mount
    useEffect(() => {
        if (!userId) return

        const loadRows = async () => {
            setLoading(true)
            try {
                const response = await fetch('/api/custom-rows', {
                    headers: {
                        'X-User-ID': userId,
                    },
                })

                if (!response.ok) {
                    throw new Error('Failed to load custom rows')
                }

                const data = await response.json()
                setRows(userId, data.rows)
            } catch (error) {
                console.error('Error loading rows:', error)
                showToast('error', 'Failed to load custom rows')
                setError((error as Error).message)
            } finally {
                setLoading(false)
            }
        }

        loadRows()
    }, [userId, setRows, setLoading, setError, showToast])

    // Create row
    const handleCreate = async (formData: CustomRowFormData) => {
        if (!userId) return

        try {
            const response = await fetch('/api/custom-rows', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': userId,
                },
                body: JSON.stringify(formData),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to create row')
            }

            const data = await response.json()
            addRow(userId, data.row)
            showToast('success', 'Row created successfully')
            setViewMode('list')
        } catch (error) {
            console.error('Error creating row:', error)
            showToast('error', (error as Error).message)
        }
    }

    // Update row
    const handleUpdate = async (formData: CustomRowFormData) => {
        if (!userId || !editingRow) return

        try {
            const response = await fetch(`/api/custom-rows/${editingRow.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': userId,
                },
                body: JSON.stringify(formData),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to update row')
            }

            const data = await response.json()
            updateRow(userId, editingRow.id, data.row)
            showToast('success', 'Row updated successfully')
            setViewMode('list')
            setEditingRow(null)
        } catch (error) {
            console.error('Error updating row:', error)
            showToast('error', (error as Error).message)
        }
    }

    // Delete row
    const handleDelete = async (row: CustomRow) => {
        if (!userId) return

        try {
            const response = await fetch(`/api/custom-rows/${row.id}`, {
                method: 'DELETE',
                headers: {
                    'X-User-ID': userId,
                },
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to delete row')
            }

            removeRow(userId, row.id)
            showToast('success', 'Row deleted successfully')
        } catch (error) {
            console.error('Error deleting row:', error)
            showToast('error', (error as Error).message)
        }
    }

    // Toggle enabled
    const handleToggleEnabled = async (row: CustomRow) => {
        if (!userId) return

        try {
            const response = await fetch(`/api/custom-rows/${row.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': userId,
                },
                body: JSON.stringify({ enabled: !row.enabled }),
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to toggle row')
            }

            const data = await response.json()
            updateRow(userId, row.id, data.row)
            showToast('success', row.enabled ? 'Row disabled' : 'Row enabled')
        } catch (error) {
            console.error('Error toggling row:', error)
            showToast('error', (error as Error).message)
        }
    }

    // Edit row
    const handleEdit = (row: CustomRow) => {
        setEditingRow(row)
        setViewMode('edit')
    }

    // Cancel form
    const handleCancel = () => {
        setViewMode('list')
        setEditingRow(null)
    }

    // No user ID
    if (!userId) {
        return (
            <div className="min-h-screen bg-[#141414] flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
                    <p className="text-gray-400">Please sign in to manage your custom rows.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#141414]">
            {/* Header */}
            <div className="bg-gradient-to-b from-black to-transparent py-8">
                <div className="container mx-auto px-4 max-w-6xl">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        Back
                    </button>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">My Rows</h1>
                            <p className="text-gray-400">
                                Create and manage your personalized content rows
                            </p>
                        </div>

                        {viewMode === 'list' && (
                            <button
                                onClick={() => setViewMode('create')}
                                disabled={atMaxRows}
                                className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Create Row
                            </button>
                        )}
                    </div>

                    {atMaxRows && viewMode === 'list' && (
                        <div className="mt-4 p-4 bg-yellow-600/20 border border-yellow-600/50 rounded-lg">
                            <p className="text-yellow-400">
                                You&apos;ve reached the maximum of{' '}
                                {CUSTOM_ROW_CONSTRAINTS.MAX_ROWS_PER_USER} custom rows. Delete a row
                                to create a new one.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 max-w-6xl py-8">
                {viewMode === 'list' && (
                    <>
                        {rows.length === 0 ? (
                            <div className="text-center py-16">
                                <h2 className="text-2xl font-bold text-white mb-4">
                                    No Custom Rows Yet
                                </h2>
                                <p className="text-gray-400 mb-8">
                                    Create your first custom row to get started!
                                </p>
                                <button
                                    onClick={() => setViewMode('create')}
                                    className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    Create Your First Row
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {rows.map((row) => (
                                    <CustomRowCard
                                        key={row.id}
                                        row={row}
                                        onEdit={handleEdit}
                                        onDelete={handleDelete}
                                        onToggleEnabled={handleToggleEnabled}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}

                {viewMode === 'create' && (
                    <div className="max-w-2xl mx-auto">
                        <h2 className="text-2xl font-bold text-white mb-6">Create Custom Row</h2>
                        <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-6">
                            <CustomRowForm onSubmit={handleCreate} onCancel={handleCancel} />
                        </div>
                    </div>
                )}

                {viewMode === 'edit' && editingRow && (
                    <div className="max-w-2xl mx-auto">
                        <h2 className="text-2xl font-bold text-white mb-6">Edit Custom Row</h2>
                        <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-6">
                            <CustomRowForm
                                initialData={editingRow}
                                onSubmit={handleUpdate}
                                onCancel={handleCancel}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
