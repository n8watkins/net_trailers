import { MOVIE_GENRES, TV_GENRES } from '../constants/genres'
import { findUnifiedGenre } from '../constants/unifiedGenres'

/** The genre's display name: the link's ?name=, else the TMDB genre list, else "Genre". */
export function genreName(
    mediaType: string | undefined,
    genreId: string | undefined,
    name?: string | null
): string {
    if (name) return name
    if (mediaType === 'both') return findUnifiedGenre(genreId ?? '')?.name ?? 'Genre'
    const list = mediaType === 'tv' ? TV_GENRES : MOVIE_GENRES
    return list.find((g) => String(g.id) === genreId)?.name ?? 'Genre'
}

/** The genre page's heading, which is also its browser tab title: "Action Movies". */
export function genreHeading(
    mediaType: string | undefined,
    genreId: string | undefined,
    name?: string | null,
    title?: string | null
): string {
    if (title) return title
    const kind =
        mediaType === 'both' ? 'Movies & TV Shows' : mediaType === 'movie' ? 'Movies' : 'TV Shows'
    return `${genreName(mediaType, genreId, name)} ${kind}`
}
