'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Content } from '../../typings'
import { contentKey, planRowExclusions, RowExclusion } from '../../utils/homeRowDedupe'

/** Rows that are still loading after this long stop holding up the rows below them. */
const MAX_WAIT_MS = 6000

interface DedupeContextValue {
    plan: Record<string, RowExclusion>
    report: (key: string, keys: string[] | undefined) => void
}

const DedupeContext = createContext<DedupeContextValue | null>(null)

const NO_EXCLUSION: RowExclusion = { ready: true, exclude: new Set() }

/**
 * Coordinates the title rows on the home page so each title appears only in
 * the first row that has it. `order` lists the title rows top to bottom.
 */
export function HomeRowDedupeProvider({
    order,
    children,
}: {
    order: readonly string[]
    children: ReactNode
}) {
    const [reports, setReports] = useState<Record<string, string[] | undefined>>({})
    const [force, setForce] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => setForce(true), MAX_WAIT_MS)
        return () => clearTimeout(timer)
    }, [])

    const report = useCallback((key: string, keys: string[] | undefined) => {
        setReports((prev) => {
            const current = prev[key]
            if (current === keys) return prev
            if (current && keys && current.length === keys.length) {
                if (current.every((k, i) => k === keys[i])) return prev
            }
            return { ...prev, [key]: keys }
        })
    }, [])

    const plan = useMemo(
        () => planRowExclusions(order, reports, { force }),
        [order, reports, force]
    )

    const value = useMemo(() => ({ plan, report }), [plan, report])
    return <DedupeContext.Provider value={value}>{children}</DedupeContext.Provider>
}

/**
 * Register a row's titles and get back the titles that rows above it already show.
 * Pass `content` as undefined while the row is loading, and [] when it will show nothing.
 * Outside the home page (no provider) nothing is excluded.
 */
export function useHomeRowDedupe(key: string, content: Content[] | undefined): RowExclusion {
    const ctx = useContext(DedupeContext)
    const report = ctx?.report
    // Rows hand over a fresh array on every render (`[]` while hidden, a filtered copy once
    // loaded). Keying on the titles themselves keeps `keys` the same array until they
    // really change. Keyed on the array, the effect below reported on every render and the
    // whole home page re-rendered about 60 times a second.
    const signature = content?.map(contentKey).join('\n')
    const keys = useMemo(
        () => (signature === undefined ? undefined : signature === '' ? [] : signature.split('\n')),
        [signature]
    )

    useEffect(() => {
        if (!report) return
        report(key, keys)
    }, [report, key, keys])

    if (!ctx) return NO_EXCLUSION
    return ctx.plan[key] ?? NO_EXCLUSION
}
