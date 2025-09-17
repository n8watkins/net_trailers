export interface Genre {
    id: number
    name: string
}

// Base interface for shared properties between movies and TV shows
export interface BaseContent {
    id: number
    backdrop_path: string
    genre_ids: number[]
    origin_country: string[]
    original_language: string
    overview: string
    popularity: number
    poster_path: string
    vote_average: number
    vote_count: number
}

// Movie-specific interface
export interface Movie extends BaseContent {
    media_type: 'movie'
    title: string
    original_title: string
    release_date: string
    runtime?: number
    adult?: boolean
}

// TV Show-specific interface
export interface TVShow extends BaseContent {
    media_type: 'tv'
    name: string
    original_name: string
    first_air_date: string
    number_of_seasons?: number
    number_of_episodes?: number
    episode_run_time?: number[]
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
    const date = getReleaseDate(content)
    return date ? date.slice(0, 4) : 'Unknown'
}

export function getContentType(content: Content): string {
    return isMovie(content) ? 'Movie' : 'TV Show'
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
