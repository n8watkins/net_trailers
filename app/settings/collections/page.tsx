'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useSessionStore } from '../../../stores/sessionStore'
import { useCollectionPrefsStore } from '../../../stores/collectionPrefsStore'
import { useAuthStore } from '../../../stores/authStore'
import { useGuestStore } from '../../../stores/guestStore'
import { useToast } from '../../../hooks/useToast'
import { UserList } from '../../../types/collections'
import {
    EyeIcon,
    EyeSlashIcon,
    ChevronDownIcon,
    PencilIcon,
    GlobeAltIcon,
    LockClosedIcon,
} from '@heroicons/react/24/outline'
import CollectionEditorModal from '../../../components/modals/CollectionEditorModal'
import { SystemRowStorage } from '../../../utils/systemRowStorage'
import { CustomRowsFirestore } from '../../../utils/firestore/customRows'
import { getSystemCollectionsByMediaType } from '../../../constants/systemCollections'

// Helper function to convert hex color to rgba with opacity
const hexToRgba = (hex: string, opacity: number): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (result) {
        const r = parseInt(result[1], 16)
        const g = parseInt(result[2], 16)
        const b = parseInt(result[3], 16)
        return `rgba(${r}, ${g}, ${b}, ${opacity})`
    }
    return `rgba(10, 10, 10, ${opacity})` // Fallback to very dark
}

