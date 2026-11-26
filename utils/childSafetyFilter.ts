/**
 * Child Safety Mode applied to TMDB titles and people (server-side).
 *
 * The rule itself, in plain words, is in utils/childSafetyRule.ts. Every
 * content route passes its titles through the functions here when the mode is
 * on for the request (lib/childSafetyServer.ts): lists, single titles, people,
 * search, rows and recommendations alike. There is no shortcut for titles a
 * route believes were rated at the source; every title is judged on the same
 * ratings lookup (utils/movieCertifications.ts, utils/tvContentRatings.ts),
 * so a list and the title's own page always agree.
 */

import { NextResponse } from 'next/server'

import { movieRatingsAllowed, showRatingsAllowed } from './childSafetyRule'
import { fetchMovieCertifications } from './movieCertifications'
import { fetchTVContentRatings } from './tvContentRatings'

type Kind = 'movie' | 'tv' | 'person'

/** The fields the rule reads; any TMDB title or person object has them. */
export interface ChildSafetyItem {
    id: number
    media_type?: string
    adult?: boolean
    title?: string
}

export interface ChildSafetyFilterOptions {
    /** The kind of every item, for lists whose items carry no media_type. */
    mediaType?: Kind
}

function kindOf(item: ChildSafetyItem, hint?: Kind): Kind {
    const type = item.media_type
    if (type === 'movie' || type === 'tv' || type === 'person') return type
    if (hint) return hint
    // TMDB names a movie's field `title` and a show's `name`.
    return item.title !== undefined ? 'movie' : 'tv'
}

/** Whether one title (or person) may be shown with Child Safety Mode on. */
export async function isChildSafe(
    value: object | null | undefined,
    apiKey: string,
    options: ChildSafetyFilterOptions = {}
): Promise<boolean> {
    if (!value || typeof value !== 'object') return false
    const item = value as ChildSafetyItem
    if (item.adult === true) return false
    const id = Number(item.id)
    switch (kindOf(item, options.mediaType)) {
        case 'person':
            return true
        case 'movie':
            if (!Number.isInteger(id) || id <= 0) return false
            return movieRatingsAllowed(await fetchMovieCertifications(id, apiKey))
        case 'tv':
            if (!Number.isInteger(id) || id <= 0) return false
            return showRatingsAllowed(await fetchTVContentRatings(id, apiKey))
    }
}

/** The items that may be shown with Child Safety Mode on, in their order. */
export async function filterChildSafe<T extends object>(
    items: readonly T[],
    apiKey: string,
    options: ChildSafetyFilterOptions = {}
): Promise<T[]> {
    return filterChildSafeBy(items, (item) => item, apiKey, options)
}

/**
 * filterChildSafe for lists whose items hold the title inside them (a
 * recommendation's `content`, a candidate's `content`), in their order.
 */
export async function filterChildSafeBy<T>(
    items: readonly T[],
    titleOf: (item: T) => object | null | undefined,
    apiKey: string,
    options: ChildSafetyFilterOptions = {}
): Promise<T[]> {
    if (!items || items.length === 0) return []
    const allowed = await Promise.all(
        items.map((item) => isChildSafe(titleOf(item), apiKey, options))
    )
    return items.filter((_, index) => allowed[index])
}

/** filterChildSafe when the mode is on for the request; the items unchanged when it is off. */
export function filterWhenChildSafe<T extends object>(
    childSafeMode: boolean,
    items: readonly T[],
    apiKey: string,
    options: ChildSafetyFilterOptions = {}
): Promise<T[]> {
    if (!childSafeMode) return Promise.resolve([...(items ?? [])])
    return filterChildSafe(items, apiKey, options)
}

/**
 * People lists with Child Safety Mode on: adult performers are dropped and each
 * person's `known_for` titles pass the same rule as any other title.
 */
export async function filterChildSafePeople<T extends { adult?: boolean; known_for?: object[] }>(
    people: readonly T[],
    apiKey: string
): Promise<T[]> {
    const kept = (people ?? []).filter((person) => person && person.adult !== true)
    return Promise.all(
        kept.map(async (person) =>
            Array.isArray(person.known_for)
                ? { ...person, known_for: await filterChildSafe(person.known_for, apiKey) }
                : person
        )
    )
}

/** The `reason` of the answer for a blocked title, which the title window reads. */
export const CHILD_SAFETY_BLOCKED_REASON = 'child_safety'

/**
 * The answer for one title Child Safety Mode blocks: the 403 these routes
 * already gave (both the `error` and `message` keys the routes used), never cached.
 */
export function childSafetyBlocked(): NextResponse {
    return NextResponse.json(
        {
            error: 'Content blocked by child safety mode',
            message: 'Content blocked by child safety mode',
            reason: CHILD_SAFETY_BLOCKED_REASON,
        },
        { status: 403, headers: { 'Cache-Control': 'private, no-store' } }
    )
}
