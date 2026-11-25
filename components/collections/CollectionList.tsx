'use client'

import { useMemo, useState } from 'react'
import { FilmIcon, PencilSquareIcon, SparklesIcon, Squares2X2Icon } from '@heroicons/react/24/solid'
import { FilterPills, ListSearchInput } from '../layout/PageToolbar'
import type { UserList } from '../../types/collections'
import CollectionBrowseCard from './CollectionBrowseCard'
import {
    type CollectionKindFilter,
    hasHomeSetting,
    isShownOnHome,
    matchesKind,
    sortCollections,
} from './collectionMeta'

interface CollectionListProps {
    /** Every collection, Watch Later included (useUserData().getAllLists()). */
    collections: UserList[]
    onToggleHome?: (collection: UserList, shown: boolean) => void
    onEdit?: (collection: UserList) => void
    /** Search box id for voice input; each page passes its own. */
    voiceSourceId: string
    /** Settings sits beside a sidebar, so it asks for fewer columns. */
    narrow?: boolean
}

const KIND_EMPTY: Record<CollectionKindFilter, string> = {
    all: 'No collections yet.',
    manual: 'No manual collections yet.',
    ai: 'No AI-generated collections yet.',
    genre: 'No genre collections yet.',
}

/**
 * The shared collection list: the same filter chips, search, counts and cards on
 * /collections and in Settings > Collections.
 */
export default function CollectionList({
    collections,
    onToggleHome,
    onEdit,
    voiceSourceId,
    narrow = false,
}: CollectionListProps) {
    const [kind, setKind] = useState<CollectionKindFilter>('all')
    const [query, setQuery] = useState('')

    const sorted = useMemo(() => sortCollections(collections), [collections])

    const counts = useMemo(
        () => ({
            all: sorted.length,
            manual: sorted.filter((c) => matchesKind(c, 'manual')).length,
            ai: sorted.filter((c) => matchesKind(c, 'ai')).length,
            genre: sorted.filter((c) => matchesKind(c, 'genre')).length,
        }),
        [sorted]
    )

    const homeCounts = useMemo(() => {
        const withSetting = sorted.filter(hasHomeSetting)
        const shown = withSetting.filter(isShownOnHome).length
        return { shown, hidden: withSetting.length - shown }
    }, [sorted])

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase()
        return sorted.filter(
            (c) =>
                matchesKind(c, kind) &&
                (!q || c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q))
        )
    }, [sorted, kind, query])

    return (
        <div className="space-y-5">
            <div
                className={`flex flex-col gap-3 ${
                    narrow ? '' : 'lg:flex-row lg:items-center lg:justify-between'
                }`}
            >
                <FilterPills<CollectionKindFilter>
                    label="Show"
                    value={kind}
                    onChange={setKind}
                    options={[
                        {
                            value: 'all',
                            label: (
                                <>
                                    <Squares2X2Icon className="h-4 w-4" aria-hidden="true" />
                                    All ({counts.all})
                                </>
                            ),
                        },
                        {
                            value: 'manual',
                            label: (
                                <>
                                    <PencilSquareIcon className="h-4 w-4" aria-hidden="true" />
                                    Manual ({counts.manual})
                                </>
                            ),
                        },
                        {
                            value: 'ai',
                            label: (
                                <>
                                    <SparklesIcon className="h-4 w-4" aria-hidden="true" />
                                    AI-generated ({counts.ai})
                                </>
                            ),
                        },
                        {
                            value: 'genre',
                            label: (
                                <>
                                    <FilmIcon className="h-4 w-4" aria-hidden="true" />
                                    Genre ({counts.genre})
                                </>
                            ),
                        },
                    ]}
                />
                <ListSearchInput
                    value={query}
                    onChange={setQuery}
                    placeholder="Search collections..."
                    voiceSourceId={voiceSourceId}
                />
            </div>

            <p data-testid="home-summary" className="text-sm text-gray-400">
                {homeCounts.shown} shown on home, {homeCounts.hidden} hidden
            </p>

            {visible.length === 0 ? (
                <p className="py-12 text-center text-gray-400">
                    {query.trim() ? 'No collections match your search.' : KIND_EMPTY[kind]}
                </p>
            ) : (
                <ul
                    className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${
                        narrow ? 'xl:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4'
                    }`}
                >
                    {visible.map((collection) => (
                        <li key={collection.id} className="h-full">
                            <CollectionBrowseCard
                                collection={collection}
                                onToggleHome={onToggleHome}
                                onEdit={onEdit}
                            />
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
