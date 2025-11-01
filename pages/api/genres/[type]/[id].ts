import { NextApiRequest, NextApiResponse } from 'next'
import { filterContentByAdultFlag } from '../../../../utils/contentFilter'
import { filterMatureTVShows } from '../../../../utils/tvContentRatings'
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
            with_genres: genreIds.join(','),
            page: pageNum.toString(),
            sort_by: Array.isArray(sort_by) ? sort_by[0] : sort_by,
        })

        // Add child safety filters BEFORE fetching from TMDB
        if (childSafeMode) {
            if (type === 'movie') {
                // ✅ CURATED CONTENT STRATEGY
                // Exclude adult content (pornography)
                params.append('include_adult', 'false')

                // Family-friendly genre IDs: Animation (16), Family (10751), Comedy (35), Adventure (12)
                const familyFriendlyGenres = [16, 10751, 35, 12]
                const isFamilyFriendlyGenre = genreIds.some((id) =>
                    familyFriendlyGenres.includes(id)
                )

                if (!isFamilyFriendlyGenre) {
                    // For non-family genres (Action, Horror, etc.), require higher vote counts
                    // to favor more mainstream content that's more likely to be appropriate
                    params.append('vote_count.gte', '500')
                }
            }
            // Note: TV show filtering happens after fetch via filterMatureTVShows
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
        let enrichedResults = data.results.map((item: any) => ({
            ...item,
            media_type: type,
        }))

        // Apply child safety filtering if enabled
        if (childSafeMode) {
            const beforeCount = enrichedResults.length

            // ✅ CURATED CONTENT STRATEGY APPLIED
            // Movies: Filtered at query time with include_adult=false + vote_count thresholds
            // TV Shows: Post-filtered by content ratings API (removes TV-MA, TV-14)
            // Family-friendly movie genres get more lenient filtering
            // Non-family genres require higher vote counts to favor mainstream content

            if (type === 'movie') {
                // Movies: already filtered by include_adult=false at query time
                // Family-friendly genres show broader results
                // Other genres require vote_count.gte=500 for safety
                csDebugFilter(beforeCount, enrichedResults.length, 'Movie Curated Content')
            } else if (type === 'tv') {
                // TV shows: filter by content ratings (WORKS CORRECTLY)
                enrichedResults = await filterMatureTVShows(enrichedResults, API_KEY)
                csDebugFilter(beforeCount, enrichedResults.length, 'TV Content Ratings')
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
