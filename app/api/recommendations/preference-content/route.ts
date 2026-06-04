/**
 * Preference Content API
 *
 * POST /api/recommendations/preference-content
 * Returns top-rated content for users to rate in the preference customizer.
 * Mixes movies and TV shows for variety.
 * Optionally includes cast/crew details for rich display.
 */

import { NextRequest, NextResponse } from 'next/server'

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'

interface RequestBody {
    excludeIds?: number[]
    limit?: number
    includeCredits?: boolean // Fetch cast/crew details
    priorityContent?: { id: number; mediaType: 'movie' | 'tv' }[] // Watchlist items to prioritize
}

interface CastMember {
    id: number
    name: string
    character: string
    profile_path: string | null
    order: number
}

interface CrewMember {
    id: number
    name: string
    job: string
    department: string
    profile_path: string | null
}

interface DirectorInfo {
    name: string
    profile_path: string | null
}

interface ContentWithCredits {
    id: number
    media_type: 'movie' | 'tv'
    poster_path?: string
    backdrop_path?: string
    overview?: string
    vote_average?: number
    vote_count?: number
    popularity?: number
    genre_ids?: number[]
    // Movie fields
    title?: string
    release_date?: string
    // TV fields
    name?: string
    first_air_date?: string
    // Extra credits fields
    cast?: CastMember[]
    director?: DirectorInfo | null
    creator?: DirectorInfo | null
}

// Fetch details with credits for a single content item
async function fetchContentWithCredits(
    id: number,
    mediaType: 'movie' | 'tv'
): Promise<ContentWithCredits | null> {
    try {
        const response = await fetch(
            `${TMDB_BASE_URL}/${mediaType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits`
        )
        if (!response.ok) return null

        const data = await response.json()

        // Extract top 5 cast members
        const cast: CastMember[] = (data.credits?.cast || []).slice(0, 5).map((c: CastMember) => ({
            id: c.id,
            name: c.name,
            character: c.character,
            profile_path: c.profile_path,
            order: c.order,
        }))

        // Extract director (movies) or creator (TV) with profile image
        let director: DirectorInfo | null = null
        let creator: DirectorInfo | null = null

        if (mediaType === 'movie') {
            const directorData = (data.credits?.crew || []).find(
                (c: CrewMember) => c.job === 'Director'
            )
            if (directorData) {
                director = {
                    name: directorData.name,
                    profile_path: directorData.profile_path,
                }
            }
        } else {
            // For TV, use created_by field
            const creatorData = data.created_by?.[0]
            if (creatorData) {
                creator = {
                    name: creatorData.name,
                    profile_path: creatorData.profile_path || null,
                }
            }
        }

        return {
            ...data,
            media_type: mediaType,
            cast,
            director,
            creator,
        }
    } catch {
        return null
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const body: RequestBody = await request.json()
        const excludeIds = new Set(body.excludeIds || [])
        const limit = Math.min(body.limit || 20, 50)
        const includeCredits = body.includeCredits || false
        const priorityContent = body.priorityContent || []

        // Process priority content first (watchlist items)
        let priorityResults: ContentWithCredits[] = []
        if (priorityContent.length > 0 && includeCredits) {
            const priorityPromises = priorityContent
                .filter((p) => !excludeIds.has(p.id))
                .slice(0, Math.min(priorityContent.length, limit))
                .map((p) => fetchContentWithCredits(p.id, p.mediaType))

            const results = await Promise.all(priorityPromises)
            priorityResults = results.filter((r): r is ContentWithCredits => r !== null)
        }

        // Calculate how many more we need from TMDB top-rated
        const remainingLimit = limit - priorityResults.length
        let topRatedContent: ContentWithCredits[] = []

        if (remainingLimit > 0) {
            // Fetch top-rated movies and TV shows in parallel
            const [moviesResponse, tvResponse] = await Promise.all([
                fetch(
                    `${TMDB_BASE_URL}/movie/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=${Math.floor(Math.random() * 5) + 1}`
                ),
                fetch(
                    `${TMDB_BASE_URL}/tv/top_rated?api_key=${TMDB_API_KEY}&language=en-US&page=${Math.floor(Math.random() * 5) + 1}`
                ),
            ])

            if (!moviesResponse.ok || !tvResponse.ok) {
                throw new Error('Failed to fetch content from TMDB')
            }

            const [moviesData, tvData] = await Promise.all([
                moviesResponse.json(),
                tvResponse.json(),
            ])

            // Process and tag content with media_type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const movies: ContentWithCredits[] = (moviesData.results || []).map((m: any) => ({
                id: m.id,
                media_type: 'movie' as const,
                poster_path: m.poster_path,
                backdrop_path: m.backdrop_path,
                overview: m.overview,
                vote_average: m.vote_average,
                vote_count: m.vote_count,
                popularity: m.popularity,
                genre_ids: m.genre_ids,
                title: m.title,
                release_date: m.release_date,
            }))

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const tvShows: ContentWithCredits[] = (tvData.results || []).map((t: any) => ({
                id: t.id,
                media_type: 'tv' as const,
                poster_path: t.poster_path,
                backdrop_path: t.backdrop_path,
                overview: t.overview,
                vote_average: t.vote_average,
                vote_count: t.vote_count,
                popularity: t.popularity,
                genre_ids: t.genre_ids,
                name: t.name,
                first_air_date: t.first_air_date,
            }))

            // Combine and filter out excluded IDs and priority IDs
            const priorityIds = new Set(priorityResults.map((p) => p.id))
            const allContent = [...movies, ...tvShows].filter(
                (content) => !excludeIds.has(content.id) && !priorityIds.has(content.id)
            )

            // Shuffle for variety
            const shuffled = allContent.sort(() => Math.random() - 0.5)

            // Take remaining needed
            const selectedContent = shuffled.slice(0, remainingLimit)

            // Fetch credits for each if requested
            if (includeCredits) {
                const creditsPromises = selectedContent.map((c) =>
                    fetchContentWithCredits(c.id, c.media_type)
                )
                const results = await Promise.all(creditsPromises)
                topRatedContent = results.filter((r): r is ContentWithCredits => r !== null)
            } else {
                topRatedContent = selectedContent
            }
        }

        // Combine: priority first, then top-rated
        const content = [...priorityResults, ...topRatedContent]

        return NextResponse.json({
            success: true,
            content,
            totalAvailable: content.length,
            priorityCount: priorityResults.length,
        })
    } catch (error) {
        console.error('Error fetching preference content:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to fetch content',
            },
            { status: 500 }
        )
    }
}
