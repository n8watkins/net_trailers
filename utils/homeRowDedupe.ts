import type { Content } from '../typings'

/**
 * Home rows are fetched separately, so popular titles used to show up in
 * Trending, Top Rated and two genre rows at once. Each title now belongs to
 * the first row (top to bottom) that has it; later rows skip it and show
 * their next candidates instead.
 */

/** Stable identity for a title across rows (movie and TV ids can collide). */
export function contentKey(item: Content): string {
    // media_type is typed as required but some endpoints omit it; movies carry a title
    const mediaType = item.media_type ?? ((item as { title?: string }).title ? 'movie' : 'tv')
    return `${mediaType}-${item.id}`
}

export interface RowExclusion {
    /** True once every row above has reported what it shows */
    ready: boolean
    /** Titles already shown by rows above */
    exclude: ReadonlySet<string>
}

/**
 * For each row in `order`, the titles claimed by the rows above it.
 * `reports[key]` is the row's candidate list, or undefined while it loads.
 * A row claims every candidate that no earlier row claimed.
 */
export function planRowExclusions(
    order: readonly string[],
    reports: Readonly<Record<string, readonly string[] | undefined>>,
    { force = false }: { force?: boolean } = {}
): Record<string, RowExclusion> {
    const plan: Record<string, RowExclusion> = {}
    const claimed = new Set<string>()
    let allAboveReported = true

    for (const key of order) {
        plan[key] = { ready: force || allAboveReported, exclude: new Set(claimed) }
        const report = reports[key]
        if (report === undefined) {
            allAboveReported = false
            continue
        }
        for (const id of report) claimed.add(id)
    }
    return plan
}
