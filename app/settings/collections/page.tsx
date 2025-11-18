'use client'

import React, { useMemo, useState } from 'react'
import { useSessionStore } from '../../../stores/sessionStore'
import { useCustomRowsStore } from '../../../stores/customRowsStore'
import { useAuthStore } from '../../../stores/authStore'
import { useGuestStore } from '../../../stores/guestStore'
import { useToast } from '../../../hooks/useToast'
import { DisplayRow } from '../../../types/customRows'
import { UserList } from '../../../types/userLists'
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
import { fixCollectionDisplaySettings } from '../../../utils/migrations/fixCollectionDisplaySettings'

export default function CollectionsPage() {
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const userId = getUserId()

    const { showSuccess, showError } = useToast()

    // Get all display rows (system + custom)
    const getAllDisplayRows = useCustomRowsStore((state) => state.getAllDisplayRows)
    const toggleSystemRow = useCustomRowsStore((state) => state.toggleSystemRow)

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

    // Migration state
    const [isMigrating, setIsMigrating] = useState(false)

    // Get all collections
    const allDisplayRows = userId ? getAllDisplayRows(userId) : []

    // Separate system and user collections
    const systemCollections = allDisplayRows.filter((row) => row.isSystemRow)
    const userCollectionsFromRows = userCollections || []

    // Get system row preferences to check enabled state
    const systemRowPreferencesMap = useCustomRowsStore((state) => state.systemRowPreferences)
    const systemRowPreferences = userId ? systemRowPreferencesMap.get(userId) || {} : {}

    // Combine and normalize all collections
    const allCollections = useMemo(() => {
        const combined = [
            ...systemCollections.map((row) => {
                // Check the system row preferences for enabled state (defaults to true if not set)
                const pref = systemRowPreferences[row.id]
                const isEnabled = pref?.enabled ?? true

                return {
                    id: row.id,
                    name: row.name,
                    emoji: row.emoji,
                    isSystem: true,
                    enabled: isEnabled, // Use preference enabled state, not base enabled
                    itemCount: 20, // Placeholder for system collections
                    mediaType: row.mediaType,
                    isPublic: false, // System collections are not shareable
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
                isPublic: col.isPublic ?? false,
                collection: col, // Store full collection for editing
            })),
        ]

        // Apply search filter
        let filtered = combined
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
    }, [
        systemCollections,
        userCollectionsFromRows,
        searchQuery,
        statusFilter,
        systemRowPreferences,
    ])

    // Group by actual display location
    // Home page shows collections with mediaType === 'both'
    // Movies page shows collections with mediaType === 'movie'
    // TV page shows collections with mediaType === 'tv'
    // Unassigned are collections where enabled === false (displayAsRow === false)
    const homeCollections = allCollections.filter((col) => col.mediaType === 'both' && col.enabled)
    const movieCollections = allCollections.filter(
        (col) => col.mediaType === 'movie' && col.enabled
    )
    const tvCollections = allCollections.filter((col) => col.mediaType === 'tv' && col.enabled)

    // Unassigned collections (disabled/not displayed on any page)
    const unassignedCollections = allCollections.filter((col) => !col.enabled)

    // Stats
    const totalCollections = allCollections.length
    const enabledCount = allCollections.filter((col) => col.enabled).length
    const hiddenCount = allCollections.filter((col) => !col.enabled).length

    // Toggle handlers
    const handleToggleSystem = async (collectionId: string) => {
        if (!userId) return

        // Update in-memory state first for immediate UI update
        toggleSystemRow(userId, collectionId)

        // Persist to storage
        try {
            const updatedPrefs =
                useCustomRowsStore.getState().systemRowPreferences.get(userId) || {}
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

        await updateList(collectionId, {
            displayAsRow: !collection.displayAsRow,
        })
        showSuccess('Collection updated')
    }

    const handleToggle = (collectionId: string, isSystem: boolean) => {
        if (isSystem) {
            handleToggleSystem(collectionId)
        } else {
            handleToggleUser(collectionId)
        }
    }

    const handleResetToDefaults = async () => {
        if (!userId) return

        try {
            // Reset all system collections to enabled
            const systemPreferences =
                useCustomRowsStore.getState().systemRowPreferences.get(userId) || {}
            const resetPrefs: any = {}

            // Enable all system collections
            Object.keys(systemPreferences).forEach((rowId) => {
                resetPrefs[rowId] = {
                    enabled: true,
                    order: systemPreferences[rowId]?.order ?? 0,
                }
            })

            // Update in-memory state
            useCustomRowsStore.getState().setSystemRowPreferences(userId, resetPrefs)

            // Persist to storage
            await SystemRowStorage.setSystemRowPreferences(
                userId,
                resetPrefs,
                isAuth ? false : true
            )

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

    const handleMigrateCollections = async () => {
        setIsMigrating(true)
        try {
            const result = await fixCollectionDisplaySettings()

            if (result.success) {
                if (result.updated > 0) {
                    showSuccess(
                        `Fixed ${result.updated} collection${result.updated === 1 ? '' : 's'}`
                    )
                } else {
                    showSuccess('All collections already have correct settings')
                }
            } else {
                showError(
                    `Migration completed with ${result.errors} error${result.errors === 1 ? '' : 's'}`
                )
            }
        } catch (error) {
            console.error('Migration failed:', error)
            showError('Failed to migrate collections')
        } finally {
            setIsMigrating(false)
        }
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
                        onClick={handleMigrateCollections}
                        disabled={isMigrating}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white text-sm rounded-lg border border-blue-500 transition-colors"
                        title="Fix collections that aren't displaying properly"
                    >
                        {isMigrating ? 'Fixing...' : 'Fix Collections'}
                    </button>
                    <button
                        onClick={handleResetToDefaults}
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg border border-gray-600 transition-colors"
                    >
                        Reset to Defaults
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="mb-6 flex flex-wrap gap-4">
                <div className="bg-[#1a1a1a] rounded-lg px-4 py-3 border border-[#313131]">
                    <span className="text-gray-400 text-sm">Total:</span>
                    <span className="ml-2 text-white font-semibold">{totalCollections}</span>
                </div>
                <div className="bg-[#1a1a1a] rounded-lg px-4 py-3 border border-[#313131]">
                    <span className="text-gray-400 text-sm">Enabled:</span>
                    <span className="ml-2 text-green-400 font-semibold">{enabledCount}</span>
                </div>
                <div className="bg-[#1a1a1a] rounded-lg px-4 py-3 border border-[#313131]">
                    <span className="text-gray-400 text-sm">Hidden:</span>
                    <span className="ml-2 text-gray-500 font-semibold">{hiddenCount}</span>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <input
                    type="text"
                    placeholder="Search collections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-2 bg-[#1a1a1a] border border-[#313131] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                    className="px-4 py-2 bg-[#1a1a1a] border border-[#313131] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                    <option value="all">All Collections</option>
                    <option value="enabled">Enabled Only</option>
                    <option value="hidden">Hidden Only</option>
                </select>
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
                            These collections are not displayed on any page. Edit them to assign to
                            Home, Movies, or TV.
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
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                    }`}
                />
            </button>

            {/* Content */}
            {isOpen && <div className="p-4 pt-0 border-t border-[#313131]">{children}</div>}
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
        isPublic: boolean
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
        isPublic: boolean
    }
    onToggle: () => void
    onEdit: () => void
}

function CollectionCard({ collection, onToggle, onEdit }: CollectionCardProps) {
    return (
        <div className="bg-[#0a0a0a] rounded-lg border border-[#313131] hover:border-[#454545] transition-all p-3">
            {/* Header Row with Edit Button */}
            <div className="flex items-start justify-between mb-3">
                {/* Name with inline emoji */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg flex-shrink-0">{collection.emoji || '📺'}</span>
                    <h3 className="text-white text-sm font-medium truncate">{collection.name}</h3>
                </div>

                {/* Edit Button - Top Right */}
                <button
                    onClick={onEdit}
                    className="flex-shrink-0 flex items-center justify-center p-1 hover:bg-gray-800 rounded transition-colors"
                    title="Edit collection"
                    aria-label="Edit collection"
                >
                    <PencilIcon className="w-4 h-4 text-gray-400 hover:text-white" />
                </button>
            </div>

            {/* Item Count - Right below title */}
            <p className="text-gray-500 text-xs">
                {collection.itemCount} {collection.itemCount === 1 ? 'item' : 'items'}
            </p>
        </div>
    )
}
