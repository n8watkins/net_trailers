import React, { useCallback, useId, useState } from 'react'
import {
    useSearchStore,
    SearchFilters as SearchFiltersType,
    DepartmentFilter,
} from '../../stores/searchStore'
import { AdjustmentsHorizontalIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { FilmIcon, UserGroupIcon } from '@heroicons/react/24/solid'
import { useEscapeKey } from '../../hooks/useEscapeKey'

interface SearchFiltersProps {
    className?: string
}

type Option = { value: string; label: string }

export const CONTENT_TYPE_OPTIONS: Option[] = [
    { value: 'all', label: 'All' },
    { value: 'movie', label: 'Movies' },
    { value: 'tv', label: 'TV' },
]

const RATING_OPTIONS: Option[] = [
    { value: 'all', label: 'Any rating' },
    { value: '7.0+', label: '7.0+' },
    { value: '8.0+', label: '8.0+' },
    { value: '9.0+', label: '9.0+' },
]

const YEAR_OPTIONS: Option[] = [
    { value: 'all', label: 'Any year' },
    { value: '2020s', label: '2020s' },
    { value: '2010s', label: '2010s' },
    { value: '2000s', label: '2000s' },
    { value: '1990s', label: '1990s' },
]

const SORT_OPTIONS: Option[] = [
    { value: 'popularity.desc', label: 'Most popular' },
    { value: 'revenue.desc', label: 'Highest revenue' },
    { value: 'vote_average.desc', label: 'Highest rated' },
]

const DEPARTMENT_OPTIONS: Option[] = [
    { value: 'all', label: 'All departments' },
    { value: 'acting', label: 'Actors' },
    { value: 'directing', label: 'Directors' },
    { value: 'writing', label: 'Writers' },
]

/** The filters that live in the dropdowns (desktop) or the bottom sheet (phones). */
type DetailFilters = Pick<SearchFiltersType, 'rating' | 'year' | 'sortBy'>

const DEFAULT_DETAIL_FILTERS: Required<DetailFilters> = {
    rating: 'all',
    year: 'all',
    sortBy: 'popularity.desc',
}

/** How many of the dropdown filters differ from their default. */
export function countActiveDetailFilters(filters: DetailFilters): number {
    let count = 0
    if ((filters.rating ?? 'all') !== 'all') count++
    if ((filters.year ?? 'all') !== 'all') count++
    if ((filters.sortBy ?? 'popularity.desc') !== 'popularity.desc') count++
    return count
}

function FilterSelect({
    label,
    value,
    onChange,
    options,
    fullWidth = false,
}: {
    label: string
    value: string
    onChange: (value: string) => void
    options: Option[]
    fullWidth?: boolean
}) {
    const id = useId()
    const isActive = value !== options[0].value
    return (
        <div className={fullWidth ? 'w-full' : ''}>
            <label htmlFor={id} className="block text-xs font-medium text-gray-400 mb-1">
                {label}
            </label>
            <div className="relative">
                <select
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`appearance-none bg-gray-800 text-white rounded-lg pl-3 pr-9 h-10 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-colors border ${
                        fullWidth ? 'w-full' : 'min-w-[9.5rem]'
                    } ${isActive ? 'border-amber-400' : 'border-gray-600 hover:border-gray-500'}`}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
        </div>
    )
}

