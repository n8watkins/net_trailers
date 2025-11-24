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

        // Filter out very obscure content (likely unimportant appearances)
        filteredCredits = filteredCredits.filter((item) => {
            const voteCount = item.vote_count || 0
            // Keep if it has at least 10 votes, or if it's very recent (within 1 year)
            if (voteCount >= 10) return true

            const releaseDate =
                item.media_type === 'movie'
                    ? item.release_date || '1900-01-01'
                    : item.first_air_date || '1900-01-01'
            const yearsSinceRelease =
                (Date.now() - new Date(releaseDate).getTime()) / (365 * 24 * 60 * 60 * 1000)
            return yearsSinceRelease < 1 // Keep recent content even if low votes
        })

        // Calculate priority scores for intelligent sorting
        const creditsWithScores = filteredCredits.map((item) => {
            let score = 0

            // 1. Cast vs Crew (huge difference)
            if (item.is_cast) {
                score += 1000
            } else {
                score += 100
            }

            // 2. Media Type Priority (Movies > TV Series > Talk Shows/Reality)
            if (item.media_type === 'movie') {
                score += 500 // Movies are typically more notable
            } else if (item.media_type === 'tv') {
                // Check for talk shows, news, reality TV (low-priority genres)
                const genres = item.genre_ids || []
                const isTalkShow = genres.includes(10767) // Talk
                const isNews = genres.includes(10763) // News
                const isReality = genres.includes(10764) // Reality

                if (isTalkShow || isNews || isReality) {
                    score -= 800 // Heavy penalty for talk shows/news/reality
                } else {
                    score += 200 // Regular TV series
                }

                // Episode count matters for TV (main cast vs guest appearances)
                const episodeCount = item.episode_count || 0
                if (episodeCount > 20) {
                    score += 150 // Main cast member
                } else if (episodeCount > 5) {
                    score += 50 // Recurring role
                } else if (episodeCount === 1) {
                    score -= 50 // Single episode appearance (likely guest spot)
                }
            }

            // 3. Quality Indicators
            const voteAverage = item.vote_average || 0
            const voteCount = item.vote_count || 0

            // Vote average bonus (max +100 for 10/10 rating)
            score += voteAverage * 10

            // Vote count bonus (logarithmic scale - popular content scores higher)
            if (voteCount > 0) {
                score += Math.log10(voteCount) * 20
            }

            // 4. Popularity (smaller weight than before)
            const popularity = item.popularity || 0
            score += Math.min(popularity * 2, 100) // Cap at 100

            // 5. Recency bonus (favor recent work, but not too heavily)
            const releaseDate =
                item.media_type === 'movie'
                    ? item.release_date || '1900-01-01'
                    : item.first_air_date || '1900-01-01'
            const yearsSinceRelease =
                (Date.now() - new Date(releaseDate).getTime()) / (365 * 24 * 60 * 60 * 1000)

            if (yearsSinceRelease < 2) {
                score += 50 // Recent (within 2 years)
            } else if (yearsSinceRelease < 5) {
                score += 25 // Recent-ish (within 5 years)
            }

            return { ...item, priority_score: score }
        })

        // Sort by priority score (highest first)
        creditsWithScores.sort((a, b) => {
            return b.priority_score - a.priority_score
        })

        return NextResponse.json(
            {
                id: Number(personId),
                cast: data.cast || [],
                crew: data.crew || [],
                combined: creditsWithScores,
                total_results: creditsWithScores.length,
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
