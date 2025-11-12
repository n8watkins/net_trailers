import { NextRequest, NextResponse } from 'next/server'
import { filterContentByAdultFlag } from '../../../utils/contentFilter'
import { filterMatureTVShows } from '../../../utils/tvContentRatings'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

export async function GET(request: NextRequest) {
    if (!API_KEY) {
        return NextResponse.json({ message: 'TMDB API key not configured' }, { status: 500 })
    }

    const searchParams = request.nextUrl.searchParams
    const mediaType = searchParams.get('media_type') || 'movie' // 'movie' or 'tv'
    const page = searchParams.get('page') || '1'
    const childSafetyMode = searchParams.get('childSafetyMode')
    const childSafeMode = childSafetyMode === 'true'

    // Genre filters
    const withGenres = searchParams.get('with_genres') // Comma-separated genre IDs

    // Advanced filters
    const voteAverageGte = searchParams.get('vote_average.gte')
    const voteAverageLte = searchParams.get('vote_average.lte')
    const primaryReleaseDateGte = searchParams.get('primary_release_date.gte')
    const primaryReleaseDateLte = searchParams.get('primary_release_date.lte')
    const firstAirDateGte = searchParams.get('first_air_date.gte')
    const firstAirDateLte = searchParams.get('first_air_date.lte')
    const voteCountGte = searchParams.get('vote_count.gte')

    try {
        // Build URL for TMDB discover API
        const discoverEndpoint = mediaType === 'tv' ? 'discover/tv' : 'discover/movie'
        const url = new URL(`${BASE_URL}/${discoverEndpoint}`)
        // API key moved to Authorization header for security
        url.searchParams.append('language', 'en-US')
        url.searchParams.append('page', page)
        url.searchParams.append('sort_by', 'popularity.desc')

        // Add genre filters
        if (withGenres) {
            url.searchParams.append('with_genres', withGenres)
        }

        // Add rating filters
        if (voteAverageGte) {
            url.searchParams.append('vote_average.gte', voteAverageGte)
        }
        if (voteAverageLte) {
            url.searchParams.append('vote_average.lte', voteAverageLte)
        }

        // Add date filters (different params for movies vs TV)
        if (mediaType === 'movie') {
            if (primaryReleaseDateGte) {
                url.searchParams.append('primary_release_date.gte', primaryReleaseDateGte)
            }
            if (primaryReleaseDateLte) {
                url.searchParams.append('primary_release_date.lte', primaryReleaseDateLte)
            }
        } else {
            if (firstAirDateGte) {
                url.searchParams.append('first_air_date.gte', firstAirDateGte)
            }
            if (firstAirDateLte) {
                url.searchParams.append('first_air_date.lte', firstAirDateLte)
            }
        }

        // Add vote count filter
        if (voteCountGte) {
            url.searchParams.append('vote_count.gte', voteCountGte)
        }

        // Child safety mode filtering
        if (childSafeMode && mediaType === 'movie') {
            url.searchParams.append('certification_country', 'US')
            url.searchParams.append('certification.lte', 'PG-13')
        }

        // Use Authorization header instead of query parameter for security
        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`)
        }

        const data = await response.json()

        // Add media_type to each item for consistency
        let enrichedResults = data.results.map((item: any) => ({
            ...item,
            media_type: mediaType,
        }))

        // Apply child safety filtering
        if (childSafeMode) {
            const beforeCount = enrichedResults.length

            if (mediaType === 'movie') {
                // Filter movies by adult flag
                enrichedResults = filterContentByAdultFlag(enrichedResults, true)
            } else {
                // Filter TV shows by content rating
                enrichedResults = await filterMatureTVShows(enrichedResults, API_KEY)
            }

            const hiddenCount = beforeCount - enrichedResults.length

            return NextResponse.json(
                {
                    ...data,
                    results: enrichedResults,
                    child_safety_enabled: true,
                    hidden_count: hiddenCount,
                },
                {
                    status: 200,
                    headers: {
                        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
                    },
                }
            )
        }

        return NextResponse.json(
            {
                ...data,
                results: enrichedResults,
            },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
                },
            }
        )
    } catch (error) {
        console.error('TMDB discover API error:', error)
        return NextResponse.json(
            { message: 'Failed to fetch content', error: (error as Error).message },
            { status: 500 }
        )
    }
}
