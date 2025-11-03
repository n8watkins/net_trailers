'use client'

import { useState, useEffect } from 'react'
import Header from '../../components/layout/Header'
import { Squares2X2Icon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid'
import { CustomRowForm } from '../../components/customRows/CustomRowForm'
import { CustomRowCard } from '../../components/customRows/CustomRowCard'
import { useSessionStore } from '../../stores/sessionStore'
import { useCustomRowsStore } from '../../stores/customRowsStore'
import { useAppStore } from '../../stores/appStore'
import { CustomRow, CustomRowFormData, CUSTOM_ROW_CONSTRAINTS } from '../../types/customRows'
import { GuestModeNotification } from '../../components/auth/GuestModeNotification'
import { useAuthStatus } from '../../hooks/useAuthStatus'

type ViewMode = 'list' | 'create' | 'edit'

const RowsPage = () => {
    const { isGuest, isInitialized } = useAuthStatus()
    const [viewMode, setViewMode] = useState<ViewMode>('list')
    const [editingRow, setEditingRow] = useState<CustomRow | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    // Stores
    const getUserId = useSessionStore((state) => state.getUserId)
    const { getRows, setRows, addRow, updateRow, removeRow, setLoading, setError } =
        useCustomRowsStore()
    const { modal, showToast } = useAppStore()
    const showModal = modal.isOpen

    const userId = getUserId()
    const rows = userId ? getRows(userId) : []
    const atMaxRows = rows.length >= CUSTOM_ROW_CONSTRAINTS.MAX_ROWS_PER_USER

    // Filter rows based on search query
    const filteredRows = searchQuery.trim()
        ? rows.filter((row) => row.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : rows

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
            <div
                className={`relative min-h-screen overflow-x-clip ${showModal && `overflow-y-hidden`} bg-gradient-to-b`}
            >
                <Header />
                <main className="relative pl-4 pb-24 lg:space-y-24 lg:pl-16">
                    <div className="flex flex-col space-y-8 py-16 md:space-y-12 md:py-20 lg:py-24">
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">🔒</div>
                            <h2 className="text-2xl font-semibold text-white mb-2">
                                Authentication Required
                            </h2>
                            <p className="text-gray-400">
                                Please sign in to manage your custom rows.
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div
            className={`relative min-h-screen overflow-x-clip ${showModal && `overflow-y-hidden`} bg-gradient-to-b`}
        >
            <Header />

            <main className="relative pl-4 pb-24 lg:space-y-24 lg:pl-16">
                <div className="flex flex-col space-y-8 py-16 md:space-y-12 md:py-20 lg:py-24">
                    {/* Header Section */}
                    <div className="space-y-6">
                        <div className="flex items-center space-x-3 pt-8 sm:pt-10 md:pt-12">
                            <Squares2X2Icon className="w-8 h-8 text-red-500" />
                            <h1 className="text-3xl font-bold text-white md:text-4xl lg:text-5xl">
                                My Rows
                            </h1>
                        </div>

                        <p className="text-gray-400 max-w-2xl">
                            Create and manage personalized content rows with custom genre filters
                        </p>

                        {isInitialized && isGuest && <GuestModeNotification align="left" />}

                        {/* Action Buttons Row */}
                        {viewMode === 'list' && rows.length > 0 && (
                            <div className="flex items-center space-x-4 py-3 mb-4 border-b border-gray-700/30">
                                {/* Stats */}
                                <div className="text-lg font-semibold text-white">
                                    {rows.length} row{rows.length !== 1 ? 's' : ''} •{' '}
                                    {rows.filter((r) => r.enabled).length} enabled
                                </div>

                                {/* Create Button */}
                                <button
                                    onClick={() => setViewMode('create')}
                                    disabled={atMaxRows}
                                    className="flex items-center space-x-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span>Create Row</span>
                                </button>
                            </div>
                        )}

                        {atMaxRows && viewMode === 'list' && (
                            <div className="p-4 bg-yellow-600/20 border border-yellow-600/50 rounded-lg">
                                <p className="text-yellow-400">
                                    You&apos;ve reached the maximum of{' '}
                                    {CUSTOM_ROW_CONSTRAINTS.MAX_ROWS_PER_USER} custom rows. Delete a
                                    row to create a new one.
                                </p>
                            </div>
                        )}

                        {/* Search Bar - Only show in list view */}
                        {viewMode === 'list' && rows.length > 0 && (
                            <div className="max-w-md">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search your rows..."
                                        className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content Sections */}
                    {viewMode === 'list' && (
                        <>
                            {filteredRows.length === 0 ? (
                                <div className="text-center py-16">
                                    <div className="text-6xl mb-4">📊</div>
                                    <h2 className="text-2xl font-semibold text-white mb-2">
                                        {searchQuery.trim()
                                            ? 'No rows found'
                                            : 'No Custom Rows Yet'}
                                    </h2>
                                    <p className="text-gray-400 mb-8">
                                        {searchQuery.trim()
                                            ? 'Try a different search term'
                                            : 'Create your first custom row to get started!'}
                                    </p>
                                    {!searchQuery.trim() && (
                                        <button
                                            onClick={() => setViewMode('create')}
                                            className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
                                        >
                                            <PlusIcon className="w-5 h-5" />
                                            Create Your First Row
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4 max-w-5xl">
                                    {filteredRows.map((row) => (
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
                        <div className="max-w-2xl">
                            <h2 className="text-2xl font-bold text-white mb-6">
                                Create Custom Row
                            </h2>
                            <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-6">
                                <CustomRowForm onSubmit={handleCreate} onCancel={handleCancel} />
                            </div>
                        </div>
                    )}

                    {viewMode === 'edit' && editingRow && (
                        <div className="max-w-2xl">
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
            </main>
        </div>
    )
}

export default RowsPage
