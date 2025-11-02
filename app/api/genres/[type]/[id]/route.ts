import { NextRequest, NextResponse } from 'next/server'
import { filterMatureTVShows } from '../../../../../utils/tvContentRatings'
import { filterMatureMovies } from '../../../../../utils/movieCertifications'
import { csDebugTMDB, csDebugResponse, csDebugFilter } from '../../../../../utils/childSafetyDebug'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ type: string; id: string }> }
) {
    const { type, id } = await params
    const searchParams = request.nextUrl.searchParams

    const page = searchParams.get('page') || '1'
    const sort_by = searchParams.get('sort_by') || 'popularity.desc'
    const vote_average_gte = searchParams.get('vote_average_gte')
    const vote_average_lte = searchParams.get('vote_average_lte')
    const vote_count_gte = searchParams.get('vote_count_gte')
    const year = searchParams.get('year')
    const primary_release_year = searchParams.get('primary_release_year')
    const primary_release_date_gte = searchParams.get('primary_release_date_gte')
    const primary_release_date_lte = searchParams.get('primary_release_date_lte')
    const first_air_date_gte = searchParams.get('first_air_date_gte')
    const first_air_date_lte = searchParams.get('first_air_date_lte')
    const with_runtime_gte = searchParams.get('with_runtime_gte')
    const with_runtime_lte = searchParams.get('with_runtime_lte')
    const childSafetyMode = searchParams.get('childSafetyMode')
    const childSafeMode = childSafetyMode === 'true'

    if (!id || !type) {
        return NextResponse.json({ error: 'Genre ID and type are required' }, { status: 400 })
    }

    // Handle both single genre and comma-separated multiple genres
    const genreIds = id
        .split(',')
        .map((genreId) => parseInt(genreId.trim()))
        .filter((genreId) => !isNaN(genreId))
    if (genreIds.length === 0) {
        return NextResponse.json({ error: 'Invalid genre ID(s)' }, { status: 400 })
    }

    const pageNum = parseInt(page)
    if (isNaN(pageNum) || pageNum < 1) {
        return NextResponse.json({ error: 'Invalid page number' }, { status: 400 })
    }

    if (type !== 'movie' && type !== 'tv') {
        return NextResponse.json({ error: 'Type must be either "movie" or "tv"' }, { status: 400 })
    }

    const API_KEY = process.env.TMDB_API_KEY
    if (!API_KEY) {
        console.error('TMDB_API_KEY is not configured')
        return NextResponse.json({ error: 'API configuration error' }, { status: 500 })
    }

    try {
        // Build query parameters
        const queryParams = new URLSearchParams({
            api_key: API_KEY,
            page: pageNum.toString(),
            sort_by: sort_by,
        })

        // Add child safety filters BEFORE fetching from TMDB
        if (childSafeMode) {
            if (type === 'movie') {
                // ✅ RATING-BASED FILTERING STRATEGY
                // Exclude adult content (pornography)
                queryParams.append('include_adult', 'false')

                // Child-safe movie genres (must match CHILD_SAFE_MOVIE_GENRES)
                // Action (28), Adventure (12), Animation (16), Comedy (35), Documentary (99),
                // Family (10751), Fantasy (14), History (36), Music (10402), Mystery (9648),
                // Romance (10749), Sci-Fi (878), War (10752), Western (37)
                const childSafeGenres = [
                    28, 12, 16, 35, 99, 10751, 14, 36, 10402, 9648, 10749, 878, 10752, 37,
                ]

                // Check if requested genre is child-safe
                const isChildSafeGenre = genreIds.every((id) => childSafeGenres.includes(id))

                if (!isChildSafeGenre) {
                    // SECURITY: Block access to non-child-safe genres
                    // Return empty results for Horror, Crime, Thriller, War, etc.
                    return NextResponse.json(
                        {
                            page: 1,
                            results: [],
                            total_pages: 0,
                            total_results: 0,
                            child_safety_enabled: true,
                            genre_blocked: true,
                            message:
                                'This genre is not available in child safety mode. Please disable child safety mode to access all genres.',
                        },
                        { status: 200 }
                    )
                }

                // CRITICAL: Filter by MPAA certification (US ratings)
                // certification.lte=PG-13 means: include G, PG, and PG-13 rated movies
                // This excludes R, NC-17, and unrated content
                queryParams.append('certification_country', 'US')
                queryParams.append('certification.lte', 'PG-13')

                // Use requested genres as-is (now safe because of rating filter)
                queryParams.append('with_genres', genreIds.join(','))

                // Require minimum vote count for quality/popularity
                // Lower threshold since we now have proper rating filtering
                queryParams.append('vote_count.gte', '100')
            } else {
                // ✅ TV GENRE BLOCKING STRATEGY (matching movie behavior)
                // Child-safe TV genres (must match CHILD_SAFE_TV_GENRES)
                // Action & Adventure (10759), Animation (16), Comedy (35), Documentary (99),
                // Family (10751), Kids (10762), Mystery (9648), Sci-Fi & Fantasy (10765)
                const childSafeTvGenres = [10759, 16, 35, 99, 10751, 10762, 9648, 10765]

                // Check if requested genre is child-safe
                const isChildSafeGenre = genreIds.every((id) => childSafeTvGenres.includes(id))

                if (!isChildSafeGenre) {
                    // SECURITY: Block access to non-child-safe TV genres
                    // Return empty results for News, Reality, Soap, Talk, War & Politics, Western, etc.
                    return NextResponse.json(
                        {
                            page: 1,
                            results: [],
                            total_pages: 0,
                            total_results: 0,
                            child_safety_enabled: true,
                            genre_blocked: true,
                            message:
                                'This genre is not available in child safety mode. Please disable child safety mode to access all genres.',
                        },
                        { status: 200 }
                    )
                }

                // TV: use requested genres, filtering happens post-fetch via filterMatureTVShows
                queryParams.append('with_genres', genreIds.join(','))
            }
        } else {
            // Normal mode: use requested genres as-is
            queryParams.append('with_genres', genreIds.join(','))
        }

        // Add optional filters
        if (vote_average_gte) queryParams.append('vote_average.gte', vote_average_gte)
        if (vote_average_lte) queryParams.append('vote_average.lte', vote_average_lte)
        if (vote_count_gte) queryParams.append('vote_count.gte', vote_count_gte)

        // Movie-specific filters
        if (type === 'movie') {
            if (primary_release_year)
                queryParams.append('primary_release_year', primary_release_year)
            if (primary_release_date_gte)
                queryParams.append('primary_release_date.gte', primary_release_date_gte)
            if (primary_release_date_lte)
                queryParams.append('primary_release_date.lte', primary_release_date_lte)
            if (with_runtime_gte) queryParams.append('with_runtime.gte', with_runtime_gte)
            if (with_runtime_lte) queryParams.append('with_runtime.lte', with_runtime_lte)
        }

        // TV-specific filters
        if (type === 'tv') {
            if (first_air_date_gte) queryParams.append('first_air_date.gte', first_air_date_gte)
            if (first_air_date_lte) queryParams.append('first_air_date.lte', first_air_date_lte)
            if (year) queryParams.append('first_air_date_year', year)
        }

        const endpoint =
            type === 'movie'
                ? `https://api.themoviedb.org/3/discover/movie?${queryParams.toString()}`
                : `https://api.themoviedb.org/3/discover/tv?${queryParams.toString()}`

        // Debug logging
        csDebugTMDB(endpoint, childSafeMode)

        const response = await fetch(endpoint)

        if (!response.ok) {
            console.error(`TMDB API error: ${response.status} ${response.statusText}`)
            return NextResponse.json(
                { error: 'Failed to fetch content from TMDB' },
                { status: response.status }
            )
        }

        const data = await response.json()

        // Add media_type to each item for consistency
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let enrichedResults = data.results.map((item: any) => ({
            ...item,
            media_type: type,
        }))

        // Apply child safety filtering if enabled
        if (childSafeMode) {
            const beforeCount = enrichedResults.length

            // ✅ RATING-BASED FILTERING STRATEGY APPLIED
            // Movies: Filtered at query time with certification.lte=PG-13 (G, PG, PG-13 only)
            // TV Shows: Filtered post-fetch by content ratings (excludes TV-MA)

            if (type === 'movie') {
                // OPTIMIZATION: Skip redundant post-processing for movies
                // The discover endpoint with certification.lte=PG-13 already filters by rating
                // TMDB's certification filter is authoritative - no need to double-check
                // This eliminates 20+ individual certification API calls per page
                csDebugFilter(
                    beforeCount,
                    enrichedResults.length,
                    'Movie Certification Filter (skipped - filtered at source)'
                )
            } else if (type === 'tv') {
                // TV shows: ALWAYS filter by content ratings in child safety mode
                // Unlike movies, TV has no certification.lte parameter, so post-fetch filtering is required
                // Even "family" genres like Comedy and Animation can have TV-MA content
                // (e.g., Shameless, Hazbin Hotel, The Witcher, etc.)
                enrichedResults = await filterMatureTVShows(enrichedResults, API_KEY)
                csDebugFilter(beforeCount, enrichedResults.length, 'TV Content Ratings Filter')
            }

            const hiddenCount = beforeCount - enrichedResults.length

            // Debug log the final results
            csDebugResponse(`/api/genres/${type}/${id}`, enrichedResults, childSafeMode)

            return NextResponse.json(
                {
                    ...data,
                    results: enrichedResults,
                    child_safety_enabled: true,
                    hidden_count: hiddenCount,
                },
                { status: 200 }
            )
        }

        // Debug log normal mode too
        csDebugResponse(`/api/genres/${type}/${id}`, enrichedResults, childSafeMode)

        return NextResponse.json(
            {
                ...data,
                results: enrichedResults,
            },
            { status: 200 }
        )
    } catch (error) {
        console.error('Error fetching genre content:', error)
        return NextResponse.json({ error: 'Failed to fetch genre content' }, { status: 500 })
    }
}
