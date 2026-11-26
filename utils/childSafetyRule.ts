/**
 * THE RULE: what Child Safety Mode lets through. This file is the specification;
 * every content route applies it through utils/childSafetyFilter.ts, so a list
 * never shows a title its single-title route would block, and a single-title
 * route never blocks a title a list shows.
 *
 * When in doubt, hide.
 *
 * A movie is shown only when all of these hold:
 * - TMDB does not flag it `adult`;
 * - TMDB has at least one US certification for it (any release: premiere,
 *   theatrical, digital, physical, TV);
 * - every US certification TMDB has for it is one of ALLOWED_US_RATINGS
 *   (G, PG, PG-13, or the TV equivalents up to TV-14). One R, NC-17, NR or
 *   "Unrated" release hides the movie, even next to a PG-13 one: an unrated
 *   edition exists and we cannot tell which cut a viewer meets.
 *   Releases with a blank certification (a festival premiere usually has
 *   none) say nothing and are skipped.
 *
 * A movie with NO US certification is hidden: unreleased films, festival-only
 * films, obscure or foreign titles. No other signal is trusted to stand in for
 * a rating: an Animation or Family genre with no adult flag is not enough
 * (adult animation exists, and genres are crowd-edited), and other countries'
 * ratings do not map cleanly onto US ones. The title shows once TMDB lists a
 * US rating.
 *
 * A show is shown only when all of these hold:
 * - TMDB does not flag it `adult`;
 * - TMDB has at least one content rating for it, in any country;
 * - its US rating, when it has one, is one of ALLOWED_US_RATINGS;
 * - no country rates it with one of MATURE_RATINGS (TV-MA, 18, MA15+, ...).
 * A show rated only outside the US, with nothing mature anywhere, is shown:
 * many children's shows (anime, European animation) carry no US rating.
 *
 * A person is hidden when TMDB flags them `adult`. Everyone else is shown,
 * and the titles listed with a person (known_for, credits) pass the rule for
 * their own kind.
 *
 * When the ratings cannot be looked up (TMDB error, rate limit, network), the
 * title is hidden for that request (fail closed); the failure is not cached,
 * so the next request asks again.
 *
 * Ratings are always read through the same lookup (TMDB's release_dates or
 * content_ratings for the title, cached by title id), never from whatever a
 * route's own TMDB answer happened to embed, so every route judges a title on
 * the same data.
 */

/** US ratings a title may carry and still be shown: films (MPA) and TV parental guidelines. */
export const ALLOWED_US_RATINGS: ReadonlySet<string> = new Set([
    'G',
    'PG',
    'PG-13',
    'TV-Y',
    'TV-Y7',
    'TV-Y7-FV',
    'TV-G',
    'TV-PG',
    'TV-14',
])

/** Ratings, in any country, that hide a show. */
export const MATURE_RATINGS: ReadonlySet<string> = new Set([
    'TV-MA', // US: mature audiences
    'R', // restricted (some countries use it for TV)
    'NC-17',
    '18', // 18+ in the UK, Germany, Korea and others
    '18+',
    'M', // Australia: mature
    'MA15+', // Australia: mature accompanied
])

/**
 * Prefilter for TMDB discover queries while the mode is on: only movies with a
 * US release rated G, PG or PG-13. It only narrows what TMDB sends; every
 * result still passes the rule. (Not `certification.lte=PG-13`: TMDB orders
 * NR below G, so that query also returns unrated films.)
 */
export const CHILD_SAFE_DISCOVER_PARAMS: Readonly<Record<string, string>> = {
    certification_country: 'US',
    certification: 'G|PG|PG-13',
    include_adult: 'false',
}

/** CHILD_SAFE_DISCOVER_PARAMS as a query string fragment starting with '&'. */
export const CHILD_SAFE_DISCOVER_QUERY =
    '&' + new URLSearchParams(CHILD_SAFE_DISCOVER_PARAMS as Record<string, string>).toString()

/**
 * A movie's US certifications (blank ones already dropped) as the rule reads
 * them; null when they could not be looked up.
 */
export function movieRatingsAllowed(usCertifications: readonly string[] | null): boolean {
    if (!usCertifications || usCertifications.length === 0) return false
    return usCertifications.every((rating) => ALLOWED_US_RATINGS.has(rating))
}

export interface CountryRating {
    iso_3166_1: string
    rating: string
}

/** A show's content ratings (every country); null when they could not be looked up. */
export function showRatingsAllowed(ratings: readonly CountryRating[] | null): boolean {
    const known = (ratings ?? []).filter((r) => r && r.rating && r.rating.trim() !== '')
    if (known.length === 0) return false
    const us = known.filter((r) => r.iso_3166_1 === 'US')
    if (us.some((r) => !ALLOWED_US_RATINGS.has(r.rating.trim()))) return false
    return !known.some((r) => MATURE_RATINGS.has(r.rating.trim()))
}
