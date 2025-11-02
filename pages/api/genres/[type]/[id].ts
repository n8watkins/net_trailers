import { NextApiRequest, NextApiResponse } from 'next'
import { filterMatureTVShows } from '../../../../utils/tvContentRatings'
import { filterMatureMovies } from '../../../../utils/movieCertifications'
import { csDebugTMDB, csDebugResponse, csDebugFilter } from '../../../../utils/childSafetyDebug'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const {
        type,
        id,
        page = '1',
        sort_by = 'popularity.desc',
        vote_average_gte,
        vote_average_lte,
        vote_count_gte,
        year,
        primary_release_year,
        primary_release_date_gte,
        primary_release_date_lte,
        first_air_date_gte,
        first_air_date_lte,
        with_runtime_gte,
        with_runtime_lte,
        childSafetyMode,
    } = req.query
    const childSafeMode = childSafetyMode === 'true'

    if (!id || typeof id !== 'string' || !type || typeof type !== 'string') {
        return res.status(400).json({ error: 'Genre ID and type are required' })
    }

    // Handle both single genre and comma-separated multiple genres
    const genreIds = id
        .split(',')
        .map((genreId) => parseInt(genreId.trim()))
        .filter((genreId) => !isNaN(genreId))
    if (genreIds.length === 0) {
        return res.status(400).json({ error: 'Invalid genre ID(s)' })
    }

    const pageNum = parseInt(Array.isArray(page) ? page[0] : page)
    if (isNaN(pageNum) || pageNum < 1) {
        return res.status(400).json({ error: 'Invalid page number' })
    }

    if (type !== 'movie' && type !== 'tv') {
        return res.status(400).json({ error: 'Type must be either "movie" or "tv"' })
    }

    const API_KEY = process.env.TMDB_API_KEY
    if (!API_KEY) {
        console.error('TMDB_API_KEY is not configured')
        return res.status(500).json({ error: 'API configuration error' })
    }

    try {
        // Build query parameters
        const params = new URLSearchParams({
            api_key: API_KEY,
            page: pageNum.toString(),
            sort_by: Array.isArray(sort_by) ? sort_by[0] : sort_by,
        })

        // Add child safety filters BEFORE fetching from TMDB
        if (childSafeMode) {
            if (type === 'movie') {
                // ✅ RATING-BASED FILTERING STRATEGY
                // Exclude adult content (pornography)
                params.append('include_adult', 'false')

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
                    return res.status(200).json({
                        page: 1,
                        results: [],
                        total_pages: 0,
                        total_results: 0,
                        child_safety_enabled: true,
                        genre_blocked: true,
                        message:
                            'This genre is not available in child safety mode. Please disable child safety mode to access all genres.',
                    })
                }

                // CRITICAL: Filter by MPAA certification (US ratings)
                // certification.lte=PG-13 means: include G, PG, and PG-13 rated movies
                // This excludes R, NC-17, and unrated content
                params.append('certification_country', 'US')
                params.append('certification.lte', 'PG-13')

                // Use requested genres as-is (now safe because of rating filter)
                params.append('with_genres', genreIds.join(','))

                // Require minimum vote count for quality/popularity
                // Lower threshold since we now have proper rating filtering
                params.append('vote_count.gte', '100')
            } else {
                // TV: use requested genres, filtering happens post-fetch via filterMatureTVShows
                params.append('with_genres', genreIds.join(','))
            }
        } else {
            // Normal mode: use requested genres as-is
            params.append('with_genres', genreIds.join(','))
        }

        // Add optional filters
        if (vote_average_gte)
            params.append(
                'vote_average.gte',
                Array.isArray(vote_average_gte) ? vote_average_gte[0] : vote_average_gte
            )
        if (vote_average_lte)
            params.append(
                'vote_average.lte',
                Array.isArray(vote_average_lte) ? vote_average_lte[0] : vote_average_lte
            )
        if (vote_count_gte)
            params.append(
                'vote_count.gte',
                Array.isArray(vote_count_gte) ? vote_count_gte[0] : vote_count_gte
            )

        // Movie-specific filters
        if (type === 'movie') {
            if (primary_release_year)
                params.append(
                    'primary_release_year',
                    Array.isArray(primary_release_year)
                        ? primary_release_year[0]
                        : primary_release_year
                )
            if (primary_release_date_gte)
                params.append(
                    'primary_release_date.gte',
                    Array.isArray(primary_release_date_gte)
                        ? primary_release_date_gte[0]
                        : primary_release_date_gte
                )
            if (primary_release_date_lte)
                params.append(
                    'primary_release_date.lte',
                    Array.isArray(primary_release_date_lte)
                        ? primary_release_date_lte[0]
                        : primary_release_date_lte
                )
            if (with_runtime_gte)
                params.append(
                    'with_runtime.gte',
                    Array.isArray(with_runtime_gte) ? with_runtime_gte[0] : with_runtime_gte
                )
            if (with_runtime_lte)
                params.append(
                    'with_runtime.lte',
                    Array.isArray(with_runtime_lte) ? with_runtime_lte[0] : with_runtime_lte
                )
        }

        // TV-specific filters
        if (type === 'tv') {
            if (first_air_date_gte)
                params.append(
                    'first_air_date.gte',
                    Array.isArray(first_air_date_gte) ? first_air_date_gte[0] : first_air_date_gte
                )
            if (first_air_date_lte)
                params.append(
                    'first_air_date.lte',
                    Array.isArray(first_air_date_lte) ? first_air_date_lte[0] : first_air_date_lte
                )
            if (year) params.append('first_air_date_year', Array.isArray(year) ? year[0] : year)
        }

        const endpoint =
            type === 'movie'
                ? `https://api.themoviedb.org/3/discover/movie?${params.toString()}`
                : `https://api.themoviedb.org/3/discover/tv?${params.toString()}`

        // Debug logging
        csDebugTMDB(endpoint, childSafeMode)

        const response = await fetch(endpoint)

        if (!response.ok) {
            console.error(`TMDB API error: ${response.status} ${response.statusText}`)
            return res.status(response.status).json({ error: 'Failed to fetch content from TMDB' })
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
            // Both approaches exclude unrated content for safety

            if (type === 'movie') {
                // Movies: DOUBLE FILTER for maximum safety
                // 1. Query-time filter with certification.lte=PG-13 (fast, but may miss some)
                // 2. Post-fetch verification with individual API calls (accurate, catches all)
                // This ensures ONLY G, PG, and PG-13 rated movies are returned
                enrichedResults = await filterMatureMovies(enrichedResults, API_KEY)
                csDebugFilter(beforeCount, enrichedResults.length, 'Movie Certification Filter')
            } else if (type === 'tv') {
                // TV shows: ALWAYS filter by content ratings in child safety mode
                // Unlike movies, TV ratings API is reliable and works well
                // Even "family" genres like Comedy and Animation can have TV-MA content
                // (e.g., Shameless, Hazbin Hotel, The Witcher, etc.)
                enrichedResults = await filterMatureTVShows(enrichedResults, API_KEY)
                csDebugFilter(beforeCount, enrichedResults.length, 'TV Content Ratings Filter')
            }

            const hiddenCount = beforeCount - enrichedResults.length

            // Debug log the final results
            csDebugResponse(`/api/genres/${type}/${id}`, enrichedResults, childSafeMode)

            return res.status(200).json({
                ...data,
                results: enrichedResults,
                child_safety_enabled: true,
                hidden_count: hiddenCount,
            })
        }

        // Debug log normal mode too
        csDebugResponse(`/api/genres/${type}/${id}`, enrichedResults, childSafeMode)

        return res.status(200).json({
            ...data,
            results: enrichedResults,
        })
    } catch (error) {
        console.error('Error fetching genre content:', error)
        return res.status(500).json({ error: 'Failed to fetch genre content' })
    }
}
