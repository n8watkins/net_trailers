'use client'

import { useMemo, useState } from 'react'
import Link from '@/components/common/Link'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { getUnifiedGenresByMediaType } from '../../constants/unifiedGenres'
import { useChildSafety } from '../../hooks/useChildSafety'
import { PRIMARY_NAV, genreHref, isNavItemActive } from './navigation'

interface MobileNavMenuProps {
    pathname: string | null
    onClose: () => void
    onSurprise: () => void
    isRandomLoading: boolean
}

const rowClass =
    'flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-base transition-colors select-none'

/** The phone menu: every item from PRIMARY_NAV, in its order. */
export default function MobileNavMenu({
    pathname,
    onClose,
    onSurprise,
    isRandomLoading,
}: MobileNavMenuProps) {
    const [genresOpen, setGenresOpen] = useState(false)
    const { isEnabled: childSafetyEnabled } = useChildSafety()
    const genres = useMemo(
        () =>
            [...getUnifiedGenresByMediaType('both', childSafetyEnabled)].sort((a, b) =>
                a.name.localeCompare(b.name)
            ),
        [childSafetyEnabled]
    )

    return (
        <nav aria-label="Main" className="max-h-[calc(100dvh-7rem)] overflow-y-auto p-3">
            <ul className="space-y-1">
                {PRIMARY_NAV.map((item) => {
                    const Icon = item.icon
                    const active = isNavItemActive(item, pathname)
                    const stateClass = active
                        ? 'bg-amber-500/20 font-semibold text-white'
                        : 'text-gray-200 hover:bg-white/10'

                    if (item.kind === 'genres') {
                        return (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    aria-expanded={genresOpen}
                                    onClick={() => setGenresOpen((open) => !open)}
                                    className={`${rowClass} ${pathname?.startsWith('/genres') ? 'bg-amber-500/20 font-semibold text-white' : 'text-gray-200 hover:bg-white/10'}`}
                                >
                                    <Icon className="h-5 w-5" />
                                    <span className="flex-1">{item.label}</span>
                                    <ChevronDownIcon
                                        className={`h-5 w-5 transition-transform ${genresOpen ? 'rotate-180' : ''}`}
                                    />
                                </button>
                                {genresOpen && (
                                    <ul className="mt-1 grid grid-cols-2 gap-1 pb-2 pl-11 pr-1">
                                        {genres.map((genre) => (
                                            <li key={genre.id}>
                                                <Link
                                                    href={genreHref(genre, 'both')}
                                                    onClick={onClose}
                                                    className="block rounded-md px-2 py-2 text-sm text-gray-300 hover:bg-white/10 hover:text-white"
                                                >
                                                    {genre.name}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        )
                    }

                    if (item.kind === 'surprise') {
                        return (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    onClick={onSurprise}
                                    disabled={isRandomLoading}
                                    className={`${rowClass} text-gray-200 hover:bg-white/10 disabled:cursor-wait`}
                                >
                                    <Icon
                                        className={`h-5 w-5 ${isRandomLoading ? 'animate-pulse' : ''}`}
                                    />
                                    <span>{item.label}</span>
                                </button>
                            </li>
                        )
                    }

                    return (
                        <li key={item.id}>
                            <Link
                                href={item.href!}
                                onClick={onClose}
                                aria-current={active ? 'page' : undefined}
                                className={`${rowClass} ${stateClass}`}
                            >
                                <Icon className="h-5 w-5" />
                                <span>{item.label}</span>
                            </Link>
                        </li>
                    )
                })}
            </ul>
        </nav>
    )
}
