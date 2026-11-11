'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'

import { Empty, Loading, cx } from './ui'

export type Column<T> = {
    key: string
    header: string
    cell: (row: T) => React.ReactNode
    className?: string
    /** Hidden below `sm`; the first column carries the essentials on a phone. */
    hideOnPhone?: boolean
}

export type Filter<T> = { id: string; label: string; test: (row: T) => boolean }

/** One row of filter chips; the first option is the default (usually "All"). */
export type FilterGroup<T> = { id: string; label: string; options: Filter<T>[] }

/**
 * The one admin table: search, filter chips, pagination, and loading and
 * empty states. Rows are filtered in the browser (admin lists are small and
 * the APIs return them whole).
 */
export function DataTable<T>({
    rows,
    columns,
    rowKey,
    search,
    filters,
    loading = false,
    empty = 'Nothing here yet.',
    pageSize = 25,
    label,
    toolbar,
}: {
    rows: T[]
    columns: Column<T>[]
    rowKey: (row: T) => string
    /** The text a row is searched by; no search box without it. */
    search?: { placeholder: string; text: (row: T) => string }
    filters?: FilterGroup<T>[]
    loading?: boolean
    empty?: React.ReactNode
    pageSize?: number
    /** Names the table for screen readers. */
    label: string
    /** Actions next to the filters, given the rows that pass the search and filters. */
    toolbar?: (visible: T[]) => React.ReactNode
}) {
    const [query, setQuery] = useState('')
    const [chosen, setChosen] = useState<Record<string, string>>(() =>
        Object.fromEntries((filters ?? []).map((g) => [g.id, g.options[0]?.id ?? '']))
    )
    const [page, setPage] = useState(0)

    const visible = useMemo(() => {
        const active = (filters ?? [])
            .map((g) => g.options.find((o) => o.id === chosen[g.id]))
            .filter((f): f is Filter<T> => Boolean(f))
        const q = query.trim().toLowerCase()
        return rows.filter(
            (row) =>
                active.every((f) => f.test(row)) &&
                (!q || !search || search.text(row).toLowerCase().includes(q))
        )
    }, [rows, filters, chosen, query, search])

    const pages = Math.max(1, Math.ceil(visible.length / pageSize))
    const current = Math.min(page, pages - 1)
    const shown = visible.slice(current * pageSize, current * pageSize + pageSize)

    return (
        <div className="flex min-w-0 flex-col gap-3">
            {(search || filters || toolbar) && (
                <div className="flex flex-wrap items-center gap-2">
                    {search && (
                        <label className="relative min-w-0 flex-1 basis-56">
                            <span className="sr-only">{search.placeholder}</span>
                            <Search
                                aria-hidden
                                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gray-500"
                            />
                            <input
                                type="search"
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value)
                                    setPage(0)
                                }}
                                placeholder={search.placeholder}
                                className="min-h-9 w-full rounded-lg border border-white/10 bg-black/40 pr-3 pl-9 text-sm text-white placeholder:text-gray-500 focus:border-amber-400/60 focus:outline-none"
                            />
                        </label>
                    )}
                    {filters?.map((group) => (
                        <div
                            key={group.id}
                            role="group"
                            aria-label={group.label}
                            className="flex flex-wrap gap-1.5"
                        >
                            {group.options.map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    aria-pressed={f.id === chosen[group.id]}
                                    onClick={() => {
                                        setChosen((was) => ({ ...was, [group.id]: f.id }))
                                        setPage(0)
                                    }}
                                    className={cx(
                                        'min-h-8 rounded-full px-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-amber-400',
                                        f.id === chosen[group.id]
                                            ? 'bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40'
                                            : 'bg-white/5 text-gray-300 hover:bg-white/10'
                                    )}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    ))}
                    {toolbar && (
                        <div className="ml-auto flex items-center gap-2">{toolbar(visible)}</div>
                    )}
                </div>
            )}

            {loading ? (
                <Loading />
            ) : visible.length === 0 ? (
                <Empty>{rows.length === 0 ? empty : 'No rows match.'}</Empty>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-left text-sm" aria-label={label}>
                        <thead className="bg-white/[0.03] text-xs tracking-wide text-gray-400 uppercase">
                            <tr>
                                {columns.map((c) => (
                                    <th
                                        key={c.key}
                                        scope="col"
                                        className={cx(
                                            'px-3 py-2.5 font-medium',
                                            c.hideOnPhone && 'hidden sm:table-cell',
                                            c.className
                                        )}
                                    >
                                        {c.header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {shown.map((row) => (
                                <tr key={rowKey(row)} className="hover:bg-white/[0.02]">
                                    {columns.map((c) => (
                                        <td
                                            key={c.key}
                                            className={cx(
                                                'px-3 py-2.5 align-top text-gray-200',
                                                c.hideOnPhone && 'hidden sm:table-cell',
                                                c.className
                                            )}
                                        >
                                            {c.cell(row)}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {!loading && visible.length > 0 && (
                <div className="flex items-center justify-between gap-3 text-[13px] text-gray-400">
                    <span>
                        {current * pageSize + 1}-
                        {Math.min(visible.length, (current + 1) * pageSize)} of {visible.length}
                    </span>
                    {pages > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setPage(current - 1)}
                                disabled={current === 0}
                                aria-label="Previous page"
                                className="grid size-8 place-items-center rounded-lg hover:bg-white/5 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-amber-400"
                            >
                                <ChevronLeft aria-hidden className="size-4" />
                            </button>
                            <span className="tabular-nums">
                                Page {current + 1} of {pages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setPage(current + 1)}
                                disabled={current >= pages - 1}
                                aria-label="Next page"
                                className="grid size-8 place-items-center rounded-lg hover:bg-white/5 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-amber-400"
                            >
                                <ChevronRight aria-hidden className="size-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
