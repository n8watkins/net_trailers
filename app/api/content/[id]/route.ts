import { NextRequest, NextResponse } from 'next/server'
import { fetchTVContentRatings, hasMatureRating } from '../../../../utils/tvContentRatings'
import { tmdbContentCache } from '../../../../utils/apiCache'
import { apiError } from '../../../../utils/debugLogger'

// Cache this route for 1 hour
export const revalidate = 3600

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const childSafetyMode = searchParams.get('childSafetyMode')
    const childSafeMode = childSafetyMode === 'true'

    if (!id) {
        return NextResponse.json({ error: 'Content ID is required' }, { status: 400 })
    }

    const contentId = parseInt(id)
    if (isNaN(contentId)) {
        return NextResponse.json({ error: 'Invalid content ID' }, { status: 400 })
    }

    const API_KEY = process.env.TMDB_API_KEY
    if (!API_KEY) {
        apiError('TMDB_API_KEY is not configured')
        return NextResponse.json({ error: 'API configuration error' }, { status: 500 })
    }

    // Create cache key including child safety mode since filtered data differs
    const cacheKey = `content-${contentId}-childSafe-${childSafeMode}`

    try {
        // Check cache first
        const cachedData = tmdbContentCache.get(cacheKey)
        if (cachedData) {
            return NextResponse.json(cachedData, { status: 200 })
        }

        // Try to fetch as a movie first
        const movieResponse = await fetch(
            `https://api.themoviedb.org/3/movie/${contentId}?api_key=${API_KEY}&language=en-US`
        )

        if (movieResponse.ok) {
            const movieData = await movieResponse.json()

            // Check child safety for movies (adult flag)
            if (childSafeMode && movieData.adult === true) {
                return NextResponse.json(
                    {
                        error: 'Content blocked by child safety mode',
                        reason: 'adult_content',
                    },
                    { status: 403 }
                )
            }

            // Add media_type to distinguish from TV shows
            const enrichedMovieData = {
                ...movieData,
                media_type: 'movie',
            }

            // Cache the result (30 minutes TTL)
            tmdbContentCache.set(cacheKey, enrichedMovieData)

            return NextResponse.json(enrichedMovieData, {
                status: 200,
                headers: {
                    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
                },
            })
        }

        // If movie fetch failed, try as a TV show
        const tvResponse = await fetch(
            `https://api.themoviedb.org/3/tv/${contentId}?api_key=${API_KEY}&language=en-US`
        )

        if (tvResponse.ok) {
            const tvData = await tvResponse.json()

            // Check child safety for TV shows (content ratings)
            if (childSafeMode) {
                const ratings = await fetchTVContentRatings(contentId, API_KEY)
                if (ratings && hasMatureRating(ratings)) {
                    return NextResponse.json(
                        {
                            error: 'Content blocked by child safety mode',
                            reason: 'mature_rating',
                        },
                        { status: 403 }
                    )
                }
            }

            // Add media_type and transform TV show data to match movie structure
            const enrichedTvData = {
                ...tvData,
                media_type: 'tv',
            }

            // Cache the result (30 minutes TTL)
            tmdbContentCache.set(cacheKey, enrichedTvData)

            return NextResponse.json(enrichedTvData, {
                status: 200,
                headers: {
                    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
                },
            })
        }

        // If both failed, the content doesn't exist
        return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    } catch (error) {
        apiError('Error fetching content details:', error)
        return NextResponse.json({ error: 'Failed to fetch content details' }, { status: 500 })
    }
}
