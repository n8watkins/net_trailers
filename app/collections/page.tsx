'use client'

import { useMemo, useState } from 'react'
import useUserData from '../../hooks/useUserData'
import SubPageLayout from '../../components/layout/SubPageLayout'
import {
    RectangleStackIcon,
    MagnifyingGlassIcon,
    SparklesIcon,
    PencilSquareIcon,
    Squares2X2Icon,
} from '@heroicons/react/24/solid'
import { XMarkIcon } from '@heroicons/react/24/outline'
import NetflixLoader from '../../components/common/NetflixLoader'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import CollectionBrowseCard from '../../components/collections/CollectionBrowseCard'

type FilterValue = 'all' | 'auto' | 'manual' | 'ai'

const Collections = () => {
    const userData = useUserData()
    const { isLoading } = useAuthStatus()
    const { getAllLists } = userData

    // State
    const [searchQuery, setSearchQuery] = useState('')
    const [collectionFilter, setCollectionFilter] = useState<FilterValue>('all')

    // Get all available lists
    const allLists = useMemo(() => {
        return getAllLists()
    }, [getAllLists])

    // Filter collections by type and search
    const filteredCollections = useMemo(() => {
        let filtered = allLists

        // Apply type filter
        if (collectionFilter === 'auto') {
            filtered = filtered.filter((list) => list.autoUpdateEnabled === true)
        } else if (collectionFilter === 'manual') {
            filtered = filtered.filter((list) => list.collectionType === 'manual')
        } else if (collectionFilter === 'ai') {
            filtered = filtered.filter((list) => list.collectionType === 'ai-generated')
        }

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(
                (list) =>
                    list.name.toLowerCase().includes(query) ||
                    list.description?.toLowerCase().includes(query)
            )
        }

        // Sort: Watch Later first, then by creation date
        return filtered.sort((a, b) => {
            if (a.name === 'Watch Later') return -1
            if (b.name === 'Watch Later') return 1
            return (b.createdAt || 0) - (a.createdAt || 0)
        })
    }, [allLists, collectionFilter, searchQuery])

    // Collection stats
    const collectionStats = useMemo(() => {
        return {
            total: allLists.length,
            auto: allLists.filter((list) => list.autoUpdateEnabled === true).length,
            manual: allLists.filter((list) => list.collectionType === 'manual').length,
            ai: allLists.filter((list) => list.collectionType === 'ai-generated').length,
        }
    }, [allLists])

    return (
        <SubPageLayout hideHeader>
            <div className="relative -mt-20 -mx-6 sm:-mx-8 lg:-mx-12">
                {/* Atmospheric Background */}
                <div className="fixed inset-0 pointer-events-none">
                    <div className="absolute inset-0 bg-black" />
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-gradient-radial from-blue-900/20 via-transparent to-transparent opacity-50" />
                    <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-black opacity-60" />
                </div>

                {/* Content Container */}
                <div className="relative z-10">
                    {/* Cinematic Hero Header */}
                    <div className="relative overflow-hidden pt-4">
                        {/* Animated Background Gradients */}
                        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900/80 to-black" />
                        <div
                            className="absolute inset-0 bg-gradient-to-t from-blue-900/20 via-cyan-900/10 to-black/50 animate-pulse"
                            style={{ animationDuration: '4s' }}
                        />
                        <div className="absolute inset-0 bg-gradient-radial from-blue-500/10 via-blue-900/5 to-transparent" />

                        {/* Soft edge vignetting for subtle blending */}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80" />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60" />

                        {/* Hero Content */}
                        <div className="relative z-10 flex flex-col items-center justify-start px-6 pt-8 pb-6">
                            {/* Icon with glow */}
                            <div className="relative mb-4">
                                <div className="absolute inset-0 bg-blue-500/30 blur-2xl scale-150" />
                                <RectangleStackIcon className="relative w-16 h-16 text-blue-400 drop-shadow-[0_0_20px_rgba(59,130,246,0.5)]" />
                            </div>

                            {/* Title */}
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-2 text-center tracking-tight">
                                <span className="bg-gradient-to-r from-blue-200 via-cyan-100 to-blue-200 bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
                                    Collections
                                </span>
                            </h1>

                            {/* Subtitle with collection count */}
                            <p className="text-base sm:text-lg text-gray-300 mb-6 text-center max-w-2xl">
                                Browse and manage your curated content collections
                                {!isLoading && collectionStats.total > 0 && (
                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                        {collectionStats.total} collections
                                    </span>
                                )}
                            </p>

                            {/* Filter Pills */}
                            <div className="flex flex-wrap gap-2 items-center justify-center mb-5 overflow-visible pb-2 px-4 min-h-[44px]">
                                {[
                                    { value: 'all', label: 'All', icon: Squares2X2Icon },
                                    { value: 'auto', label: 'Auto-Update', icon: SparklesIcon },
                                    { value: 'manual', label: 'Manual', icon: PencilSquareIcon },
                                    {
                                        value: 'ai',
                                        label: 'AI-Generated',
                                        icon: SparklesIcon,
                                    },
                                ].map((option) => {
                                    const Icon = option.icon
                                    const isSelected = collectionFilter === option.value
                                    // Get count for this filter
                                    const count =
                                        option.value === 'all'
                                            ? collectionStats.total
                                            : collectionStats[
                                                  option.value as keyof typeof collectionStats
                                              ]

                                    return (
                                        <button
                                            key={option.value}
                                            onClick={() =>
                                                setCollectionFilter(option.value as FilterValue)
                                            }
                                            className={`group relative rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 backdrop-blur-md border flex items-center gap-2 ${
                                                isSelected
                                                    ? 'bg-blue-500/90 text-white border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.3)] scale-105'
                                                    : 'bg-zinc-900/40 text-gray-300 border-zinc-700/50 hover:bg-zinc-800/60 hover:border-zinc-600 hover:scale-105 hover:shadow-[0_0_8px_rgba(255,255,255,0.08)]'
                                            }`}
                                        >
                                            <Icon
                                                className={`w-4 h-4 ${isSelected ? 'text-white' : ''}`}
                                            />
                                            <span className="relative z-10">
                                                {option.label} ({count})
                                            </span>
                                            {isSelected && (
                                                <div className="absolute inset-0 rounded-full bg-blue-500 blur-md opacity-15 animate-pulse" />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* Enhanced Search Bar */}
                            <div className="w-full max-w-3xl relative">
                                <div className="relative group">
                                    <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 z-10 transition-colors group-focus-within:text-blue-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search collections..."
                                        className="w-full pl-14 pr-14 py-4 bg-zinc-900/40 backdrop-blur-lg border border-zinc-800/50 rounded-2xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:shadow-[0_0_25px_rgba(59,130,246,0.3)] transition-all duration-300 hover:bg-zinc-900/60 hover:border-zinc-700"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-5 top-1/2 -translate-y-1/2 z-10 text-gray-400 hover:text-white transition-colors"
                                        >
                                            <XMarkIcon className="w-6 h-6" />
                                        </button>
                                    )}

                                    {/* Glowing border effect on focus */}
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-focus-within:opacity-20 blur-xl transition-opacity duration-300 -z-10" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="px-6 sm:px-8 lg:px-12 py-8 space-y-6">
                        {/* Loading state */}
                        {isLoading && (
                            <div className="py-16">
                                <NetflixLoader inline={true} message="Loading collections..." />
                            </div>
                        )}

                        {/* Empty state */}
                        {!isLoading && filteredCollections.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 bg-blue-500/20 blur-2xl scale-150" />
                                    <div className="relative w-24 h-24 rounded-full bg-zinc-900/60 backdrop-blur-lg flex items-center justify-center border-2 border-zinc-800/50">
                                        <RectangleStackIcon className="w-12 h-12 text-blue-500" />
                                    </div>
                                </div>
                                <h3 className="text-2xl font-bold text-white mb-3">
                                    {searchQuery
                                        ? 'No collections match your search'
                                        : collectionFilter !== 'all'
                                          ? `No ${collectionFilter === 'auto' ? 'auto-updating' : collectionFilter === 'ai' ? 'AI-generated' : 'manual'} collections`
                                          : 'No collections yet'}
                                </h3>
                                <p className="text-gray-400 mb-8 max-w-md text-lg">
                                    {searchQuery
                                        ? 'Try a different search term'
                                        : 'Create your first collection!'}
                                </p>
                            </div>
                        )}

                        {/* Collections Grid */}
                        {!isLoading && filteredCollections.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredCollections.map((list, index) => (
                                    <div
                                        key={list.id}
                                        className="animate-fadeInUp"
                                        style={{
                                            animationDelay: `${Math.min(index * 50, 500)}ms`,
                                            animationFillMode: 'both',
                                        }}
                                    >
                                        <CollectionBrowseCard collection={list} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Add keyframe animation for fade-in */}
                <style jsx>{`
                    @keyframes fadeInUp {
                        from {
                            opacity: 0;
                            transform: translateY(20px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }

                    :global(.animate-fadeInUp) {
                        animation: fadeInUp 0.5s ease-out;
                    }
                `}</style>
            </div>
        </SubPageLayout>
    )
}

export default Collections
