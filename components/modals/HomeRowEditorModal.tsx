'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
    XMarkIcon,
    PlusIcon,
    FilmIcon,
    TvIcon,
    Squares2X2Icon,
    ArrowPathIcon,
} from '@heroicons/react/24/solid'
import { SortableCollectionCard } from '../collections/SortableCollectionCard'
import { useSessionStore } from '../../stores/sessionStore'
import { useToastStore } from '../../stores/toastStore'
import { useModalStore } from '../../stores/modalStore'
import { useAuthStore } from '../../stores/authStore'
import { useGuestStore } from '../../stores/guestStore'
import { UserList } from '../../types/collections'
import { SystemRecommendation } from '../../types/recommendations'
import CollectionEditorModal from './CollectionEditorModal'
import SystemRecommendationEditorModal from './SystemRecommendationEditorModal'
import { createDefaultCollectionsForUser } from '../../constants/systemCollections'
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

// DisplayRow type for local display (subset of UserList for the UI)
interface DisplayRow {
    id: string
    name: string
    order: number
    enabled: boolean
    mediaType: 'movie' | 'tv' | 'both'
    genres: string[]
    genreLogic: 'AND' | 'OR'
    isSystemCollection: boolean
    isSystemRecommendation?: boolean // For Trending, Top Rated, Recommended For You
    canDelete?: boolean
    canEdit?: boolean
    color?: string
    emoji?: string
    displayAsRow?: boolean
    createdAt?: number
    updatedAt?: number
    autoUpdateEnabled?: boolean
    updateFrequency?: 'daily' | 'weekly' | 'never'
    lastCheckedAt?: number
    lastUpdateCount?: number
    showOnPublicProfile?: boolean
}

interface HomeRowEditorModalProps {
    isOpen: boolean
    onClose: () => void
    pageType: 'home' | 'movies' | 'tv'
}

