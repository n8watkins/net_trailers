'use client'

import React, { useMemo, useState } from 'react'
import { useSessionStore } from '../../../stores/sessionStore'
import { useCustomRowsStore } from '../../../stores/customRowsStore'
import { useAuthStore } from '../../../stores/authStore'
import { useGuestStore } from '../../../stores/guestStore'
import { useToast } from '../../../hooks/useToast'
import { DisplayRow } from '../../../types/customRows'
import { UserList } from '../../../types/userLists'
import { EyeIcon, EyeSlashIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

export default function CollectionsPage() {
    const getUserId = useSessionStore((state) => state.getUserId)
    const sessionType = useSessionStore((state) => state.sessionType)
    const userId = getUserId()

    const { showSuccess } = useToast()

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

    // Get all collections
    const allDisplayRows = userId ? getAllDisplayRows(userId) : []

    // Separate system and user collections
    const systemCollections = allDisplayRows.filter((row) => row.isSystemRow)
    const userCollectionsFromRows = userCollections || []

    // Combine and normalize all collections
    const allCollections = useMemo(() => {
        const combined = [
            ...systemCollections.map((row) => ({
                id: row.id,
                name: row.name,
                emoji: row.emoji,
                isSystem: true,
                enabled: row.enabled,
                itemCount: 20, // Placeholder for system collections
                mediaType: row.mediaType,
            })),
            ...userCollectionsFromRows.map((col: UserList) => ({
                id: col.id,
                name: col.name,
                emoji: col.emoji || '📺',
                isSystem: false,
                enabled: col.displayAsRow ?? true,
                itemCount: col.items?.length || 0,
                mediaType: col.mediaType || 'both',
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
    }, [systemCollections, userCollectionsFromRows, searchQuery, statusFilter])

    // Group by page type
    const homeCollections = allCollections.filter((col) => col.mediaType === 'both')
    const movieCollections = allCollections.filter((col) => col.mediaType === 'movie')
    const tvCollections = allCollections.filter((col) => col.mediaType === 'tv')

    // Stats
    const totalCollections = allCollections.length
    const enabledCount = allCollections.filter((col) => col.enabled).length
    const hiddenCount = allCollections.filter((col) => !col.enabled).length

    // Toggle handlers
    const handleToggleSystem = async (collectionId: string) => {
        if (!userId) return
        toggleSystemRow(userId, collectionId)
        showSuccess('Collection updated')
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

    return (
        <div className="p-6 md:p-8 min-h-screen">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    Collection Management
                </h1>
                <p className="text-gray-400">Control which collections appear on your pages</p>
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
                        <CollectionGrid collections={homeCollections} onToggle={handleToggle} />
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
                        <CollectionGrid collections={movieCollections} onToggle={handleToggle} />
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
                        <CollectionGrid collections={tvCollections} onToggle={handleToggle} />
                    </AccordionSection>
                )}
            </div>

            {/* Empty State */}
            {allCollections.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-gray-400">No collections found</p>
                </div>
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
    }>
    onToggle: (id: string, isSystem: boolean) => void
}

function CollectionGrid({ collections, onToggle }: CollectionGridProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 mt-4">
            {collections.map((collection) => (
                <CollectionCard
                    key={collection.id}
                    collection={collection}
                    onToggle={() => onToggle(collection.id, collection.isSystem)}
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
    }
    onToggle: () => void
}

function CollectionCard({ collection, onToggle }: CollectionCardProps) {
    return (
        <div className="group relative bg-[#0a0a0a] rounded-lg border border-[#313131] hover:border-[#454545] transition-all overflow-hidden">
            {/* Status Badge - Top Right Corner */}
            <div className="absolute top-2 right-2 z-10">
                {collection.enabled ? (
                    <div className="w-2 h-2 rounded-full bg-green-500" title="Enabled" />
                ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-600" title="Hidden" />
                )}
            </div>

            {/* Main Content */}
            <div className="p-4 flex flex-col items-center text-center">
                {/* Large Emoji */}
                <div className="text-4xl mb-2">{collection.emoji || '📺'}</div>

                {/* Collection Name */}
                <h3 className="text-white text-sm font-medium mb-1 line-clamp-2 min-h-[2.5rem]">
                    {collection.name}
                </h3>

                {/* Item Count */}
                <p className="text-gray-500 text-xs mb-3">
                    {collection.itemCount} {collection.itemCount === 1 ? 'item' : 'items'}
                </p>

                {/* Toggle Switch */}
                <button
                    onClick={onToggle}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        collection.enabled ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                    aria-label={collection.enabled ? 'Hide collection' : 'Show collection'}
                >
                    <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            collection.enabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                    />
                </button>
            </div>

            {/* Hover Overlay - Show Status Text */}
            <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <div className="text-center px-2">
                    <div className="flex items-center justify-center gap-2 text-white text-sm font-medium mb-1">
                        {collection.enabled ? (
                            <>
                                <EyeIcon className="w-4 h-4 text-green-400" />
                                <span className="text-green-400">Enabled</span>
                            </>
                        ) : (
                            <>
                                <EyeSlashIcon className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-400">Hidden</span>
                            </>
                        )}
                    </div>
                    {collection.isSystem && (
                        <p className="text-xs text-gray-400">System Collection</p>
                    )}
                </div>
            </div>
        </div>
    )
}
