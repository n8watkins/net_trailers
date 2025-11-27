import { NextRequest, NextResponse } from 'next/server'
import { apiError, apiLog } from '../../../../utils/debugLogger'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

// Cache this route for 1 hour
export const revalidate = 3600

interface TrendingPerson {
    id: number
    name: string
    profile_path: string | null
    known_for_department: string
    popularity: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    known_for?: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
}

export async function GET(request: NextRequest) {
    if (!API_KEY) {
        return NextResponse.json({ message: 'TMDB API key not configured' }, { status: 500 })
    }

    try {
        const searchParams = request.nextUrl.searchParams

        // Validate and sanitize page parameter (1-500 as per TMDB limits)
        const rawPage = searchParams.get('page') || '1'
        const parsedPage = parseInt(rawPage, 10)
        const pageNumber = Math.max(1, Math.min(500, isNaN(parsedPage) ? 1 : parsedPage))

        // Time window: day or week
        const timeWindow = searchParams.get('time_window') || 'week'
        const validTimeWindow = timeWindow === 'day' ? 'day' : 'week'

        // Filter by known_for_department
        const department = searchParams.get('department') // 'Acting' or 'Directing'

        // Filter by media type (movie or tv) - based on what they're known for
        const mediaType = searchParams.get('media_type') // 'movie' or 'tv'

        // Filter by genres (comma-separated TMDB genre IDs) - based on what they're known for
        const genresParam = searchParams.get('genres')
        const genreIds = genresParam
            ? genresParam
                  .split(',')
                  .map((id) => parseInt(id, 10))
                  .filter((id) => !isNaN(id))
            : []

        // For directors, media_type, or genre filtering, we need to aggregate from multiple pages since matches are rarer
        // For actors without filters, single page is usually fine but we support pagination
        const pagesToFetch = department === 'Directing' || mediaType || genreIds.length > 0 ? 5 : 1
        const startPage = (pageNumber - 1) * pagesToFetch + 1

        apiLog(
            `[Trending People] Fetching ${pagesToFetch} pages starting from ${startPage} for ${department || 'all'}`
        )

        // Fetch multiple pages in parallel for better aggregation
        const fetchPromises = []
        for (let i = 0; i < pagesToFetch; i++) {
            const page = startPage + i
            if (page <= 500) {
                const url = `${BASE_URL}/trending/person/${validTimeWindow}?api_key=${API_KEY}&language=en-US&page=${page}`
                fetchPromises.push(
                    fetch(url).then((res) => {
                        if (!res.ok) {
                            throw new Error(
                                `TMDB trending fetch failed (page ${page}): ${res.status}`
                            )
                        }
                        return res.json()
                    })
                )
            }
        }

        const responses = await Promise.all(fetchPromises)

        // Aggregate all results
        const allPeople: TrendingPerson[] = []
        const seenIds = new Set<number>()
        let totalPages = 500

        for (const data of responses) {
            if (data.results) {
                totalPages = Math.min(totalPages, data.total_pages || 500)
                for (const person of data.results) {
                    // Must have a profile image
                    if (!person.profile_path) continue

                    // If department specified, filter by it
                    if (department && person.known_for_department !== department) continue

                    // If media_type specified, filter by what they're primarily known for
                    if (mediaType && person.known_for && person.known_for.length > 0) {
                        const matchingItems = person.known_for.filter(
                            (item: { media_type?: string }) => item.media_type === mediaType
                        )
                        // Only include if majority of known_for matches the requested media type
                        if (matchingItems.length < person.known_for.length / 2) continue
                    }

                    // If genres specified, filter by what they're known for having those genres
                    if (genreIds.length > 0 && person.known_for && person.known_for.length > 0) {
                        const hasMatchingGenre = person.known_for.some(
                            (item: { genre_ids?: number[] }) =>
                                item.genre_ids &&
                                item.genre_ids.some((gid) => genreIds.includes(gid))
                        )
                        if (!hasMatchingGenre) continue
                    }

                    // Deduplicate
                    if (seenIds.has(person.id)) continue
                    seenIds.add(person.id)

                    allPeople.push(person)
                }
            }
        }

        // Sort by popularity
        allPeople.sort((a, b) => (b.popularity || 0) - (a.popularity || 0))

        // Calculate virtual pagination for the client
        // Each "client page" = pagesToFetch TMDB pages worth of filtered results
        const hasMore = startPage + pagesToFetch <= totalPages
        const virtualTotalPages = Math.ceil(totalPages / pagesToFetch)

        apiLog(
            `[Trending People] Found ${allPeople.length} ${department || 'people'}, hasMore: ${hasMore}`
        )

        return NextResponse.json(
            {
                page: pageNumber,
                results: allPeople,
                total_results: allPeople.length,
                total_pages: virtualTotalPages,
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
        apiError('TMDB API error:', error)
        return NextResponse.json({ message: 'Failed to fetch trending people' }, { status: 500 })
    }
}
