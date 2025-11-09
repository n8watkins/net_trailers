'use client'

import { useState, useEffect, useMemo } from 'react'
import {
    XMarkIcon,
    PlusIcon,
    FilmIcon,
    TvIcon,
    Squares2X2Icon,
    ArrowPathIcon,
} from '@heroicons/react/24/solid'
import { SortableCustomRowCard } from '../customRows/SortableCustomRowCard'
import { useSessionStore } from '../../stores/sessionStore'
import { useCustomRowsStore } from '../../stores/customRowsStore'
import { useAppStore } from '../../stores/appStore'
import { CustomRow, DisplayRow } from '../../types/customRows'
import { CustomRowsFirestore } from '../../utils/firestore/customRows'
import { SystemRowStorage } from '../../utils/systemRowStorage'
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

export function RowEditorModal({ isOpen, onClose, pageType }: RowEditorModalProps) {
    const [editingSystemRow, setEditingSystemRow] = useState<{ id: string; name: string } | null>(
        null
    )

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
    const { showToast, openCustomRowModal, openAuthModal } = useAppStore()

    const userId = getUserId()
    const sessionType = useSessionStore((state) => state.sessionType)
    const isGuest = sessionType === 'guest'

    // Map page type to media type
    const mediaType = pageType === 'home' ? 'both' : pageType === 'movies' ? 'movie' : 'tv'

    // Get rows for this page's media type
    const displayRows = userId ? getDisplayRowsByMediaType(userId, mediaType) : []

    // For guests: only show system rows. For authenticated: show all rows
    const filteredRows = isGuest ? displayRows.filter((row) => row.isSystemRow) : displayRows

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // filteredRows already set above based on guest/auth status

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

    // Load system row preferences when modal opens
    useEffect(() => {
        if (!userId || !isOpen) return

        const loadData = async () => {
            setLoading(true)
            try {
                if (isGuest) {
                    // Guests: only load system preferences from localStorage
                    const [systemPrefs, deletedRows] = await Promise.all([
                        SystemRowStorage.getSystemRowPreferences(userId, true),
                        SystemRowStorage.getDeletedSystemRows(userId, true),
                    ])
                    setSystemRowPreferences(userId, systemPrefs)
                    setDeletedSystemRows(userId, deletedRows)
                } else {
                    // Authenticated: load both custom rows and system preferences from Firebase
                    const [customRows, systemPrefs, deletedRows] = await Promise.all([
                        CustomRowsFirestore.getUserCustomRows(userId),
                        SystemRowStorage.getSystemRowPreferences(userId, false),
                        SystemRowStorage.getDeletedSystemRows(userId, false),
                    ])
                    setRows(userId, customRows)
                    setSystemRowPreferences(userId, systemPrefs)
                    setDeletedSystemRows(userId, deletedRows)
                }
            } catch (error) {
                console.error('Error loading collections:', error)
                showToast('error', 'Failed to load collections')
                setError((error as Error).message)
            } finally {
                setLoading(false)
            }
        }

        loadData()
    }, [
        userId,
        isOpen,
        isGuest,
        setRows,
        setSystemRowPreferences,
        setDeletedSystemRows,
        setLoading,
        setError,
        showToast,
    ])

    // Handle drag end for reordering collections
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

        // Persist to storage (localStorage for guests, Firebase for authenticated)
        try {
            // Update custom rows (authenticated users only)
            if (!isGuest) {
                const customRowUpdates = newOrder.filter((r) => !r.isSystemRow)
                if (customRowUpdates.length > 0) {
                    await CustomRowsFirestore.reorderCustomRows(
                        userId,
                        customRowUpdates.map((r) => r.id)
                    )
                }
            }

            // Update system rows
            const systemRowUpdates = newOrder.filter((r) => r.isSystemRow)
            for (let i = 0; i < systemRowUpdates.length; i++) {
                const r = systemRowUpdates[i]
                await SystemRowStorage.updateSystemRowOrder(userId, r.id, i, isGuest)
            }
        } catch (error) {
            console.error('Error reordering collections:', error)
            showToast('error', 'Failed to save collection order')
            // Reload to get correct order
            if (isGuest) {
                const systemPrefs = await SystemRowStorage.getSystemRowPreferences(userId, true)
                setSystemRowPreferences(userId, systemPrefs)
            } else {
                const [customRows, systemPrefs] = await Promise.all([
                    CustomRowsFirestore.getUserCustomRows(userId),
                    SystemRowStorage.getSystemRowPreferences(userId, false),
                ])
                setRows(userId, customRows)
                setSystemRowPreferences(userId, systemPrefs)
            }
        }
    }

    // Delete collection (system or custom)
    const handleDelete = async (row: DisplayRow) => {
        if (!userId) return

        try {
            if (row.isSystemRow) {
                await SystemRowStorage.deleteSystemRow(userId, row.id, isGuest)
                deleteSystemRowStore(userId, row.id)
                showToast('success', `"${row.name}" deleted successfully`)
            } else {
                // Custom row deletion (authenticated users only)
                await CustomRowsFirestore.deleteCustomRow(userId, row.id)
                removeRow(userId, row.id)
                showToast('success', `"${row.name}" deleted successfully`)
            }
        } catch (error) {
            console.error('Error deleting collection:', error)
            showToast('error', (error as Error).message)
        }
    }

    // No longer needed - removed toggle enabled functionality

    // Edit collection
    const handleEdit = (row: DisplayRow) => {
        if (row.isSystemRow) {
            // Open edit modal for system collections
            setEditingSystemRow({ id: row.id, name: row.name })
        } else {
            // Open modal for custom rows (authenticated users only)
            if (isGuest) {
                openAuthModal('signin')
                return
            }
            openCustomRowModal('edit', row.id)
        }
    }

    // Update system row name
    const handleUpdateSystemRowName = async (systemRowId: string, newName: string) => {
        if (!userId) return

        try {
            await SystemRowStorage.updateSystemRowName(userId, systemRowId, newName, isGuest)
            // Reload preferences to get updated name
            const systemPrefs = await SystemRowStorage.getSystemRowPreferences(userId, isGuest)
            setSystemRowPreferences(userId, systemPrefs)
            showToast('success', 'Collection name updated')
            setEditingSystemRow(null)
        } catch (error) {
            console.error('Error updating system row name:', error)
            showToast('error', (error as Error).message)
        }
    }

    // Create new collection
    const handleCreate = () => {
        if (isGuest) {
            // Show auth modal for guests
            openAuthModal('signin')
            showToast('error', 'Sign in required', 'Please sign in to create custom collections')
            return
        }
        // Open custom row modal for authenticated users
        openCustomRowModal('create')
    }

    // Reset default collections
    const handleResetDefaultRows = async () => {
        if (!userId) return

        try {
            await SystemRowStorage.resetDefaultRows(userId, mediaType, isGuest)
            // Reload data
            if (isGuest) {
                const [systemPrefs, deletedRows] = await Promise.all([
                    SystemRowStorage.getSystemRowPreferences(userId, true),
                    SystemRowStorage.getDeletedSystemRows(userId, true),
                ])
                setSystemRowPreferences(userId, systemPrefs)
                setDeletedSystemRows(userId, deletedRows)
            } else {
                const [customRows, systemPrefs, deletedRows] = await Promise.all([
                    CustomRowsFirestore.getUserCustomRows(userId),
                    SystemRowStorage.getSystemRowPreferences(userId, false),
                    SystemRowStorage.getDeletedSystemRows(userId, false),
                ])
                setRows(userId, customRows)
                setSystemRowPreferences(userId, systemPrefs)
                setDeletedSystemRows(userId, deletedRows)
            }
            showToast('success', 'Default collections restored successfully')
        } catch (error) {
            console.error('Error resetting default collections:', error)
            showToast('error', (error as Error).message)
        }
    }

    // Move collection up (keyboard accessibility)
    const handleMoveUp = async (row: DisplayRow) => {
        if (!userId) return

        const rows = filteredRows
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
            // Update custom rows (authenticated users only)
            if (!isGuest) {
                const customRowUpdates = newOrder.filter((r) => !r.isSystemRow)
                if (customRowUpdates.length > 0) {
                    await CustomRowsFirestore.reorderCustomRows(
                        userId,
                        customRowUpdates.map((r) => r.id)
                    )
                }
            }

            // Update system rows
            const systemRowUpdates = newOrder.filter((r) => r.isSystemRow)
            for (let i = 0; i < systemRowUpdates.length; i++) {
                const r = systemRowUpdates[i]
                await SystemRowStorage.updateSystemRowOrder(userId, r.id, i, isGuest)
            }
        } catch (error) {
            console.error('Error moving collection up:', error)
            showToast('error', 'Failed to save collection order')
        }
    }

    // Move collection down (keyboard accessibility)
    const handleMoveDown = async (row: DisplayRow) => {
        if (!userId) return

        const rows = filteredRows
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
            // Update custom rows (authenticated users only)
            if (!isGuest) {
                const customRowUpdates = newOrder.filter((r) => !r.isSystemRow)
                if (customRowUpdates.length > 0) {
                    await CustomRowsFirestore.reorderCustomRows(
                        userId,
                        customRowUpdates.map((r) => r.id)
                    )
                }
            }

            // Update system rows
            const systemRowUpdates = newOrder.filter((r) => r.isSystemRow)
            for (let i = 0; i < systemRowUpdates.length; i++) {
                const r = systemRowUpdates[i]
                await SystemRowStorage.updateSystemRowOrder(userId, r.id, i, isGuest)
            }
        } catch (error) {
            console.error('Error moving collection down:', error)
            showToast('error', 'Failed to save collection order')
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
                        <h2 className="text-2xl font-bold text-white">
                            Edit {pageTitle} Collections
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleCreate}
                            className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                            title={
                                isGuest
                                    ? 'Sign in to create custom collections'
                                    : 'Create a new custom collection'
                            }
                        >
                            <PlusIcon className="w-4 h-4" />
                            <span>New Collection</span>
                        </button>
                        <button
                            onClick={handleResetDefaultRows}
                            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                            title="Restore all default system collections"
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

                {/* Rows List */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-2">
                    {filteredRows.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-400">
                                No {pageTitle.toLowerCase()} collections yet. Create your first
                                collection!
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

            {/* System Collection Edit Modal - Overlays the editor */}
            {editingSystemRow && (
                <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center p-4"
                    onClick={() => setEditingSystemRow(null)}
                >
                    <div
                        className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-md w-full shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold text-white mb-4">Edit Collection Name</h3>
                        <input
                            type="text"
                            defaultValue={editingSystemRow.name}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const input = e.currentTarget
                                    if (
                                        input.value.trim() &&
                                        input.value !== editingSystemRow.name
                                    ) {
                                        handleUpdateSystemRowName(
                                            editingSystemRow.id,
                                            input.value.trim()
                                        )
                                    }
                                } else if (e.key === 'Escape') {
                                    setEditingSystemRow(null)
                                }
                            }}
                            className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                            placeholder="Collection name"
                            autoFocus
                        />
                        <div className="flex gap-3 mt-4">
                            <button
                                onClick={() => {
                                    const input = document.querySelector<HTMLInputElement>(
                                        'input[placeholder="Collection name"]'
                                    )
                                    if (
                                        input?.value.trim() &&
                                        input.value !== editingSystemRow.name
                                    ) {
                                        handleUpdateSystemRowName(
                                            editingSystemRow.id,
                                            input.value.trim()
                                        )
                                    }
                                }}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Save
                            </button>
                            <button
                                onClick={() => setEditingSystemRow(null)}
                                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