export function HomeRowEditorModal({ isOpen, onClose, pageType }: HomeRowEditorModalProps) {
    const router = useRouter()
    // State for CollectionEditorModal (used for user collections only)
    const [editorCollection, setEditorCollection] = useState<UserList | null>(null)
    // State for SystemRecommendationEditorModal (used for Trending, Top Rated, etc.)
    const [editorSystemRec, setEditorSystemRec] = useState<SystemRecommendation | null>(null)
    // Local state for instant drag-and-drop visual updates
    const [localRows, setLocalRows] = useState<DisplayRow[]>([])
    // Filter state for showing all/shown/hidden collections
    const [displayFilter, setDisplayFilter] = useState<'all' | 'shown' | 'hidden'>('all')
    // Track mousedown location for click-outside detection
    const mouseDownTargetRef = useRef<EventTarget | null>(null)
    const modalContainerRef = useRef<HTMLDivElement>(null)

    // Stores
    const getUserId = useSessionStore((state) => state.getUserId)
    const { showToast } = useToastStore()
    const { openAuthModal } = useModalStore()

    // Get user collections - now unified (includes seeded defaults)
    const authCollections = useAuthStore((state) => state.userCreatedWatchlists)
    const guestCollections = useGuestStore((state) => state.userCreatedWatchlists)
    const authUpdateList = useAuthStore((state) => state.updateList)
    const guestUpdateList = useGuestStore((state) => state.updateList)
    const authDeleteList = useAuthStore((state) => state.deleteList)
    const guestDeleteList = useGuestStore((state) => state.deleteList)

    // Get system recommendations
    const authSystemRecommendations = useAuthStore((state) => state.systemRecommendations)
    const guestSystemRecommendations = useGuestStore((state) => state.systemRecommendations)
    const authUpdateSystemRecommendation = useAuthStore((state) => state.updateSystemRecommendation)
    const guestUpdateSystemRecommendation = useGuestStore(
        (state) => state.updateSystemRecommendation
    )

    const userId = getUserId()
    const sessionType = useSessionStore((state) => state.sessionType)
    const isGuest = sessionType === 'guest'

    // Map page type to media type (used for filtering)
    const _mediaType = pageType === 'home' ? 'both' : pageType === 'movies' ? 'movie' : 'tv'

    // Get collections from appropriate store
    const userCollections = isGuest ? guestCollections : authCollections
    const updateList = isGuest ? guestUpdateList : authUpdateList
    const deleteList = isGuest ? guestDeleteList : authDeleteList
    const systemRecommendations = isGuest ? guestSystemRecommendations : authSystemRecommendations
    const updateSystemRecommendation = isGuest
        ? guestUpdateSystemRecommendation
        : authUpdateSystemRecommendation

    // Convert UserList to DisplayRow
    const userListToDisplayRow = useCallback(
        (col: UserList): DisplayRow => ({
            id: col.id,
            name: col.name,
            order: col.order,
            enabled: col.enabled ?? true,
            mediaType: col.mediaType || 'both',
            genres: col.genres || [],
            genreLogic: col.genreLogic || 'OR',
            isSystemCollection: col.isSystemCollection || col.id.startsWith('system-'),
            isSystemRecommendation: false,
            canDelete: col.canDelete,
            canEdit: col.canEdit,
            color: col.color,
            emoji: col.emoji,
            displayAsRow: col.displayAsRow,
            createdAt: col.createdAt,
            updatedAt: col.updatedAt,
            autoUpdateEnabled: col.autoUpdateEnabled,
            updateFrequency: col.updateFrequency,
            lastCheckedAt: col.lastCheckedAt,
            lastUpdateCount: col.lastUpdateCount,
            showOnPublicProfile: col.showOnPublicProfile,
        }),
        []
    )

    // Convert SystemRecommendation to DisplayRow
    const systemRecToDisplayRow = useCallback(
        (rec: SystemRecommendation): DisplayRow => ({
            id: rec.id,
            name: rec.name, // Don't include emoji here - CollectionCard renders it separately
            order: rec.order,
            enabled: rec.enabled,
            mediaType: rec.mediaType || 'both',
            genres: rec.genres || [],
            genreLogic: 'OR',
            isSystemCollection: true,
            isSystemRecommendation: true,
            canDelete: false, // System recommendations cannot be deleted
            // Allow editing for trending and top-rated, but not recommended-for-you
            canEdit: rec.id === 'trending' || rec.id === 'top-rated',
            emoji: rec.emoji,
            displayAsRow: rec.enabled, // System recs use 'enabled' property for display state
            showOnPublicProfile: rec.showOnPublicProfile,
        }),
        []
    )

    // Filter collections for this page type
    const displayRows = useMemo(() => {
        let filteredCollections: DisplayRow[]
        let filteredSystemRecs: DisplayRow[] = []

        // Only show system recommendations on home page
        if (pageType === 'home') {
            // Home shows all collections with mediaType: 'both', regardless of display state
            filteredCollections = userCollections
                .filter((c) => c.mediaType === 'both' || !c.mediaType)
                .map(userListToDisplayRow)

            // Add system recommendations (Trending, Top Rated, Recommended For You)
            filteredSystemRecs = systemRecommendations.map(systemRecToDisplayRow)
        } else if (pageType === 'movies') {
            // Movies page shows all movie collections, regardless of display state
            filteredCollections = userCollections
                .filter((c) => c.mediaType === 'movie')
                .map(userListToDisplayRow)
        } else {
            // TV page shows all TV collections, regardless of display state
            filteredCollections = userCollections
                .filter((c) => c.mediaType === 'tv')
                .map(userListToDisplayRow)
        }

        // Combine system recommendations (first) with user collections
        // System recommendations have their own order, user collections start after
        const maxSysOrder =
            filteredSystemRecs.length > 0
                ? Math.max(...filteredSystemRecs.map((r) => r.order)) + 1
                : 0

        const adjustedCollections = filteredCollections.map((c) => ({
            ...c,
            order: c.order + maxSysOrder + 100, // Offset collections to come after system recs
        }))

        return [...filteredSystemRecs, ...adjustedCollections].sort((a, b) => a.order - b.order)
    }, [
        userCollections,
        pageType,
        userListToDisplayRow,
        systemRecommendations,
        systemRecToDisplayRow,
    ])

    // Drag and drop sensors with activation constraints for smoother dragging
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px movement before drag starts
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Sync localRows from displayRows when data changes
    const displayRowsKey = useMemo(
        () => displayRows.map((r) => `${r.id}:${r.order}`).join(','),
        [displayRows]
    )
    useEffect(() => {
        setLocalRows(displayRows)
    }, [displayRowsKey, displayRows])

    // Filter localRows based on displayFilter
    const filteredLocalRows = useMemo(() => {
        if (displayFilter === 'all') {
            return localRows
        } else if (displayFilter === 'shown') {
            return localRows.filter((row) => row.displayAsRow !== false)
        } else {
            // hidden
            return localRows.filter((row) => row.displayAsRow === false)
        }
    }, [localRows, displayFilter])

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

    // Handle escape key to close modal
    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault()
                onClose()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [isOpen, onClose])

    // Handle drag end for reordering collections
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (!over || active.id === over.id || !userId) return

        const oldIndex = localRows.findIndex((r) => r.id === active.id)
        const newIndex = localRows.findIndex((r) => r.id === over.id)

        if (oldIndex === -1 || newIndex === -1) return

        // Create new order array with updated order values
        const newOrder = arrayMove(localRows, oldIndex, newIndex).map((row, index) => ({
            ...row,
            order: index,
        }))

        // Update local state INSTANTLY for smooth UI
        setLocalRows(newOrder)

        // Persist to stores in background (fire-and-forget)
        setTimeout(() => {
            const persistInBackground = async () => {
                try {
                    const promises = newOrder.map((row, index) => {
                        // Route to correct update function based on row type
                        if (row.isSystemRecommendation) {
                            return updateSystemRecommendation(row.id, { order: index })
                        }
                        return updateList(row.id, { order: index })
                    })
                    await Promise.all(promises)
                } catch (error) {
                    console.error('Failed to save collection order:', error)
                    showToast('error', 'Failed to save collection order')
                }
            }
            persistInBackground()
        }, 0)
    }

    // Delete collection
    const handleDelete = useCallback(
        async (row: DisplayRow) => {
            if (!userId) return

            // Check if this is a core system collection that cannot be deleted
            if (row.isSystemCollection && row.canDelete === false) {
                showToast('error', 'This collection cannot be deleted')
                return
            }

            try {
                await deleteList(row.id)
                showToast('success', `"${row.name}" deleted successfully`)
            } catch (error) {
                console.error('Failed to delete collection:', error)
                showToast('error', (error as Error).message)
            }
        },
        [userId, deleteList, showToast]
    )

    // Edit collection - opens appropriate editor modal based on row type
    const handleEdit = useCallback(
        (row: DisplayRow) => {
            // Check if this is a system recommendation
            if (row.isSystemRecommendation) {
                // Look up the full system recommendation from the store and merge with local row data
                const fullRec = systemRecommendations.find((r) => r.id === row.id)
                if (fullRec) {
                    // System recommendations don't have displayAsRow, so just pass the full rec
                    setEditorSystemRec(fullRec)
                }
                return
            }

            // Look up the full collection from the store and merge with local row data
            const fullCollection = userCollections.find((c) => c.id === row.id)
            if (fullCollection) {
                // Merge local row data (displayAsRow) with store data
                setEditorCollection({
                    ...fullCollection,
                    displayAsRow: row.displayAsRow,
                })
            }
        },
        [userCollections, systemRecommendations]
    )

    // Create new collection
    const handleCreate = () => {
        if (isGuest) {
            // Show auth modal for guests
            openAuthModal('signin')
            showToast('error', 'Sign in required', 'Please sign in to create custom collections')
            return
        }
        // Close this modal and navigate to /collections
        onClose()
        router.push('/collections')
    }

    // Reset system recommendations only
    const handleResetDefaultRows = async () => {
        if (!userId) return

        // Update local state INSTANTLY for snappy UI - only for system recommendations
        setLocalRows((prevRows) =>
            prevRows.map((r) => ({
                ...r,
                displayAsRow: r.isSystemRecommendation ? true : r.displayAsRow,
            }))
        )

        showToast('success', 'System recommendations reset to defaults')

        try {
            // Reset all system recommendations to show and enable them
            const sysRecPromises = systemRecommendations.map((sysRec) =>
                updateSystemRecommendation(sysRec.id, {
                    enabled: true, // Enable display on page
                    showOnPublicProfile: true,
                })
            )

            // Run all updates in parallel
            await Promise.all(sysRecPromises)
        } catch (error) {
            console.error('Failed to reset defaults:', error)
            showToast('error', (error as Error).message)
        }
    }

    // Move collection up (keyboard accessibility)
    const handleMoveUp = useCallback(
        (row: DisplayRow) => {
            if (!userId) return

            const currentIndex = localRows.findIndex((r) => r.id === row.id)
            if (currentIndex <= 0) return

            const newOrder = arrayMove(localRows, currentIndex, currentIndex - 1).map(
                (r, index) => ({
                    ...r,
                    order: index,
                })
            )

            // Update local state instantly
            setLocalRows(newOrder)

            // Persist in background
            setTimeout(() => {
                newOrder.forEach((r, index) => {
                    // Route to correct update function based on row type
                    if (r.isSystemRecommendation) {
                        updateSystemRecommendation(r.id, { order: index })
                    } else {
                        updateList(r.id, { order: index })
                    }
                })
            }, 0)
        },
        [userId, localRows, updateList, updateSystemRecommendation]
    )

    // Move collection down (keyboard accessibility)
    const handleMoveDown = useCallback(
        (row: DisplayRow) => {
            if (!userId) return

            const currentIndex = localRows.findIndex((r) => r.id === row.id)
            if (currentIndex === -1 || currentIndex >= localRows.length - 1) return

            const newOrder = arrayMove(localRows, currentIndex, currentIndex + 1).map(
                (r, index) => ({
                    ...r,
                    order: index,
                })
            )

            // Update local state instantly
            setLocalRows(newOrder)

            // Persist in background
            setTimeout(() => {
                newOrder.forEach((r, index) => {
                    // Route to correct update function based on row type
                    if (r.isSystemRecommendation) {
                        updateSystemRecommendation(r.id, { order: index })
                    } else {
                        updateList(r.id, { order: index })
                    }
                })
            }, 0)
        },
        [userId, localRows, updateList, updateSystemRecommendation]
    )

    // Toggle collection visibility
    const handleToggle = useCallback(
        async (row: DisplayRow) => {
            if (!userId) return

            try {
                if (row.isSystemRecommendation) {
                    // Toggle system recommendation
                    await updateSystemRecommendation(row.id, { enabled: !row.enabled })
                } else {
                    // Toggle user collection
                    await updateList(row.id, { enabled: !row.enabled })
                }
            } catch (error) {
                console.error('Failed to toggle collection:', error)
                showToast('error', 'Failed to update collection')
            }
        },
        [userId, updateList, updateSystemRecommendation, showToast]
    )

    // Toggle display on page
    const handleTogglePublicDisplay = useCallback(
        async (row: DisplayRow) => {
            if (!userId) return

            const newValue = !(row.displayAsRow ?? true)

            // Update local state INSTANTLY for smooth UI
            setLocalRows((prevRows) =>
                prevRows.map((r) => (r.id === row.id ? { ...r, displayAsRow: newValue } : r))
            )

            // Persist to store in background
            try {
                if (row.isSystemRecommendation) {
                    // Update system recommendation
                    await updateSystemRecommendation(row.id, { enabled: newValue })
                    showToast(
                        'success',
                        newValue ? 'Collection will display on page' : 'Collection hidden from page'
                    )
                } else {
                    // Update user collection
                    await updateList(row.id, { displayAsRow: newValue })
                    showToast(
                        'success',
                        newValue ? 'Collection will display on page' : 'Collection hidden from page'
                    )
                }
            } catch (error) {
                console.error('Failed to toggle display:', error)
                showToast('error', 'Failed to update collection')
                // Revert local state on error
                setLocalRows((prevRows) =>
                    prevRows.map((r) => (r.id === row.id ? { ...r, displayAsRow: !newValue } : r))
                )
            }
        },
        [userId, updateList, updateSystemRecommendation, showToast]
    )

    // Page title and icon
    const _pageTitle = pageType === 'home' ? 'Home' : pageType === 'movies' ? 'Movies' : 'TV Shows'
    const PageIcon =
        pageType === 'home' ? Squares2X2Icon : pageType === 'movies' ? FilmIcon : TvIcon

    if (!isOpen) return null

    // Handle click-outside: close only if mousedown AND mouseup are both outside modal
    const handleMouseDown = (e: React.MouseEvent) => {
        mouseDownTargetRef.current = e.target
    }

    const handleMouseUp = (e: React.MouseEvent) => {
        // Only close if both mousedown and mouseup happened outside the modal
        if (
            mouseDownTargetRef.current === e.target &&
            modalContainerRef.current &&
            !modalContainerRef.current.contains(e.target as Node)
        ) {
            onClose()
        }
        mouseDownTargetRef.current = null
    }

    return (
        <>
            {/* Modal wrapper with click-outside detection */}
            <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
                role="dialog"
                aria-modal="true"
                aria-labelledby="row-editor-modal-title"
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
            >
                <div
                    ref={modalContainerRef}
                    className="bg-[#141414] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-700">
                        <div className="flex items-center gap-3">
                            <PageIcon className="w-6 h-6 text-red-600" />
                            <h2
                                id="row-editor-modal-title"
                                className="text-xl font-bold text-white"
                            >
                                Edit Displayed Collections
                            </h2>
                        </div>
                        {/* Action buttons */}
                        <div className="flex gap-2">
                            {!isGuest && (
                                <button
                                    onClick={handleCreate}
                                    className="flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Create Collection
                                </button>
                            )}
                            <button
                                onClick={handleResetDefaultRows}
                                className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                                Reset Defaults
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 overflow-y-auto max-h-[60vh] modal-scrollbar">
                        {/* Filter buttons */}
                        <div className="flex gap-2 mb-4">
                            <button
                                onClick={() => setDisplayFilter('all')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    displayFilter === 'all'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setDisplayFilter('shown')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    displayFilter === 'shown'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                Shown
                            </button>
                            <button
                                onClick={() => setDisplayFilter('hidden')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                    displayFilter === 'hidden'
                                        ? 'bg-gray-600 text-white'
                                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                }`}
                            >
                                Hidden
                            </button>
                        </div>

                        {/* Collections list with drag and drop */}
                        {filteredLocalRows.length > 0 ? (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={filteredLocalRows.map((r) => r.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-1">
                                        {filteredLocalRows.map((row) => (
                                            <SortableCollectionCard
                                                key={row.id}
                                                row={row}
                                                onEdit={() => handleEdit(row)}
                                                onDelete={() => handleDelete(row)}
                                                onToggle={() => handleToggle(row)}
                                                onTogglePublicDisplay={() =>
                                                    handleTogglePublicDisplay(row)
                                                }
                                                onMoveUp={() => handleMoveUp(row)}
                                                onMoveDown={() => handleMoveDown(row)}
                                                isFirst={
                                                    filteredLocalRows.findIndex(
                                                        (r) => r.id === row.id
                                                    ) === 0
                                                }
                                                isLast={
                                                    filteredLocalRows.findIndex(
                                                        (r) => r.id === row.id
                                                    ) ===
                                                    filteredLocalRows.length - 1
                                                }
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <p>No collections for this page yet.</p>
                                {!isGuest && (
                                    <p className="text-sm mt-2">
                                        Create a new collection or reset to defaults.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Collection Editor Modal - used for user collections only */}
            {editorCollection && (
                <CollectionEditorModal
                    collection={editorCollection}
                    isOpen={!!editorCollection}
                    onClose={() => setEditorCollection(null)}
                />
            )}

            {/* System Recommendation Editor Modal - used for Trending, Top Rated, etc. */}
            {editorSystemRec && (
                <SystemRecommendationEditorModal
                    recommendation={editorSystemRec}
                    isOpen={!!editorSystemRec}
                    onClose={() => setEditorSystemRec(null)}
                />
            )}
        </>
    )
}
