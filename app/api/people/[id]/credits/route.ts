import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '../../../../../utils/debugLogger'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

// Cache this route for 6 hours (person credits don't change often)
export const revalidate = 21600

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!API_KEY) {
        return NextResponse.json({ message: 'TMDB API key not configured' }, { status: 500 })
    }

    const { id: personId } = await params

    if (!personId) {
        return NextResponse.json({ message: 'Person ID is required' }, { status: 400 })
    }

    try {
        const searchParams = request.nextUrl.searchParams
        const childSafetyMode = searchParams.get('childSafetyMode') === 'true'

        // Fetch combined credits (movies + TV shows) for this person
        const url = `${BASE_URL}/person/${personId}/combined_credits?api_key=${API_KEY}&language=en-US`

        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`)
        }

        const data = await response.json()

        // Combine cast and crew, but prioritize cast
        const allCredits = [...(data.cast || []), ...(data.crew || [])]

        // Remove duplicates (person might be both cast and crew)
        const uniqueCredits = Array.from(
            new Map(
                allCredits.map((item) => [
                    `${item.id}-${item.media_type}`,
                    {
                        ...item,
                        // Add a priority score to help with sorting (cast > crew)
                        is_cast: (data.cast || []).some(
                            (c: { id: number; media_type: string }) =>
                                c.id === item.id && c.media_type === item.media_type
                        ),
                    },
                ])
            ).values()
        )

        // Apply child safety filtering if enabled
        let filteredCredits = uniqueCredits
        if (childSafetyMode) {
            filteredCredits = uniqueCredits.filter((item) => {
                // For movies, check certification
                if (item.media_type === 'movie' && item.adult) {
                    return false
                }
                // For TV shows, we can't filter by rating here (would need separate API calls)
                // So we just filter out adult content
                if (item.media_type === 'tv' && item.adult) {
                    return false
                }
                return true
            })
        }

        // Sort by popularity and release date
        filteredCredits.sort((a, b) => {
            // Prioritize cast over crew
            if (a.is_cast && !b.is_cast) return -1
            if (!a.is_cast && b.is_cast) return 1

            // Then by popularity
            const popDiff = (b.popularity || 0) - (a.popularity || 0)
            if (popDiff !== 0) return popDiff

            // Then by release date (newest first)
            const dateA =
                a.media_type === 'movie'
                    ? a.release_date || '1900-01-01'
                    : a.first_air_date || '1900-01-01'
            const dateB =
                b.media_type === 'movie'
                    ? b.release_date || '1900-01-01'
                    : b.first_air_date || '1900-01-01'
            return dateB.localeCompare(dateA)
        })

        return NextResponse.json(
            {
                id: Number(personId),
                cast: data.cast || [],
                crew: data.crew || [],
                combined: filteredCredits,
                total_results: filteredCredits.length,
            },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
                },
            }
        )
    } catch (error) {
        apiError('TMDB API error:', error)
        return NextResponse.json({ message: 'Failed to fetch person credits' }, { status: 500 })
    }
}
