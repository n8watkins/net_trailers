'use client'

import { useState, useEffect, useMemo } from 'react'
import {
    XMarkIcon,
    PlusIcon,
    FilmIcon,
    TvIcon,
    Squares2X2Icon,
    EyeIcon,
    EyeSlashIcon,
    QueueListIcon,
    ArrowPathIcon,
} from '@heroicons/react/24/solid'
import { SortableCustomRowCard } from '../customRows/SortableCustomRowCard'
import { useSessionStore } from '../../stores/sessionStore'
import { useCustomRowsStore } from '../../stores/customRowsStore'
import { useAppStore } from '../../stores/appStore'
import { CustomRow, DisplayRow } from '../../types/customRows'
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

interface RowEditorModalProps {
    isOpen: boolean
    onClose: () => void
    pageType: 'home' | 'movies' | 'tv'
}

type StatusFilter = 'all' | 'enabled' | 'disabled'

export function RowEditorModal({ isOpen, onClose, pageType }: RowEditorModalProps) {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

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
        deleteSystemRow: deleteSystemRowStore,
        toggleSystemRow: toggleSystemRowStore,
        updateSystemRowOrder,
    } = useCustomRowsStore()
    const { showToast, openCustomRowModal } = useAppStore()

    const userId = getUserId()
    const customRows = userId ? getRows(userId) : []

    // Map page type to media type
    const mediaType = pageType === 'home' ? 'both' : pageType === 'movies' ? 'movie' : 'tv'

    // Get rows for this page's media type
    const displayRows = userId ? getDisplayRowsByMediaType(userId, mediaType) : []

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Filter rows based on status
    const filteredRows = useMemo(() => {
        let rows = displayRows

        // Apply status filter
        if (statusFilter === 'enabled') {
            rows = rows.filter((row) => row.enabled)
        } else if (statusFilter === 'disabled') {
            rows = rows.filter((row) => !row.enabled)
        }

        return rows
    }, [displayRows, statusFilter])

    // Handle body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }

        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    // Load rows and preferences when modal opens
    useEffect(() => {
        if (!userId || !isOpen) return

        const loadData = async () => {
            setLoading(true)
            try {
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
        isOpen,
        setRows,
        setSystemRowPreferences,
        setDeletedSystemRows,
        setLoading,
        setError,
        showToast,
    ])

    // Handle drag end for reordering rows
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event

        if (!over || active.id === over.id || !userId) return

        const rows = filteredRows
        const oldIndex = rows.findIndex((r) => r.id === active.id)
        const newIndex = rows.findIndex((r) => r.id === over.id)

        if (oldIndex === -1 || newIndex === -1) return

        // Create new order array
        const newOrder = arrayMove(rows, oldIndex, newIndex)

        // Update order in store optimistically
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

    // Delete row (custom or deletable system row)
    const handleDelete = async (row: DisplayRow) => {
        if (!userId) return

        // Prevent deletion of core system rows (Trending/Top Rated)
        if (row.isSystemRow && row.canDelete === false) {
            showToast('error', 'Core rows cannot be deleted')
            return
        }

        try {
            if (row.isSystemRow) {
                // Delete system row
                await CustomRowsFirestore.deleteSystemRow(userId, row.id)
                deleteSystemRowStore(userId, row.id)
                showToast('success', `"${row.name}" deleted successfully`)
            } else {
                // Delete custom row
                await CustomRowsFirestore.deleteCustomRow(userId, row.id)
                removeRow(userId, row.id)
                showToast('success', `"${row.name}" deleted successfully`)
            }
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
                const newEnabledStatus = await CustomRowsFirestore.toggleSystemRow(userId, row.id)
                toggleSystemRowStore(userId, row.id)
                showToast(
                    'success',
                    newEnabledStatus ? `"${row.name}" enabled` : `"${row.name}" disabled`
                )
            } else {
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

    // Edit row
    const handleEdit = (row: DisplayRow) => {
        if (row.isSystemRow) {
            // For system rows, use browser prompt for now (simple solution)
            const newName = window.prompt('Enter new name for this row:', row.name)
            if (newName && newName.trim() && newName !== row.name) {
                handleUpdateSystemRowName(row.id, newName.trim())
            }
        } else {
            // Open modal for custom rows
            openCustomRowModal('edit', row.id)
        }
    }

    // Update system row name
    const handleUpdateSystemRowName = async (systemRowId: string, newName: string) => {
        if (!userId) return

        try {
            await CustomRowsFirestore.updateSystemRowName(userId, systemRowId, newName)
            // Reload preferences to get updated name
            const systemPrefs = await CustomRowsFirestore.getSystemRowPreferences(userId)
            setSystemRowPreferences(userId, systemPrefs)
            showToast('success', 'Row name updated')
        } catch (error) {
            console.error('Error updating system row name:', error)
            showToast('error', (error as Error).message)
        }
    }

    // Create row - opens custom row modal
    const handleCreate = () => {
        openCustomRowModal('create')
    }

    // Reset default rows
    const handleResetDefaultRows = async () => {
        if (!userId) return

        try {
            await CustomRowsFirestore.resetDefaultRows(userId, mediaType)
            // Reload data
            const [customRows, systemPrefs, deletedRows] = await Promise.all([
                CustomRowsFirestore.getUserCustomRows(userId),
                CustomRowsFirestore.getSystemRowPreferences(userId),
                CustomRowsFirestore.getDeletedSystemRows(userId),
            ])
            setRows(userId, customRows)
            setSystemRowPreferences(userId, systemPrefs)
            setDeletedSystemRows(userId, deletedRows)
            showToast('success', 'Default rows restored successfully')
        } catch (error) {
            console.error('Error resetting default rows:', error)
            showToast('error', (error as Error).message)
        }
    }

    // Move row up (keyboard accessibility)
    const handleMoveUp = async (row: DisplayRow) => {
        if (!userId) return

        const rows = displayRows
        const currentIndex = rows.findIndex((r) => r.id === row.id)

        if (currentIndex <= 0) return

        const newIndex = currentIndex - 1
        const newOrder = arrayMove(rows, currentIndex, newIndex)

        newOrder.forEach((r, index) => {
            if (r.isSystemRow) {
                updateSystemRowOrder(userId, r.id, index)
            } else {
                updateRow(userId, r.id, { order: index } as Partial<CustomRow>)
            }
        })

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

        const rows = displayRows
        const currentIndex = rows.findIndex((r) => r.id === row.id)

        if (currentIndex === -1 || currentIndex >= rows.length - 1) return

        const newIndex = currentIndex + 1
        const newOrder = arrayMove(rows, currentIndex, newIndex)

        newOrder.forEach((r, index) => {
            if (r.isSystemRow) {
                updateSystemRowOrder(userId, r.id, index)
            } else {
                updateRow(userId, r.id, { order: index } as Partial<CustomRow>)
            }
        })

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

    // Get page title and icon
    const getPageInfo = () => {
        switch (pageType) {
            case 'home':
                return { title: 'Home', icon: Squares2X2Icon }
            case 'movies':
                return { title: 'Movies', icon: FilmIcon }
            case 'tv':
                return { title: 'TV Shows', icon: TvIcon }
        }
    }

    const { title: pageTitle, icon: PageIcon } = getPageInfo()

    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[50000] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-gray-900 border border-gray-700 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                        <PageIcon className="w-6 h-6 text-red-500" />
                        <h2 className="text-2xl font-bold text-white">Edit {pageTitle} Rows</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCreate}
                            className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>Create New Row</span>
                        </button>
                        <button
                            onClick={handleResetDefaultRows}
                            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                            title="Restore all default system rows"
                        >
                            <ArrowPathIcon className="w-4 h-4" />
                            <span>Reset Defaults</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Status Filters */}
                <div className="px-6 pt-6 flex gap-2">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                            statusFilter === 'all'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        <QueueListIcon className="w-4 h-4" />
                        <span>All</span>
                    </button>
                    <button
                        onClick={() => setStatusFilter('enabled')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                            statusFilter === 'enabled'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        <EyeIcon className="w-4 h-4" />
                        <span>Enabled</span>
                    </button>
                    <button
                        onClick={() => setStatusFilter('disabled')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                            statusFilter === 'disabled'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        <EyeSlashIcon className="w-4 h-4" />
                        <span>Disabled</span>
                    </button>
                </div>

                {/* Rows List */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
                    {filteredRows.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-400">
                                {statusFilter === 'enabled'
                                    ? `No enabled ${pageTitle.toLowerCase()} rows yet.`
                                    : statusFilter === 'disabled'
                                      ? `No disabled ${pageTitle.toLowerCase()} rows.`
                                      : `No ${pageTitle.toLowerCase()} rows yet. Create your first row!`}
                            </p>
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={filteredRows.map((r) => r.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                {filteredRows.map((row) => (
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

                {/* Footer */}
                <div className="p-6 border-t border-gray-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}