export default function CollectionsPage() {
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const userId = getUserId()

    const { showSuccess, showError } = useToast()

    // Get all display rows (system + custom)
    const getAllDisplayRows = useCollectionPrefsStore((state) => state.getAllDisplayRows)
    const toggleSystemRow = useCollectionPrefsStore((state) => state.toggleSystemRow)
    const setSystemRowPreferences = useCollectionPrefsStore(
        (state) => state.setSystemRowPreferences
    )
    const setDeletedSystemRows = useCollectionPrefsStore((state) => state.setDeletedSystemRows)

    // Get user collections
    const authCollections = useAuthStore((state) => state.userCreatedWatchlists)
    const guestCollections = useGuestStore((state) => state.userCreatedWatchlists)
    const authUpdateList = useAuthStore((state) => state.updateList)
    const guestUpdateList = useGuestStore((state) => state.updateList)

    const isAuth = sessionType === 'authenticated'
    const userCollections = isAuth ? authCollections : guestCollections
    const updateList = isAuth ? authUpdateList : guestUpdateList

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'hidden'>('all')

    // Accordion state for each section
    const [homeOpen, setHomeOpen] = useState(true)
    const [moviesOpen, setMoviesOpen] = useState(false)
    const [tvOpen, setTvOpen] = useState(false)

    // Collection editor modal state
    const [editingCollection, setEditingCollection] = useState<any>(null)
    const [showEditorModal, setShowEditorModal] = useState(false)

    // Load system row preferences from storage on mount
    // Only load if preferences don't already exist to avoid clobbering in-flight changes
    useEffect(() => {
        if (!userId) return

        const loadPreferences = async () => {
            try {
                // Check if preferences already exist for this user
                const existingPrefs = useCollectionPrefsStore
                    .getState()
                    .systemRowPreferences.get(userId)
                if (existingPrefs && Object.keys(existingPrefs).length > 0) {
                    // Preferences already loaded, skip to avoid race condition
                    return
                }

                const preferences = await SystemRowStorage.getSystemRowPreferences(
                    userId,
                    sessionType === 'guest'
                )
                if (preferences && Object.keys(preferences).length > 0) {
                    setSystemRowPreferences(userId, preferences)
                }
            } catch (error) {
                console.error('Failed to load system row preferences:', error)
            }
        }

        loadPreferences()
    }, [userId, sessionType, setSystemRowPreferences])

    // Get all collections
    const allDisplayRows = userId ? getAllDisplayRows(userId) : []

    // Separate system and user collections
    const systemCollections = allDisplayRows.filter((row) => row.isSystemCollection)
    const userCollectionsFromRows = userCollections || []

    // Get system row preferences to check enabled state
    const systemRowPreferencesMap = useCollectionPrefsStore((state) => state.systemRowPreferences)
    const systemRowPreferences = userId ? systemRowPreferencesMap.get(userId) || {} : {}

    // Combine and normalize all collections (unfiltered base list)
    const baseCollections = useMemo(() => {
        return [
            ...systemCollections.map((row) => {
                // Check the system row preferences for enabled state (defaults to true if not set)
                const pref = systemRowPreferences[row.id]
                const isEnabled = pref?.enabled ?? true

                return {
                    id: row.id,
                    name: row.name,
                    emoji: '📺', // System rows don't have emoji property
                    isSystem: true,
                    enabled: isEnabled, // Use preference enabled state, not base enabled
                    itemCount: 20, // Placeholder for system collections
                    mediaType: row.mediaType,
                    collection: row, // Store full collection for editing
                }
            }),
            ...userCollectionsFromRows.map((col: UserList) => ({
                id: col.id,
                name: col.name,
                emoji: col.emoji || '📺',
                isSystem: false,
                enabled: col.displayAsRow ?? true,
                itemCount: col.items?.length || 0,
                mediaType: col.mediaType || 'both',
                shareSettings: col.shareSettings || {
                    visibility: 'private',
                    showOwnerName: true,
                    allowComments: false,
                },
                color: col.color || '#3b82f6', // Default blue
                collection: col, // Store full collection for editing
            })),
        ]
    }, [systemCollections, userCollectionsFromRows, systemRowPreferences])

    // Apply filters to get filtered collections for display
    const allCollections = useMemo(() => {
        let filtered = baseCollections

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter((col) => col.name.toLowerCase().includes(query))
        }

        // Apply status filter
        if (statusFilter === 'enabled') {
            filtered = filtered.filter((col) => col.enabled)
        } else if (statusFilter === 'hidden') {
            filtered = filtered.filter((col) => !col.enabled)
        }

        return filtered
    }, [baseCollections, searchQuery, statusFilter])

    // Group by media type (category assignment)
    // Collections stay in their category regardless of enabled state
    // The green/red dot on each card indicates if it's currently displaying
    const homeCollections = allCollections.filter((col) => col.mediaType === 'both')
    const movieCollections = allCollections.filter((col) => col.mediaType === 'movie')
    const tvCollections = allCollections.filter((col) => col.mediaType === 'tv')

    // Unassigned collections (no mediaType set - edge case)
    const unassignedCollections = allCollections.filter(
        (col) =>
            !col.mediaType ||
            (col.mediaType !== 'both' && col.mediaType !== 'movie' && col.mediaType !== 'tv')
    )

    // Stats - calculated from base (unfiltered) collections
    const totalCollections = baseCollections.length
    const enabledCount = baseCollections.filter((col) => col.enabled).length
    const hiddenCount = baseCollections.filter((col) => !col.enabled).length

    // Toggle handlers
    const handleToggleSystem = async (collectionId: string) => {
        if (!userId) return

        // Update in-memory state first for immediate UI update
        toggleSystemRow(userId, collectionId)

        // Persist to storage
        try {
            const updatedPrefs =
                useCollectionPrefsStore.getState().systemRowPreferences.get(userId) || {}
            await SystemRowStorage.setSystemRowPreferences(
                userId,
                updatedPrefs,
                isAuth ? false : true
            )
            showSuccess('Collection updated')
        } catch (error) {
            console.error('Failed to persist system row toggle:', error)
            showError('Failed to update collection')
        }
    }

    const handleToggleUser = async (collectionId: string) => {
        const collection = userCollectionsFromRows.find((c: UserList) => c.id === collectionId)
        if (!collection) return

        try {
            await updateList(collectionId, {
                displayAsRow: !collection.displayAsRow,
            })
            showSuccess('Collection updated')
        } catch (error) {
            console.error('Failed to toggle user collection:', error)
            showError('Failed to update collection')
        }
    }

    const handleToggle = async (collectionId: string, isSystem: boolean) => {
        if (isSystem) {
            await handleToggleSystem(collectionId)
        } else {
            await handleToggleUser(collectionId)
        }
    }

    const handleResetToDefaults = async () => {
        if (!userId) return

        try {
            // Get all system rows across all media types
            const allSystemRows = [
                ...getSystemCollectionsByMediaType('both'),
                ...getSystemCollectionsByMediaType('movie'),
                ...getSystemCollectionsByMediaType('tv'),
            ]

            // Build reset preferences - enable all system rows with default order
            const resetPrefs: any = {}
            allSystemRows.forEach((row) => {
                resetPrefs[row.id] = {
                    enabled: true,
                    order: row.order,
                }
            })

            // Clear deleted system rows (restore all deleted rows)
            setDeletedSystemRows(userId, [])

            // Update in-memory preferences
            useCollectionPrefsStore.getState().setSystemRowPreferences(userId, resetPrefs)

            // Persist both preferences and cleared deletions to storage
            if (isAuth) {
                // For authenticated users, use Firestore
                await CustomRowsFirestore.resetDefaultRows(userId, 'both')
                await CustomRowsFirestore.resetDefaultRows(userId, 'movie')
                await CustomRowsFirestore.resetDefaultRows(userId, 'tv')
            } else {
                // For guest users, use localStorage
                await SystemRowStorage.resetDefaultRows(userId, 'both', true)
            }

            showSuccess('Reset to default collection settings')
        } catch (error) {
            console.error('Failed to reset to defaults:', error)
            showError('Failed to reset collection settings')
        }
    }

    const handleEditCollection = (collection: any) => {
        setEditingCollection(collection)
        setShowEditorModal(true)
    }

    const handleCloseEditor = () => {
        setShowEditorModal(false)
        setEditingCollection(null)
    }

    return (
        <div className="p-6 md:p-8 min-h-screen">
            {/* Header */}
            <div className="mb-8 flex items-start justify-between">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        Collection Management
                    </h1>
                    <p className="text-gray-400">Control which collections appear on your pages</p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={handleResetToDefaults}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg border border-gray-600 transition-colors"
                    >
                        Reset to Defaults
                    </button>
                </div>
            </div>

            {/* Stats - Clickable Filter Buttons */}
            <div className="mb-6 flex flex-wrap gap-4">
                <button
                    onClick={() => setStatusFilter('all')}
                    className={`rounded-lg px-4 py-3 border-2 transition-all ${
                        statusFilter === 'all'
                            ? 'bg-white/10 border-white shadow-lg'
                            : 'bg-[#1a1a1a] border-[#313131] hover:border-[#454545]'
                    }`}
                >
                    <span className="text-gray-400 text-sm">All:</span>
                    <span className="ml-2 text-white font-semibold">{totalCollections}</span>
                </button>
                <button
                    onClick={() => setStatusFilter('enabled')}
                    className={`rounded-lg px-4 py-3 border-2 transition-all ${
                        statusFilter === 'enabled'
                            ? 'bg-green-600/20 border-green-600 shadow-lg'
                            : 'bg-[#1a1a1a] border-[#313131] hover:border-[#454545]'
                    }`}
                >
                    <span className="text-gray-400 text-sm">Enabled:</span>
                    <span className="ml-2 text-green-400 font-semibold">{enabledCount}</span>
                </button>
                <button
                    onClick={() => setStatusFilter('hidden')}
                    className={`rounded-lg px-4 py-3 border-2 transition-all ${
                        statusFilter === 'hidden'
                            ? 'bg-red-600/20 border-red-600 shadow-lg'
                            : 'bg-[#1a1a1a] border-[#313131] hover:border-[#454545]'
                    }`}
                >
                    <span className="text-gray-400 text-sm">Hidden:</span>
                    <span className="ml-2 text-gray-500 font-semibold">{hiddenCount}</span>
                </button>
            </div>

            {/* Search */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search collections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 bg-[#1a1a1a] border border-[#313131] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
            </div>

            {/* Accordion Sections */}
            <div className="space-y-4">
                {/* Home Collections */}
                {homeCollections.length > 0 && (
                    <AccordionSection
                        title="Home Collections"
                        icon="🏠"
                        count={homeCollections.length}
                        isOpen={homeOpen}
                        onToggle={() => setHomeOpen(!homeOpen)}
                    >
                        <CollectionGrid
                            collections={homeCollections}
                            onToggle={handleToggle}
                            onEdit={handleEditCollection}
                        />
                    </AccordionSection>
                )}

                {/* Movies Collections */}
                {movieCollections.length > 0 && (
                    <AccordionSection
                        title="Movies Collections"
                        icon="🎬"
                        count={movieCollections.length}
                        isOpen={moviesOpen}
                        onToggle={() => setMoviesOpen(!moviesOpen)}
                    >
                        <CollectionGrid
                            collections={movieCollections}
                            onToggle={handleToggle}
                            onEdit={handleEditCollection}
                        />
                    </AccordionSection>
                )}

                {/* TV Collections */}
                {tvCollections.length > 0 && (
                    <AccordionSection
                        title="TV Collections"
                        icon="📺"
                        count={tvCollections.length}
                        isOpen={tvOpen}
                        onToggle={() => setTvOpen(!tvOpen)}
                    >
                        <CollectionGrid
                            collections={tvCollections}
                            onToggle={handleToggle}
                            onEdit={handleEditCollection}
                        />
                    </AccordionSection>
                )}

                {/* Unassigned Collections */}
                {unassignedCollections.length > 0 && (
                    <AccordionSection
                        title="Unassigned Collections"
                        icon="📂"
                        count={unassignedCollections.length}
                        isOpen={true}
                        onToggle={() => {}}
                    >
                        <div className="mb-3 text-sm text-gray-400">
                            These collections have no page assignment. Edit them to assign to Home,
                            Movies, or TV.
                        </div>
                        <CollectionGrid
                            collections={unassignedCollections}
                            onToggle={handleToggle}
                            onEdit={handleEditCollection}
                        />
                    </AccordionSection>
                )}
            </div>

            {/* Empty State */}
            {allCollections.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-400">No collections found</p>
                </div>
            )}

            {/* Collection Editor Modal */}
            {editingCollection && (
                <CollectionEditorModal
                    collection={editingCollection}
                    isOpen={showEditorModal}
                    onClose={handleCloseEditor}
                />
            )}
        </div>
    )
}

