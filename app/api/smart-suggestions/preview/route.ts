import { NextRequest, NextResponse } from 'next/server'
import { TMDBApiClient } from '@/utils/tmdbApi'
import { MemoryRateLimiter } from '@/lib/rateLimiter'
import { getRequestIdentity } from '@/lib/requestIdentity'
import { apiWarn, apiError } from '@/utils/debugLogger'

const previewLimiter = new MemoryRateLimiter(
    Number(process.env.SMART_PREVIEW_MAX_REQUESTS || 60),
    Number(process.env.SMART_PREVIEW_WINDOW_MS || 60_000)
)

/**
 * Preview endpoint - fetch sample content based on selected suggestions
 */
export async function POST(request: NextRequest) {
    try {
        const { rateLimitKey } = await getRequestIdentity(request)
        const rateStatus = previewLimiter.consume(rateLimitKey)
        if (!rateStatus.allowed) {
            return NextResponse.json(
                {
                    error: 'Preview limit reached. Please slow down.',
                    retryAfterMs: rateStatus.retryAfterMs,
                },
                { status: 429 }
            )
        }

        const { suggestions, mediaType } = await request.json()

        if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
            return NextResponse.json({ content: [] })
        }

        const tmdb = TMDBApiClient.getInstance()

        // Check if we have a content_list suggestion (Gemini-curated specific content)
        // For hybrid queries (e.g., "dark scifi thriller"), this takes priority in preview
        // Genres are still stored and used as fallback when row needs more content
        const contentListSuggestion = suggestions.find((s: any) => s.type === 'content_list')
        if (contentListSuggestion) {
            // Directly fetch the specific content IDs recommended by Gemini
            // Use parallel fetching for better performance
            const tmdb = TMDBApiClient.getInstance()
            const idsToFetch = contentListSuggestion.value.slice(0, 20) // Limit to 20 items for preview

            const fetchPromises = idsToFetch.map(async (tmdbId: number) => {
                try {
                    const endpoint =
                        mediaType === 'tv' || mediaType === 'both'
                            ? `/tv/${tmdbId}`
                            : `/movie/${tmdbId}`

                    const item = await tmdb.fetch(endpoint, {})
                    return item
                } catch (error) {
                    apiWarn(`Failed to fetch content ${tmdbId}:`, error)
                    return null
                }
            })

            const results = await Promise.all(fetchPromises)
            const content = results.filter((item) => item !== null)

            return NextResponse.json({
                content: content.slice(0, 10),
                totalResults: contentListSuggestion.value.length,
            })
        }

        // Build query parameters from suggestions
        const discoverParams: any = {
            sort_by: 'popularity.desc',
            'vote_count.gte': 10,
            page: 1,
        }

        // Process each suggestion type
        const requiredPeopleIds: number[] = []
        const optionalPeopleIds: number[] = []

        for (const suggestion of suggestions) {
            switch (suggestion.type) {
                case 'genre':
                    if (Array.isArray(suggestion.value)) {
                        discoverParams.with_genres = suggestion.value.join(',')
                    }
                    break

                case 'rating':
                    if (suggestion.value.min) {
                        discoverParams['vote_average.gte'] = suggestion.value.min
                    }
                    if (suggestion.value.max) {
                        discoverParams['vote_average.lte'] = suggestion.value.max
                    }
                    break

                case 'year_range':
                    if (suggestion.value.min) {
                        discoverParams['primary_release_date.gte'] = `${suggestion.value.min}-01-01`
                        discoverParams['first_air_date.gte'] = `${suggestion.value.min}-01-01`
                    }
                    if (suggestion.value.max) {
                        discoverParams['primary_release_date.lte'] = `${suggestion.value.max}-12-31`
                        discoverParams['first_air_date.lte'] = `${suggestion.value.max}-12-31`
                    }
                    break

                case 'actor':
                case 'director': {
                    const peopleArray = Array.isArray(suggestion.value)
                        ? suggestion.value
                        : [suggestion.value]

                    // Separate required (AND logic) vs optional (OR logic)
                    if (suggestion.required) {
                        requiredPeopleIds.push(...peopleArray)
                    } else {
                        optionalPeopleIds.push(...peopleArray)
                    }
                    break
                }

                case 'studio':
                    discoverParams.with_companies = suggestion.value
                    break

                case 'certification':
                    if (Array.isArray(suggestion.value)) {
                        discoverParams.certification = suggestion.value.join('|')
                        discoverParams.certification_country = 'US'
                    }
                    break
            }
        }

        // Add people IDs (TMDB uses with_people for both actors and directors)
        // For required people (AND logic), we'll need to filter results client-side
        // For optional people (OR logic), TMDB's with_people handles this natively
        const allPeopleIds = [...requiredPeopleIds, ...optionalPeopleIds]
        if (allPeopleIds.length > 0) {
            discoverParams.with_people = allPeopleIds.join(',')
        }

        // Fetch content based on media type
        let content: any[] = []
        let totalResults = 0

        if (mediaType === 'movie' || mediaType === 'both') {
            const movieParams = { ...discoverParams }
            delete movieParams.first_air_date
            const movies = (await tmdb.fetch('/discover/movie', movieParams)) as any
            if (movies && Array.isArray(movies.results)) {
                content.push(...movies.results.slice(0, 10))
                totalResults += movies.total_results || 0
            }
        }

        if (mediaType === 'tv' || mediaType === 'both') {
            const tvParams = { ...discoverParams }
            delete tvParams.primary_release_date
            const shows = (await tmdb.fetch('/discover/tv', tvParams)) as any
            if (shows && Array.isArray(shows.results)) {
                content.push(...shows.results.slice(0, 10))
                totalResults += shows.total_results || 0
            }
        }

        // Client-side filtering for required people (AND logic)
        // TMDB's with_people uses OR logic, so we need to filter to ensure ALL required people are present
        if (requiredPeopleIds.length > 1) {
            const filteredContent = []

            for (const item of content) {
                // Fetch credits for this item to check if all required people are present
                try {
                    const creditsEndpoint =
                        item.media_type === 'movie' || mediaType === 'movie'
                            ? `/movie/${item.id}/credits`
                            : `/tv/${item.id}/credits`

                    const credits = (await tmdb.fetch(creditsEndpoint, {})) as any

                    // Get all person IDs in this content (cast + crew)
                    const castIds = credits?.cast?.map((c: any) => c.id) || []
                    const crewIds = credits?.crew?.map((c: any) => c.id) || []
                    const allPersonIds = new Set([...castIds, ...crewIds])

                    // Check if ALL required people are present
                    const hasAllRequiredPeople = requiredPeopleIds.every((id) =>
                        allPersonIds.has(id)
                    )

                    if (hasAllRequiredPeople) {
                        filteredContent.push(item)
                    }
                } catch (error) {
                    // If credits fetch fails, skip this item
                    apiWarn(`Failed to fetch credits for ${item.id}:`, error)
                }

                // Stop if we have enough items
                if (filteredContent.length >= 10) break
            }

            content = filteredContent
        } else {
            // No filtering needed, just limit to 10 items
            content = content.slice(0, 10)
        }

        return NextResponse.json({ content, totalResults })
    } catch (error) {
        apiError('Preview fetch error:', error)
        return NextResponse.json({ content: [] })
    }
}