function SegmentedControl({
    label,
    options,
    value,
    onChange,
}: {
    label: string
    options: { value: string; label: string; icon?: React.ReactNode }[]
    value: string
    onChange: (value: string) => void
}) {
    return (
        <div
            role="radiogroup"
            aria-label={label}
            className="inline-flex rounded-lg border border-gray-600 overflow-hidden"
        >
            {options.map((option) => {
                const selected = option.value === value
                return (
                    <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onChange(option.value)}
                        className={`flex items-center gap-1.5 h-10 px-3 sm:px-4 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400 ${
                            selected
                                ? 'bg-amber-500 text-zinc-950'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                    >
                        {option.icon}
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}

/** Phone-only sheet that edits a draft of the dropdown filters and applies them at once. */
function FiltersSheet({
    initial,
    onApply,
    onClose,
}: {
    initial: Required<DetailFilters>
    onApply: (filters: Required<DetailFilters>) => void
    onClose: () => void
}) {
    // Mounted only while open, so the draft starts from the applied filters each time
    const [draft, setDraft] = useState(initial)
    const titleId = useId()
    useEscapeKey(true, onClose)

    const draftCount = countActiveDetailFilters(draft)

    return (
        <div className="md:hidden fixed inset-0 z-[120] flex items-end" data-testid="filters-sheet">
            <div className="absolute inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative w-full max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-gray-700 bg-[#0f0f10] px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 id={titleId} className="text-lg font-semibold text-white">
                        Filters
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close filters"
                        className="-mr-2 flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="space-y-4">
                    <FilterSelect
                        label="Rating"
                        value={draft.rating}
                        onChange={(rating) => setDraft((d) => ({ ...d, rating }))}
                        options={RATING_OPTIONS}
                        fullWidth
                    />
                    <FilterSelect
                        label="Year"
                        value={draft.year}
                        onChange={(year) => setDraft((d) => ({ ...d, year }))}
                        options={YEAR_OPTIONS}
                        fullWidth
                    />
                    <FilterSelect
                        label="Sort by"
                        value={draft.sortBy}
                        onChange={(sortBy) => setDraft((d) => ({ ...d, sortBy }))}
                        options={SORT_OPTIONS}
                        fullWidth
                    />
                </div>
                <div className="mt-6 flex gap-3">
                    <button
                        type="button"
                        onClick={() => setDraft(DEFAULT_DETAIL_FILTERS)}
                        disabled={draftCount === 0}
                        className="h-11 flex-1 rounded-lg border border-gray-600 text-sm font-medium text-gray-200 hover:bg-white/5 disabled:opacity-40"
                    >
                        Reset
                    </button>
                    <button
                        type="button"
                        onClick={() => onApply(draft)}
                        className="h-11 flex-[2] rounded-lg bg-amber-500 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function SearchFilters({ className = '' }: SearchFiltersProps) {
    const searchMode = useSearchStore((state) => state.searchMode)
    const setSearchMode = useSearchStore((state) => state.setSearchMode)
    const filters = useSearchStore((state) => state.filters)
    const setSearchFilters = useSearchStore((state) => state.setSearchFilters)
    const peopleFilters = useSearchStore((state) => state.peopleFilters)
    const setPeopleFilters = useSearchStore((state) => state.setPeopleFilters)
    const [sheetOpen, setSheetOpen] = useState(false)

    const detailFilters: Required<DetailFilters> = {
        rating: filters.rating || 'all',
        year: filters.year || 'all',
        sortBy: filters.sortBy || 'popularity.desc',
    }
    const activeDetailCount = countActiveDetailFilters(detailFilters)

    const updateFilters = useCallback(
        (partial: Partial<SearchFiltersType>) => setSearchFilters(partial),
        [setSearchFilters]
    )

    return (
        <div className={className}>
            <div className="flex flex-wrap items-end gap-3">
                <SegmentedControl
                    label="Search for"
                    value={searchMode}
                    onChange={(mode) => setSearchMode(mode as 'content' | 'people')}
                    options={[
                        {
                            value: 'content',
                            label: 'Titles',
                            icon: <FilmIcon className="w-4 h-4" />,
                        },
                        {
                            value: 'people',
                            label: 'People',
                            icon: <UserGroupIcon className="w-4 h-4" />,
                        },
                    ]}
                />

                {searchMode === 'content' ? (
                    <>
                        <SegmentedControl
                            label="Type"
                            value={filters.contentType}
                            onChange={(contentType) =>
                                updateFilters({
                                    contentType: contentType as SearchFiltersType['contentType'],
                                })
                            }
                            options={CONTENT_TYPE_OPTIONS}
                        />

                        {/* Phones: one button opens the rest of the filters in a sheet */}
                        <button
                            type="button"
                            onClick={() => setSheetOpen(true)}
                            className={`md:hidden flex items-center gap-2 h-10 px-3 rounded-lg border text-sm font-medium transition-colors ${
                                activeDetailCount > 0
                                    ? 'border-amber-400 text-amber-300'
                                    : 'border-gray-600 text-gray-200 hover:bg-white/5'
                            }`}
                        >
                            <AdjustmentsHorizontalIcon className="w-5 h-5" />
                            Filters
                            {activeDetailCount > 0 && (
                                <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-zinc-950">
                                    {activeDetailCount}
                                </span>
                            )}
                        </button>

                        {/* Wider screens: the dropdowns inline */}
                        <div className="hidden md:flex items-end gap-3">
                            <FilterSelect
                                label="Rating"
                                value={detailFilters.rating}
                                onChange={(rating) => updateFilters({ rating })}
                                options={RATING_OPTIONS}
                            />
                            <FilterSelect
                                label="Year"
                                value={detailFilters.year}
                                onChange={(year) => updateFilters({ year })}
                                options={YEAR_OPTIONS}
                            />
                            <FilterSelect
                                label="Sort by"
                                value={detailFilters.sortBy}
                                onChange={(sortBy) => updateFilters({ sortBy })}
                                options={SORT_OPTIONS}
                            />
                            {activeDetailCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => updateFilters(DEFAULT_DETAIL_FILTERS)}
                                    className="h-10 px-2 text-sm text-amber-300 hover:text-amber-200 underline-offset-4 hover:underline"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                    </>
                ) : (
                    <FilterSelect
                        label="Department"
                        value={peopleFilters.department}
                        onChange={(value) =>
                            setPeopleFilters({ department: value as DepartmentFilter })
                        }
                        options={DEPARTMENT_OPTIONS}
                    />
                )}
            </div>

            {sheetOpen && (
                <FiltersSheet
                    initial={detailFilters}
                    onClose={() => setSheetOpen(false)}
                    onApply={(next) => {
                        updateFilters(next)
                        setSheetOpen(false)
                    }}
                />
            )}
        </div>
    )
}