// Accordion Section Component
interface AccordionSectionProps {
    title: string
    icon: string
    count: number
    isOpen: boolean
    onToggle: () => void
    children: React.ReactNode
}

function AccordionSection({
    title,
    icon,
    count,
    isOpen,
    onToggle,
    children,
}: AccordionSectionProps) {
    return (
        <div className="bg-[#1a1a1a] rounded-lg border border-[#313131] overflow-hidden">
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 hover:bg-[#252525] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{icon}</span>
                    <h2 className="text-lg font-semibold text-white">
                        {title} ({count})
                    </h2>
                </div>
                <ChevronDownIcon
                    className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {/* Content with smooth height animation */}
            <div
                className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
            >
                <div className="overflow-hidden">
                    <div className="p-4 pt-0 border-t border-[#313131]">{children}</div>
                </div>
            </div>
        </div>
    )
}

// Collection Grid Component
interface CollectionGridProps {
    collections: Array<{
        id: string
        name: string
        emoji?: string
        isSystem: boolean
        enabled: boolean
        itemCount: number
        mediaType: string
        color?: string
        collection: any
    }>
    onToggle: (id: string, isSystem: boolean) => void
    onEdit: (collection: any) => void
}

function CollectionGrid({ collections, onToggle, onEdit }: CollectionGridProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-4">
            {collections.map((collection) => (
                <CollectionCard
                    key={collection.id}
                    collection={collection}
                    onToggle={() => onToggle(collection.id, collection.isSystem)}
                    onEdit={() => onEdit(collection.collection)}
                />
            ))}
        </div>
    )
}

