'use client'

import { useState, useEffect, useMemo } from 'react'
import Header from '../../components/layout/Header'
import {
    Squares2X2Icon,
    PlusIcon,
    MagnifyingGlassIcon,
    FilmIcon,
    TvIcon,
} from '@heroicons/react/24/solid'
import { SortableCustomRowCard } from '../../components/customRows/SortableCustomRowCard'
import { useSessionStore } from '../../stores/sessionStore'
import { useCustomRowsStore } from '../../stores/customRowsStore'
import { useAppStore } from '../../stores/appStore'
import { CustomRow, DisplayRow, getMaxRowsForUser } from '../../types/customRows'
import { GuestModeNotification } from '../../components/auth/GuestModeNotification'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import { CustomRowsFirestore } from '../../utils/firestore/customRows'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'

const RowsPage = () => {
    const { isGuest, isInitialized } = useAuthStatus()
    const [searchQuery, setSearchQuery] = useState('')

    // Stores
    const getUserId = useSessionStore((state: any) => state.getUserId)
    const {
        getRows,
        setRows,
        removeRow,
        updateRow,
        setLoading,
        setError,
        getDisplayRowsByMediaType,
        setSystemRowPreferences,
        setDeletedSystemRows,
        toggleSystemRow: toggleSystemRowStore,
        updateSystemRowOrder,
    } = useCustomRowsStore()
    const { modal, showToast, openCustomRowModal } = useAppStore()
    const showModal = modal.isOpen

    const userId = getUserId()
    const customRows = userId ? getRows(userId) : []
    const maxRows = getMaxRowsForUser(isGuest)
    const atMaxRows = customRows.length >= maxRows

    // Get rows by media type (includes both system and custom)
    const movieRows = userId ? getDisplayRowsByMediaType(userId, 'movie') : []
    const tvRows = userId ? getDisplayRowsByMediaType(userId, 'tv') : []
    const homeRows = userId ? getDisplayRowsByMediaType(userId, 'both') : []

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Filter rows based on search query (optimized with useMemo)
    const filteredMovieRows = useMemo(() => {
        if (!searchQuery.trim()) return movieRows
        const lowerQuery = searchQuery.toLowerCase()
        return movieRows.filter((row) => row.name.toLowerCase().includes(lowerQuery))
    }, [movieRows, searchQuery])

    const filteredTvRows = useMemo(() => {
        if (!searchQuery.trim()) return tvRows
        const lowerQuery = searchQuery.toLowerCase()
        return tvRows.filter((row) => row.name.toLowerCase().includes(lowerQuery))
    }, [tvRows, searchQuery])

    const filteredHomeRows = useMemo(() => {
        if (!searchQuery.trim()) return homeRows
        const lowerQuery = searchQuery.toLowerCase()
        return homeRows.filter((row) => row.name.toLowerCase().includes(lowerQuery))
    }, [homeRows, searchQuery])

    const totalRows = movieRows.length + tvRows.length + homeRows.length
    const hasAnyRows = totalRows > 0

    // Load rows and preferences on mount (guests can now create custom rows too)
    useEffect(() => {
        if (!userId || !isInitialized) return

        const loadData = async () => {
            setLoading(true)
            try {
                // Load custom rows, system row preferences, and deleted rows in parallel
                const [customRows, systemPrefs, deletedRows] = await Promise.all([
                    CustomRowsFirestore.getUserCustomRows(userId),
                    CustomRowsFirestore.getSystemRowPreferences(userId),
                    CustomRowsFirestore.getDeletedSystemRows(userId),
                ])
                setRows(userId, customRows)
                setSystemRowPreferences(userId, systemPrefs)
                setDeletedSystemRows(userId, deletedRows)
            } catch (error) {
                console.error('Error loading rows:', error)
                showToast('error', 'Failed to load custom rows')
                setError((error as Error).message)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [
        userId,
        isInitialized,
        setRows,
        setSystemRowPreferences,
        setDeletedSystemRows,
        setLoading,
        setError,
        showToast,
    ])

    // Handle drag end for reordering rows within same column (both system and custom)
    const handleDragEnd = async (event: DragEndEvent, mediaType: 'movie' | 'tv' | 'both') => {
        const { active, over } = event

        if (!over || active.id === over.id || !userId) return

        // Get the rows for this specific media type
        const rows = mediaType === 'movie' ? movieRows : mediaType === 'tv' ? tvRows : homeRows

        const oldIndex = rows.findIndex((r) => r.id === active.id)
        const newIndex = rows.findIndex((r) => r.id === over.id)

        if (oldIndex === -1 || newIndex === -1) return

        // Create new order array
        const newOrder = arrayMove(rows, oldIndex, newIndex)

        // Update order in store optimistically for all rows
        newOrder.forEach((row, index) => {
            if (row.isSystemRow) {
                updateSystemRowOrder(userId, row.id, index)
            } else {
                updateRow(userId, row.id, { order: index } as Partial<CustomRow>)
            }
        })

        // Persist to Firestore
        try {
            // Update custom rows
            const customRowUpdates = newOrder
                .filter((r) => !r.isSystemRow)
                .map((r, index) => ({ id: r.id, index }))

            if (customRowUpdates.length > 0) {
                const customRowIds = customRowUpdates.map((u) => u.id)
                await CustomRowsFirestore.reorderCustomRows(userId, customRowIds)
            }

            // Update system rows
            const systemRowUpdates = newOrder
                .filter((r) => r.isSystemRow)
                .map((r, index) => ({ id: r.id, index }))

            for (const update of systemRowUpdates) {
                await CustomRowsFirestore.updateSystemRowOrder(userId, update.id, update.index)
            }
        } catch (error) {
            console.error('Error reordering rows:', error)
            showToast('error', 'Failed to save row order')
            // Reload to get correct order
            const [customRows, systemPrefs] = await Promise.all([
                CustomRowsFirestore.getUserCustomRows(userId),
                CustomRowsFirestore.getSystemRowPreferences(userId),
            ])
            setRows(userId, customRows)
            setSystemRowPreferences(userId, systemPrefs)
        }
    }

    // Delete custom row
    const handleDelete = async (row: DisplayRow) => {
        if (!userId || row.isSystemRow) return

        try {
            await CustomRowsFirestore.deleteCustomRow(userId, row.id)
            removeRow(userId, row.id)
            showToast('success', 'Row deleted successfully')
        } catch (error) {
            console.error('Error deleting row:', error)
            showToast('error', (error as Error).message)
        }
    }

    // Toggle enabled (works for both system and custom rows)
    const handleToggleEnabled = async (row: DisplayRow) => {
        if (!userId) return

        try {
            if (row.isSystemRow) {
                // Toggle system row
                const newEnabledStatus = await CustomRowsFirestore.toggleSystemRow(userId, row.id)
                toggleSystemRowStore(userId, row.id)
                showToast(
                    'success',
                    newEnabledStatus ? `"${row.name}" enabled` : `"${row.name}" disabled`
                )
            } else {
                // Toggle custom row
                const newEnabledStatus = await CustomRowsFirestore.toggleRowEnabled(userId, row.id)
                updateRow(userId, row.id, { enabled: newEnabledStatus } as Partial<CustomRow>)
                showToast(
                    'success',
                    newEnabledStatus ? `"${row.name}" enabled` : `"${row.name}" disabled`
                )
            }
        } catch (error) {
            console.error('Error toggling row:', error)
            showToast('error', (error as Error).message)
        }
    }

    // Edit custom row - opens modal (only for custom rows)
    const handleEdit = (row: DisplayRow) => {
        if (row.isSystemRow) return
        openCustomRowModal('edit', row.id)
    }

    // Create row - opens modal
    const handleCreate = () => {
        openCustomRowModal('create')
    }

    // Move row up (keyboard accessibility)
    const handleMoveUp = async (row: DisplayRow) => {
        if (!userId) return

        // Determine which array this row belongs to
        const rows =
            row.mediaType === 'movie' ? movieRows : row.mediaType === 'tv' ? tvRows : homeRows
        const currentIndex = rows.findIndex((r) => r.id === row.id)

        if (currentIndex <= 0) return // Already at top

        const newIndex = currentIndex - 1
        const newOrder = arrayMove(rows, currentIndex, newIndex)

        // Update order in store optimistically for all rows
        newOrder.forEach((r, index) => {
            if (r.isSystemRow) {
                updateSystemRowOrder(userId, r.id, index)
            } else {
                updateRow(userId, r.id, { order: index } as Partial<CustomRow>)
            }
        })

        // Persist to Firestore
        try {
            const customRowUpdates = newOrder.filter((r) => !r.isSystemRow)
            if (customRowUpdates.length > 0) {
                await CustomRowsFirestore.reorderCustomRows(
                    userId,
                    customRowUpdates.map((r) => r.id)
                )
            }

            const systemRowUpdates = newOrder.filter((r) => r.isSystemRow)
            for (let i = 0; i < systemRowUpdates.length; i++) {
                const r = systemRowUpdates[i]
                await CustomRowsFirestore.updateSystemRowOrder(userId, r.id, i)
            }
        } catch (error) {
            console.error('Error moving row up:', error)
            showToast('error', 'Failed to save row order')
        }
    }

    // Move row down (keyboard accessibility)
    const handleMoveDown = async (row: DisplayRow) => {
        if (!userId) return

        // Determine which array this row belongs to
        const rows =
            row.mediaType === 'movie' ? movieRows : row.mediaType === 'tv' ? tvRows : homeRows
        const currentIndex = rows.findIndex((r) => r.id === row.id)

        if (currentIndex === -1 || currentIndex >= rows.length - 1) return // Already at bottom

        const newIndex = currentIndex + 1
        const newOrder = arrayMove(rows, currentIndex, newIndex)

        // Update order in store optimistically for all rows
        newOrder.forEach((r, index) => {
            if (r.isSystemRow) {
                updateSystemRowOrder(userId, r.id, index)
            } else {
                updateRow(userId, r.id, { order: index } as Partial<CustomRow>)
            }
        })

        // Persist to Firestore
        try {
            const customRowUpdates = newOrder.filter((r) => !r.isSystemRow)
            if (customRowUpdates.length > 0) {
                await CustomRowsFirestore.reorderCustomRows(
                    userId,
                    customRowUpdates.map((r) => r.id)
                )
            }

            const systemRowUpdates = newOrder.filter((r) => r.isSystemRow)
            for (let i = 0; i < systemRowUpdates.length; i++) {
                const r = systemRowUpdates[i]
                await CustomRowsFirestore.updateSystemRowOrder(userId, r.id, i)
            }
        } catch (error) {
            console.error('Error moving row down:', error)
            showToast('error', 'Failed to save row order')
        }
    }

    // No user ID
    if (!userId) {
        return (
            <div
                className={`relative min-h-screen overflow-x-clip ${showModal && `overflow-y-hidden`} bg-gradient-to-b`}
            >
                <Header />
                <main className="relative pb-24 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-[1600px] mx-auto flex flex-col space-y-8 py-16 md:space-y-12 md:py-20 lg:py-24">
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

            <main className="relative pb-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-[1600px] mx-auto flex flex-col space-y-8 py-16 md:space-y-12 md:py-20 lg:py-24">
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
                        {hasAnyRows && !isGuest && (
                            <div className="flex items-center space-x-4 py-3 mb-4 border-b border-gray-700/30">
                                {/* Stats */}
                                <div className="text-lg font-semibold text-white">
                                    {totalRows} total • {customRows.length} custom •{' '}
                                    {movieRows.filter((r) => r.enabled).length +
                                        tvRows.filter((r) => r.enabled).length +
                                        homeRows.filter((r) => r.enabled).length}{' '}
                                    enabled
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
                                    You&apos;ve reached the maximum of {maxRows} custom row
                                    {maxRows !== 1 ? 's' : ''}
                                    {isGuest && ' (guest limit)'}. Delete a row to create a new one.
                                </p>
                            </div>
                        )}

                        {/* Search Bar */}
                        {hasAnyRows && (
                            <div className="max-w-md">
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Search all rows..."
                                        className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content Section */}
                    {!hasAnyRows ? (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">📊</div>
                            <h2 className="text-2xl font-semibold text-white mb-2">No Rows Yet</h2>
                            <p className="text-gray-400 mb-8">
                                Create your first custom row to get started!
                            </p>
                            <button
                                onClick={handleCreate}
                                className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-red-700 transition-colors"
                            >
                                <PlusIcon className="w-5 h-5" />
                                Create Your First Row
                            </button>
                        </div>
                    ) : (
                        <div className="flex justify-center w-full px-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 w-full max-w-[1600px]">
                                {/* Home (Both) Column */}
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-gray-700/50">
                                        <Squares2X2Icon className="w-5 h-5 text-red-500" />
                                        <h2 className="text-xl font-bold text-white">Home</h2>
                                        <span className="text-sm text-gray-400">
                                            ({filteredHomeRows.length})
                                        </span>
                                    </div>
                                    {filteredHomeRows.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-gray-400 text-sm">
                                                {searchQuery.trim()
                                                    ? `No home rows match "${searchQuery}". Try a different search term.`
                                                    : 'No home rows yet. System rows can be enabled in settings, or create a custom row with mediaType "both".'}
                                            </p>
                                        </div>
                                    ) : (
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={(e) => handleDragEnd(e, 'both')}
                                        >
                                            <SortableContext
                                                items={filteredHomeRows.map((r) => r.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {filteredHomeRows.map((row) => (
                                                    <SortableCustomRowCard
                                                        key={row.id}
                                                        row={row}
                                                        onEdit={handleEdit}
                                                        onDelete={handleDelete}
                                                        onToggleEnabled={handleToggleEnabled}
                                                        onMoveUp={handleMoveUp}
                                                        onMoveDown={handleMoveDown}
                                                    />
                                                ))}
                                            </SortableContext>
                                        </DndContext>
                                    )}
                                </div>

                                {/* TV Shows Column */}
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-gray-700/50">
                                        <TvIcon className="w-5 h-5 text-red-500" />
                                        <h2 className="text-xl font-bold text-white">TV Shows</h2>
                                        <span className="text-sm text-gray-400">
                                            ({filteredTvRows.length})
                                        </span>
                                    </div>
                                    {filteredTvRows.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-gray-400 text-sm">
                                                {searchQuery.trim()
                                                    ? `No TV show rows match "${searchQuery}". Try a different search term.`
                                                    : 'No TV show rows yet. Create a custom row with mediaType "tv" or enable system TV rows.'}
                                            </p>
                                        </div>
                                    ) : (
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={(e) => handleDragEnd(e, 'tv')}
                                        >
                                            <SortableContext
                                                items={filteredTvRows.map((r) => r.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {filteredTvRows.map((row) => (
                                                    <SortableCustomRowCard
                                                        key={row.id}
                                                        row={row}
                                                        onEdit={handleEdit}
                                                        onDelete={handleDelete}
                                                        onToggleEnabled={handleToggleEnabled}
                                                        onMoveUp={handleMoveUp}
                                                        onMoveDown={handleMoveDown}
                                                    />
                                                ))}
                                            </SortableContext>
                                        </DndContext>
                                    )}
                                </div>

                                {/* Movies Column */}
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-gray-700/50">
                                        <FilmIcon className="w-5 h-5 text-red-500" />
                                        <h2 className="text-xl font-bold text-white">Movies</h2>
                                        <span className="text-sm text-gray-400">
                                            ({filteredMovieRows.length})
                                        </span>
                                    </div>
                                    {filteredMovieRows.length === 0 ? (
                                        <div className="text-center py-8">
                                            <p className="text-gray-400 text-sm">
                                                {searchQuery.trim()
                                                    ? `No movie rows match "${searchQuery}". Try a different search term.`
                                                    : 'No movie rows yet. Create a custom row with mediaType "movie" or enable system movie rows.'}
                                            </p>
                                        </div>
                                    ) : (
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={(e) => handleDragEnd(e, 'movie')}
                                        >
                                            <SortableContext
                                                items={filteredMovieRows.map((r) => r.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {filteredMovieRows.map((row) => (
                                                    <SortableCustomRowCard
                                                        key={row.id}
                                                        row={row}
                                                        onEdit={handleEdit}
                                                        onDelete={handleDelete}
                                                        onToggleEnabled={handleToggleEnabled}
                                                        onMoveUp={handleMoveUp}
                                                        onMoveDown={handleMoveDown}
                                                    />
                                                ))}
                                            </SortableContext>
                                        </DndContext>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

export default RowsPage
