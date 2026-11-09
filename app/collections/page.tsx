'use client'

import { useMemo, useState } from 'react'
import useUserData from '../../hooks/useUserData'
import SubPageLayout from '../../components/layout/SubPageLayout'
import PageHeader from '../../components/layout/PageHeader'
import PageEmptyState, { emptyStateActionClass } from '../../components/layout/PageEmptyState'
import { FilterPills, ListSearchInput } from '../../components/layout/PageToolbar'
import {
    RectangleStackIcon,
    SparklesIcon,
    PencilSquareIcon,
    Squares2X2Icon,
    PlusIcon,
} from '@heroicons/react/24/solid'
import PageLoader from '../../components/common/PageLoader'
import { useAuthStatus } from '../../hooks/useAuthStatus'
import CollectionBrowseCard from '../../components/collections/CollectionBrowseCard'
import { useModalStore } from '../../stores/modalStore'

type FilterValue = 'all' | 'manual' | 'ai'

const Collections = () => {
    const userData = useUserData()
    const { isLoading } = useAuthStatus()
    const { getAllLists } = userData
    const openCollectionBuilderModal = useModalStore((state) => state.openCollectionBuilderModal)

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
        if (collectionFilter === 'manual') {
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
            manual: allLists.filter((list) => list.collectionType === 'manual').length,
            ai: allLists.filter((list) => list.collectionType === 'ai-generated').length,
        }
    }, [allLists])

    const hasCollections = !isLoading && allLists.length > 0

    return (
        <SubPageLayout hideHeader>
            <div className="space-y-6">
                <PageHeader
                    title="Collections"
                    icon={<RectangleStackIcon />}
                    actions={
                        <button
                            type="button"
                            onClick={() => openCollectionBuilderModal()}
                            className="inline-flex h-9 items-center gap-2 rounded-full bg-amber-500 px-4 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-400"
                        >
                            <PlusIcon className="h-4 w-4" />
                            New collection
                        </button>
                    }
                >
                    {hasCollections && (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <FilterPills<FilterValue>
                                label="Show"
                                value={collectionFilter}
                                onChange={setCollectionFilter}
                                options={[
                                    {
                                        value: 'all',
                                        label: (
                                            <>
                                                <Squares2X2Icon className="h-4 w-4" />
                                                All ({collectionStats.total})
                                            </>
                                        ),
                                    },
                                    {
                                        value: 'manual',
                                        label: (
                                            <>
                                                <PencilSquareIcon className="h-4 w-4" />
                                                Manual ({collectionStats.manual})
                                            </>
                                        ),
                                    },
                                    {
                                        value: 'ai',
                                        label: (
                                            <>
                                                <SparklesIcon className="h-4 w-4" />
                                                AI-generated ({collectionStats.ai})
                                            </>
                                        ),
                                    },
                                ]}
                            />
                            <ListSearchInput
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search collections..."
                                voiceSourceId="collections-search"
                            />
                        </div>
                    )}
                </PageHeader>

                {isLoading && (
                    <div className="py-16">
                        <PageLoader inline={true} message="Loading collections..." />
                    </div>
                )}

                {!isLoading && allLists.length === 0 && (
                    <PageEmptyState
                        icon={<RectangleStackIcon />}
                        title="No collections yet"
                        description="Group titles you want to keep together, by hand or with AI."
                        action={
                            <button
                                type="button"
                                onClick={() => openCollectionBuilderModal()}
                                className={emptyStateActionClass}
                            >
                                Create a collection
                            </button>
                        }
                    />
                )}

                {hasCollections && filteredCollections.length === 0 && (
                    <p className="py-12 text-center text-gray-400">
                        {searchQuery
                            ? 'No collections match your search.'
                            : `No ${collectionFilter === 'ai' ? 'AI-generated' : 'manual'} collections yet.`}
                    </p>
                )}

                {!isLoading && filteredCollections.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredCollections.map((list, index) => (
                            <div
                                key={list.id}
                                className="h-full animate-fadeInUp"
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
