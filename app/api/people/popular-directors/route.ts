import { NextRequest, NextResponse } from 'next/server'
import { apiError, apiLog } from '../../../../utils/debugLogger'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

// Cache this route for 1 hour
export const revalidate = 3600

interface Director {
    id: number
    name: string
    profile_path: string | null
    known_for_department: string
    popularity: number
    job?: string
    credit_id?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    known_for?: any[]
}

interface DirectorWithScore extends Director {
    score: number
    recent_works: Array<{
        id: number
        title: string
        poster_path: string | null
        media_type: string
        genre_ids: number[]
    }>
}

export async function GET(request: NextRequest) {
    if (!API_KEY) {
        return NextResponse.json({ message: 'TMDB API key not configured' }, { status: 500 })
    }

    try {
        const searchParams = request.nextUrl.searchParams

        // Validate and sanitize page parameter
        const rawPage = searchParams.get('page') || '1'
        const parsedPage = parseInt(rawPage, 10)
        const pageNumber = Math.max(1, Math.min(100, isNaN(parsedPage) ? 1 : parsedPage))

        // Time window: day or week
        const timeWindow = searchParams.get('time_window') || 'week'
        const validTimeWindow = timeWindow === 'day' ? 'day' : 'week'

        // Media type filter: 'movie', 'tv', or undefined (both)
        const mediaType = searchParams.get('media_type')

        // Genre filter (comma-separated TMDB genre IDs)
        const genresParam = searchParams.get('genres')
        const genreIds = genresParam ? genresParam.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id)) : []

        apiLog(`[Popular Directors] Fetching page ${pageNumber} with time_window=${validTimeWindow}, media_type=${mediaType || 'both'}, genres=${genreIds.length > 0 ? genreIds.join(',') : 'all'}`)

        // Strategy: Get trending movies/TV and extract their directors
        // This gives us directors who are actually relevant right now
        const trendingPages = 3 // Fetch 3 pages of trending content
        const startPage = (pageNumber - 1) * trendingPages + 1

        // Fetch trending movies and TV in parallel (or just one if filtered)
        const fetchPromises = []
        for (let i = 0; i < trendingPages; i++) {
            const page = startPage + i
            if (page <= 100) {
                // Trending movies (if not filtered to TV only)
                if (!mediaType || mediaType === 'movie') {
                    fetchPromises.push(
                        fetch(`${BASE_URL}/trending/movie/${validTimeWindow}?api_key=${API_KEY}&language=en-US&page=${page}`)
                            .then((res) => res.json())
                            .then((data) => ({ type: 'movie', data }))
                    )
                }
                // Trending TV (if not filtered to movie only)
                if (!mediaType || mediaType === 'tv') {
                    fetchPromises.push(
                        fetch(`${BASE_URL}/trending/tv/${validTimeWindow}?api_key=${API_KEY}&language=en-US&page=${page}`)
                            .then((res) => res.json())
                            .then((data) => ({ type: 'tv', data }))
                    )
                }
            }
        }

        const trendingResponses = await Promise.all(fetchPromises)

        // Collect all content IDs
        const contentToFetch: Array<{ id: number; type: string; title: string; poster_path: string | null; popularity: number; genre_ids: number[] }> = []

        for (const response of trendingResponses) {
            if (response.data.results) {
                for (const item of response.data.results) {
                    const itemGenreIds: number[] = item.genre_ids || []

                    // If genre filter is specified, only include content that matches
                    if (genreIds.length > 0) {
                        const hasMatchingGenre = itemGenreIds.some(gid => genreIds.includes(gid))
                        if (!hasMatchingGenre) continue
                    }

                    contentToFetch.push({
                        id: item.id,
                        type: response.type,
                        title: item.title || item.name,
                        poster_path: item.poster_path,
                        popularity: item.popularity || 0,
                        genre_ids: itemGenreIds,
                    })
                }
            }
        }

        // Sort by popularity and take top items to reduce API calls
        contentToFetch.sort((a, b) => b.popularity - a.popularity)
        const topContent = contentToFetch.slice(0, 40)

        apiLog(`[Popular Directors] Fetching credits for ${topContent.length} trending items`)

        // Fetch credits for top trending content
        const creditPromises = topContent.map((item) =>
            fetch(`${BASE_URL}/${item.type}/${item.id}/credits?api_key=${API_KEY}&language=en-US`)
                .then((res) => res.json())
                .then((data) => ({ ...item, credits: data }))
                .catch(() => ({ ...item, credits: { crew: [] } }))
        )

        const creditResponses = await Promise.all(creditPromises)

        // Extract directors and track their recent works
        const directorMap = new Map<number, DirectorWithScore>()

        for (const response of creditResponses) {
            const crew = response.credits?.crew || []

            for (const member of crew) {
                // Look for directors
                if (member.job === 'Director' && member.profile_path) {
                    const existing = directorMap.get(member.id)

                    if (existing) {
                        // Add to score and recent works
                        existing.score += response.popularity
                        if (existing.recent_works.length < 4) {
                            existing.recent_works.push({
                                id: response.id,
                                title: response.title,
                                poster_path: response.poster_path,
                                media_type: response.type,
                                genre_ids: response.genre_ids,
                            })
                        }
                    } else {
                        // New director
                        directorMap.set(member.id, {
                            id: member.id,
                            name: member.name,
                            profile_path: member.profile_path,
                            known_for_department: 'Directing',
                            popularity: member.popularity || 0,
                            score: response.popularity,
                            recent_works: [
                                {
                                    id: response.id,
                                    title: response.title,
                                    poster_path: response.poster_path,
                                    media_type: response.type,
                                    genre_ids: response.genre_ids,
                                },
                            ],
                        })
                    }
                }
            }
        }

        // Convert to array and sort by score (trending relevance)
        const directors = Array.from(directorMap.values())
        directors.sort((a, b) => b.score - a.score)

        // Also add known_for field to match TrendingPerson interface
        const formattedDirectors = directors.map((d) => ({
            ...d,
            known_for: d.recent_works.map((work) => ({
                id: work.id,
                title: work.title,
                name: work.title,
                poster_path: work.poster_path,
                media_type: work.media_type,
                genre_ids: work.genre_ids,
            })),
        }))

        const hasMore = startPage + trendingPages <= 100 && directors.length > 0

        apiLog(`[Popular Directors] Found ${directors.length} directors, hasMore: ${hasMore}`)

        return NextResponse.json(
            {
                page: pageNumber,
                results: formattedDirectors,
                total_results: formattedDirectors.length,
                total_pages: 30, // ~100 pages of trending / 3 pages per request
                has_more: hasMore,
            },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
                },
            }
        )
    } catch (error) {
        apiError('Popular Directors API error:', error)
        return NextResponse.json({ message: 'Failed to fetch popular directors' }, { status: 500 })
    }
}
