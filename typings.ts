export interface Genre {
    id: number
    name: string
}

export interface Person {
    id: number
    name: string
    profile_path: string | null
}

export interface CastMember extends Person {
    character: string
    order: number
}

export interface CrewMember extends Person {
    job: string
    department: string
}

export interface Credits {
    cast: CastMember[]
    crew: CrewMember[]
}

export interface ExternalIds {
    imdb_id: string | null
    facebook_id: string | null
    instagram_id: string | null
    twitter_id: string | null
}

export interface ProductionCompany {
    id: number
    name: string
    logo_path: string | null
    origin_country: string
}

export interface ReleaseDate {
    certification: string
    iso_639_1: string
    release_date: string
    type: number
    note?: string
}

export interface ReleaseDatesResult {
    iso_3166_1: string
    release_dates: ReleaseDate[]
}

export interface ContentRating {
    iso_3166_1: string
    rating: string
}

// Base interface for shared properties between movies and TV shows
export interface BaseContent {
    id: number
    backdrop_path: string
    genre_ids: number[]
    genres?: Genre[]
    origin_country: string[]
    original_language: string
    overview: string
    popularity: number
    poster_path: string
    vote_average: number
    vote_count: number
    tagline?: string
    status?: string
    production_companies?: ProductionCompany[]
    credits?: Credits
    external_ids?: ExternalIds
}

// Movie-specific interface
export interface Movie extends BaseContent {
    media_type: 'movie'
    title: string
    original_title: string
    release_date: string
    runtime?: number
    adult?: boolean
    budget?: number
    revenue?: number
    release_dates?: {
        results: ReleaseDatesResult[]
    }
}

// TV Show-specific interface
export interface TVShow extends BaseContent {
    media_type: 'tv'
    name: string
    original_name: string
    first_air_date: string
    last_air_date?: string
    number_of_seasons?: number
    number_of_episodes?: number
    episode_run_time?: number[]
    content_ratings?: {
        results: ContentRating[]
    }
    created_by?: Person[]
    networks?: ProductionCompany[]
}

// Union type for content that can be either movies or TV shows
export type Content = Movie | TVShow

// Type guards for runtime checking
export function isMovie(content: Content): content is Movie {
    return content.media_type === 'movie'
}

export function isTVShow(content: Content): content is TVShow {
    return content.media_type === 'tv'
}

// Utility functions for consistent access to properties
export function getTitle(content: Content): string {
    return isMovie(content) ? content.title : content.name
}

export function getOriginalTitle(content: Content): string {
    return isMovie(content) ? content.original_title : content.original_name
}

export function getReleaseDate(content: Content): string {
    return isMovie(content) ? content.release_date : content.first_air_date
}

export function getYear(content: Content): string {
    // Get the appropriate date field
    const date = isMovie(content) ? content.release_date : content.first_air_date


    // Extract year from valid date string
    if (date && typeof date === 'string' && date.length >= 4) {
        const year = date.slice(0, 4)
        // Validate it's a reasonable year
        const yearNum = parseInt(year)
        if (!isNaN(yearNum) && yearNum > 1800 && yearNum < 2100) {
            return year
        }
    }

    // If primary date field is missing, try alternative
    const alternativeDate = isMovie(content) ? content.first_air_date : content.release_date
    if (alternativeDate && typeof alternativeDate === 'string' && alternativeDate.length >= 4) {
        const year = alternativeDate.slice(0, 4)
        const yearNum = parseInt(year)
        if (!isNaN(yearNum) && yearNum > 1800 && yearNum < 2100) {
            return year
        }
    }

    return 'Unknown'
}

export function getContentType(content: Content): string {
    return isMovie(content) ? 'Movie' : 'TV Show'
}

// Utility functions for new metadata
export function getDirector(content: Content): string | null {
    if (!content.credits?.crew) return null
    const director = content.credits.crew.find(person => person.job === 'Director')
    return director?.name || null
}

export function getMainCast(content: Content, limit: number = 5): CastMember[] {
    if (!content.credits?.cast) return []
    return content.credits.cast.slice(0, limit)
}

export function getGenreNames(content: Content): string[] {
    if (content.genres) {
        return content.genres.map(genre => genre.name)
    }
    return []
}

export function getProductionCompanyNames(content: Content): string[] {
    if (!content.production_companies) return []
    return content.production_companies.map(company => company.name)
}

export function getRating(content: Content): string | null {
    if (isMovie(content) && content.release_dates?.results) {
        // Look for US rating first
        const usRating = content.release_dates.results.find(r => r.iso_3166_1 === 'US')
        if (usRating?.release_dates.length > 0) {
            return usRating.release_dates[0].certification || null
        }
    } else if (isTVShow(content) && content.content_ratings?.results) {
        // Look for US TV rating
        const usRating = content.content_ratings.results.find(r => r.iso_3166_1 === 'US')
        return usRating?.rating || null
    }
    return null
}

export function getRuntime(content: Content): string | null {
    if (isMovie(content) && content.runtime) {
        const hours = Math.floor(content.runtime / 60)
        const minutes = content.runtime % 60
        if (hours > 0) {
            return `${hours}h ${minutes}m`
        }
        return `${minutes}m`
    } else if (isTVShow(content) && content.episode_run_time?.length) {
        const avgRuntime = content.episode_run_time[0]
        return `${avgRuntime}m per episode`
    }
    return null
}

export function getIMDbRating(content: Content): { url: string | null; id: string | null } {
    const imdbId = content.external_ids?.imdb_id
    return {
        id: imdbId || null,
        url: imdbId ? `https://www.imdb.com/title/${imdbId}` : null
    }
}

export interface Element {
    type:
        | 'Bloopers'
        | 'Featurette'
        | 'Behind the Scenes'
        | 'Clip'
        | 'Trailer'
        | 'Teaser'
}
