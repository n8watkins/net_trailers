import { NextRequest, NextResponse } from 'next/server'
import { TMDBApiClient } from '@/utils/tmdbApi'
import { MOVIE_GENRES, TV_GENRES } from '@/constants/genres'

// In-memory cache for search results (5 minute TTL)
const searchCache = new Map<string, { results: any[]; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Simple rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10 // 10 requests per window
const RATE_WINDOW = 1000 // 1 second window

function checkRateLimit(ip: string): boolean {
    const now = Date.now()
    const record = rateLimitMap.get(ip)

    if (!record || now > record.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
        return true
    }

    if (record.count >= RATE_LIMIT) {
        return false
    }

    record.count++
    return true
}

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get('q')

    if (!query || query.length < 2) {
        return NextResponse.json({ results: [] })
    }

    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }

    const normalizedQuery = query.toLowerCase()
    const cacheKey = `search:${normalizedQuery}`

    // Check cache
    const cached = searchCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return NextResponse.json({ results: cached.results, cached: true })
    }

    try {
        const tmdb = TMDBApiClient.getInstance()

        // 1. Search Genres (local matching - instant)
        const genreResults = searchGenres(normalizedQuery)

        // 2. Search TMDB People (actors, directors)
        let peopleResults: any[] = []
        try {
            const peopleData = await tmdb.fetch('/search/person', { query })
            peopleResults = (peopleData as any).results.slice(0, 5).map((p: any) => ({
                id: p.id,
                type: 'person',
                name: p.name,
                subtitle: p.known_for_department, // "Acting" or "Directing"
                image: p.profile_path,
                metadata: {
                    popularity: p.popularity,
                    knownFor: p.known_for?.map((item: any) => item.title || item.name).slice(0, 3),
                },
            }))
        } catch (error) {
            console.error('People search error:', error)
        }

        // 3. Search TMDB Movies
        let movieResults: any[] = []
        try {
            const moviesData = await tmdb.fetch('/search/movie', { query })
            movieResults = (moviesData as any).results.slice(0, 3).map((m: any) => ({
                id: m.id,
                type: 'movie',
                name: m.title,
                subtitle: `Movie${m.release_date ? ` • ${m.release_date.split('-')[0]}` : ''}`,
                image: m.poster_path,
                metadata: {
                    rating: m.vote_average,
                    popularity: m.popularity,
                },
            }))
        } catch (error) {
            console.error('Movies search error:', error)
        }

        // 4. Search TMDB TV Shows
        let tvResults: any[] = []
        try {
            const tvData = await tmdb.fetch('/search/tv', { query })
            tvResults = (tvData as any).results.slice(0, 3).map((t: any) => ({
                id: t.id,
                type: 'tv',
                name: t.name,
                subtitle: `TV Show${t.first_air_date ? ` • ${t.first_air_date.split('-')[0]}` : ''}`,
                image: t.poster_path,
                metadata: {
                    rating: t.vote_average,
                    popularity: t.popularity,
                },
            }))
        } catch (error) {
            console.error('TV search error:', error)
        }

        // 5. Search TMDB Companies (studios)
        let companyResults: any[] = []
        try {
            const companiesData = await tmdb.fetch('/search/company', { query })
            companyResults = (companiesData as any).results.slice(0, 3).map((c: any) => ({
                id: c.id,
                type: 'company',
                name: c.name,
                subtitle: 'Studio / Production Company',
                image: c.logo_path,
                metadata: {
                    originCountry: c.origin_country,
                },
            }))
        } catch (error) {
            console.error('Company search error:', error)
        }

        // Combine and sort by relevance
        const allResults = [
            ...genreResults,
            ...peopleResults,
            ...movieResults,
            ...tvResults,
            ...companyResults,
        ].sort((a, b) => {
            // Exact match bonus
            const aExact = a.name.toLowerCase() === normalizedQuery ? 1000 : 0
            const bExact = b.name.toLowerCase() === normalizedQuery ? 1000 : 0

            // Type priority: Genres first if exact match, then people, then content
            const typePriority: Record<string, number> = {
                genre: 500,
                person: 400,
                movie: 300,
                tv: 300,
                company: 200,
            }

            // Calculate scores
            const aScore = aExact + typePriority[a.type] + (a.metadata?.popularity || 0)
            const bScore = bExact + typePriority[b.type] + (b.metadata?.popularity || 0)

            return bScore - aScore
        })

        const results = allResults.slice(0, 10)

        // Cache the results
        searchCache.set(cacheKey, { results, timestamp: Date.now() })

        // Clean old cache entries (prevent memory leak)
        if (searchCache.size > 1000) {
            const now = Date.now()
            for (const [key, value] of searchCache.entries()) {
                if (now - value.timestamp > CACHE_TTL) {
                    searchCache.delete(key)
                }
            }
        }

        return NextResponse.json({ results })
    } catch (error) {
        console.error('Smart search error:', error)
        return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }
}

/**
 * Search genres locally (instant, no API call)
 */
function searchGenres(query: string) {
    const allGenres = [...MOVIE_GENRES, ...TV_GENRES]
    const uniqueGenres = Array.from(new Map(allGenres.map((g) => [g.id, g])).values())

    return uniqueGenres
        .filter((g) => g.name.toLowerCase().includes(query))
        .map((g) => ({
            id: g.id,
            type: 'genre' as const,
            name: g.name,
            subtitle: 'Genre',
            image: undefined,
            metadata: {},
        }))
        .slice(0, 5)
}
