'use client'

import { useState, useEffect } from 'react'
import Header from '../../components/layout/Header'
import { Squares2X2Icon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid'
import { CustomRowCard } from '../../components/customRows/CustomRowCard'
import { useSessionStore } from '../../stores/sessionStore'
import { useCustomRowsStore } from '../../stores/customRowsStore'
import { useAppStore } from '../../stores/appStore'
import { CustomRow, CUSTOM_ROW_CONSTRAINTS } from '../../types/customRows'
import { GuestModeNotification } from '../../components/auth/GuestModeNotification'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import { CustomRowsFirestore } from '../../utils/firestore/customRows'

const RowsPage = () => {
    const { isGuest, isInitialized } = useAuthStatus()
    const [searchQuery, setSearchQuery] = useState('')

    // Stores
    const getUserId = useSessionStore((state) => state.getUserId)
    const { getRows, setRows, removeRow, updateRow, setLoading, setError } = useCustomRowsStore()
    const { modal, showToast, openCustomRowModal } = useAppStore()
    const showModal = modal.isOpen

    const userId = getUserId()
    const rows = userId ? getRows(userId) : []
    const atMaxRows = rows.length >= CUSTOM_ROW_CONSTRAINTS.MAX_ROWS_PER_USER

    // Filter rows based on search query
    const filteredRows = searchQuery.trim()
        ? rows.filter((row) => row.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : rows

    // Load rows on mount (only for authenticated users, not guests)
    useEffect(() => {
        if (!userId || !isInitialized) return
        if (isGuest) {
            // Guest users can't use custom rows (requires Firebase Auth)
            setLoading(false)
            return
        }

        const loadRows = async () => {
            setLoading(true)
            try {
                const rows = await CustomRowsFirestore.getUserCustomRows(userId)
                setRows(userId, rows)
            } catch (error) {
                console.error('Error loading rows:', error)
                showToast('error', 'Failed to load custom rows')
                setError((error as Error).message)
            } finally {
                setLoading(false)
            }
        }

        loadRows()
    }, [userId, isGuest, isInitialized, setRows, setLoading, setError, showToast])

    // Delete row
    const handleDelete = async (row: CustomRow) => {
        if (!userId) return

        try {
            await CustomRowsFirestore.deleteCustomRow(userId, row.id)
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
            const newEnabledStatus = await CustomRowsFirestore.toggleRowEnabled(userId, row.id)
            updateRow(userId, row.id, { ...row, enabled: newEnabledStatus })
            showToast('success', newEnabledStatus ? 'Row enabled' : 'Row disabled')
        } catch (error) {
            console.error('Error toggling row:', error)
            showToast('error', (error as Error).message)
        }
    }

    // Edit row - opens modal
    const handleEdit = (row: CustomRow) => {
        openCustomRowModal('edit', row.id)
    }

    // Create row - opens modal
    const handleCreate = () => {
        openCustomRowModal('create')
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
                        {rows.length > 0 && !isGuest && (
                            <div className="flex items-center space-x-4 py-3 mb-4 border-b border-gray-700/30">
                                {/* Stats */}
                                <div className="text-lg font-semibold text-white">
                                    {rows.length} row{rows.length !== 1 ? 's' : ''} •{' '}
                                    {rows.filter((r) => r.enabled).length} enabled
                                </div>

                                {/* Create Button */}
                                <button
                                    onClick={handleCreate}
                                    disabled={atMaxRows}
                                    className="flex items-center space-x-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span>Create Row</span>
                                </button>
                            </div>
                        )}

                        {atMaxRows && (
                            <div className="p-4 bg-yellow-600/20 border border-yellow-600/50 rounded-lg">
                                <p className="text-yellow-400">
                                    You&apos;ve reached the maximum of{' '}
                                    {CUSTOM_ROW_CONSTRAINTS.MAX_ROWS_PER_USER} custom rows. Delete a
                                    row to create a new one.
                                </p>
                            </div>
                        )}

                        {/* Search Bar */}
                        {rows.length > 0 && (
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

                    {/* Content Section */}
                    {filteredRows.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">{isGuest ? '🔒' : '📊'}</div>
                            <h2 className="text-2xl font-semibold text-white mb-2">
                                {isGuest
                                    ? 'Sign In Required'
                                    : searchQuery.trim()
                                      ? 'No rows found'
                                      : 'No Custom Rows Yet'}
                            </h2>
                            <p className="text-gray-400 mb-8">
                                {isGuest
                                    ? 'Custom rows require a Firebase account. Please sign in with Google or email to create custom rows.'
                                    : searchQuery.trim()
                                      ? 'Try a different search term'
                                      : 'Create your first custom row to get started!'}
                            </p>
                            {!searchQuery.trim() && !isGuest && (
                                <button
                                    onClick={handleCreate}
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
                </div>
            </main>
        </div>
    )
}

export default RowsPage
