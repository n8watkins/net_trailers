import { NextRequest, NextResponse } from 'next/server'
import { TMDBApiClient } from '@/utils/tmdbApi'

/**
 * Preview endpoint - fetch sample content based on selected suggestions
 */
export async function POST(request: NextRequest) {
    try {
        const { suggestions, mediaType } = await request.json()

        if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
            return NextResponse.json({ content: [] })
        }

        const tmdb = TMDBApiClient.getInstance()

        // Build query parameters from suggestions
        const discoverParams: any = {
            sort_by: 'popularity.desc',
            'vote_count.gte': 10,
            page: 1,
        }

        // Process each suggestion type
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
                case 'director':
                    discoverParams.with_people = suggestion.value
                    break

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

        // Fetch content based on media type
        let content: any[] = []

        if (mediaType === 'movie' || mediaType === 'both') {
            const movieParams = { ...discoverParams }
            delete movieParams.first_air_date
            const movies = await tmdb.fetch('/discover/movie', movieParams)
            content.push(...(movies.results || []).slice(0, 10))
        }

        if (mediaType === 'tv' || mediaType === 'both') {
            const tvParams = { ...discoverParams }
            delete tvParams.primary_release_date
            const shows = await tmdb.fetch('/discover/tv', tvParams)
            content.push(...(shows.results || []).slice(0, 10))
        }

        // Limit to 10 items max
        content = content.slice(0, 10)

        return NextResponse.json({ content })
    } catch (error) {
        console.error('Preview fetch error:', error)
        return NextResponse.json({ content: [] })
    }
}
