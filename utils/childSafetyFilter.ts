/**
 * The one rule for what Child Safety Mode lets through (server-side).
 *
 * Every content route passes its titles through these two functions when the
 * mode is on for the request (lib/childSafetyServer.ts), so lists, single
 * titles and people follow the same rule. It is the rule the routes already
 * used, gathered in one place:
 * - anything TMDB flags `adult` is blocked (movies, shows and people);
 * - a movie needs a US certification of G, PG or PG-13
 *   (utils/movieCertifications.ts);
 * - a show is blocked by a mature rating such as TV-MA
 *   (utils/tvContentRatings.ts);
 * - a title whose rating cannot be found is blocked (fail closed).
 *
 * Ratings come from the item itself when TMDB appended them (details answers
 * carry `release_dates` and `content_ratings`), otherwise from TMDB, through
 * the in-memory certification cache.
 */

import { NextResponse } from 'next/server'

import {
    fetchMovieCertification,
    hasMatureCertification,
    usCertificationFrom,
} from './movieCertifications'
import { fetchTVContentRatings, hasMatureRating, type ContentRating } from './tvContentRatings'

type Kind = 'movie' | 'tv' | 'person'

/** The fields the rule reads; any TMDB title or person object has them. */
export interface ChildSafetyItem {
    id: number
    media_type?: string
    adult?: boolean
    title?: string
    first_air_date?: string
    release_dates?: { results?: Parameters<typeof usCertificationFrom>[0] }
    content_ratings?: { results?: ContentRating[] }
}

export interface ChildSafetyFilterOptions {
    /** The kind of every item, for lists whose items carry no media_type. */
    mediaType?: Kind
    /**
     * The movies came from a TMDB discover query with
     * `certification.lte=PG-13`, which already checked their certification.
     */
    moviesRatedAtSource?: boolean
}

function kindOf(item: ChildSafetyItem, hint?: Kind): Kind {
    const type = item.media_type
    if (type === 'movie' || type === 'tv' || type === 'person') return type
    if (hint) return hint
    // TMDB names a movie's field `title` and a show's `name`.
    return item.title !== undefined ? 'movie' : 'tv'
}

async function movieAllowed(
    item: ChildSafetyItem,
    apiKey: string,
    options: ChildSafetyFilterOptions
): Promise<boolean> {
    if (options.moviesRatedAtSource) return true
    const embedded = item.release_dates?.results
    const certification = embedded
        ? usCertificationFrom(embedded)
        : await fetchMovieCertification(item.id, apiKey)
    return !hasMatureCertification(certification)
}

async function showAllowed(item: ChildSafetyItem, apiKey: string): Promise<boolean> {
    const ratings = item.content_ratings?.results ?? (await fetchTVContentRatings(item.id, apiKey))
    // No ratings at all: hasMatureRating blocks it (fail closed).
    return !hasMatureRating(ratings ?? [])
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
    switch (kindOf(item, options.mediaType)) {
        case 'person':
            return true
        case 'movie':
            return movieAllowed(item, apiKey, options)
        case 'tv':
            return showAllowed(item, apiKey)
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