// Compact Collection Card Component
interface CollectionCardProps {
    collection: {
        id: string
        name: string
        emoji?: string
        isSystem: boolean
        enabled: boolean
        itemCount: number
        mediaType: string
        color?: string
    }
    onToggle: () => void
    onEdit: () => void
}

function CollectionCard({ collection, onToggle, onEdit }: CollectionCardProps) {
    const collectionColor = collection.color || '#6b7280' // Default gray

    return (
        <div
            className="rounded-lg border-2 hover:opacity-90 transition-all p-3"
            style={{
                backgroundColor: hexToRgba(collectionColor, 0.1),
                borderColor: collectionColor,
            }}
        >
            {/* Header Row with Status Dot and Edit Button */}
            <div className="flex items-start justify-between mb-3">
                {/* Name with emoji and status dot */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0">{collection.emoji || '📺'}</span>
                    <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            collection.enabled ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        title={collection.enabled ? 'Currently displaying' : 'Hidden'}
                    />
                    <h3 className="text-white text-sm font-medium truncate">{collection.name}</h3>
                </div>

                {/* Edit Button - Only for user-created collections */}
                {!collection.isSystem && (
                    <button
                        onClick={onEdit}
                        className="flex-shrink-0 flex items-center justify-center p-1 hover:bg-gray-800 rounded transition-colors"
                        title="Edit collection"
                        aria-label="Edit collection"
                    >
                        <PencilIcon className="w-4 h-4 text-gray-400 hover:text-white" />
                    </button>
                )}
            </div>

            {/* Bottom Row: Item Count and Toggle */}
            <div className="flex items-center justify-between">
                <p className="text-gray-500 text-xs">
                    {collection.itemCount} {collection.itemCount === 1 ? 'item' : 'items'}
                </p>

                {/* Toggle Switch */}
                <button
                    onClick={onToggle}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        collection.enabled ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                    aria-label={collection.enabled ? 'Hide collection' : 'Show collection'}
                    title={collection.enabled ? 'Hide from page' : 'Show on page'}
                >
                    <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            collection.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                    />
                </button>
            </div>
        </div>
    )
}
