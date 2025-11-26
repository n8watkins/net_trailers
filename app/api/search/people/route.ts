import { NextRequest, NextResponse } from 'next/server'
import { searchCache } from '../../../../utils/apiCache'
import { apiError } from '../../../../utils/debugLogger'

// Cache this route for 10 minutes
export const revalidate = 600

interface TMDBPersonSearchResult {
    id: number
    name: string
    profile_path: string | null
    known_for_department: string
    popularity: number
    gender: number
    adult: boolean
    known_for: Array<{
        id: number
        media_type: 'movie' | 'tv'
        title?: string
        name?: string
        poster_path: string | null
        backdrop_path: string | null
        vote_average: number
        overview: string
        release_date?: string
        first_air_date?: string
    }>
}

interface TMDBPersonSearchResponse {
    results: TMDBPersonSearchResult[]
    total_results: number
    total_pages: number
    page: number
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const query = searchParams.get('query')
        const page = searchParams.get('page') || '1'
        const department = searchParams.get('department') // 'acting', 'directing', 'writing', or 'all'

        if (!query || query.trim().length === 0) {
            return NextResponse.json({ message: 'Query parameter is required' }, { status: 400 })
        }

        const apiKey = process.env.TMDB_API_KEY
        if (!apiKey) {
            return NextResponse.json({ message: 'API key not configured' }, { status: 500 })
        }

        // Create cache key including all relevant parameters
        const cacheKey = `search-people-${query.trim()}-page-${page}-dept-${department || 'all'}`

        // Check cache first
        const cachedData = searchCache.get(cacheKey)
        if (cachedData) {
            return NextResponse.json(cachedData, { status: 200 })
        }

        // Build the TMDB search URL
        const searchUrl = new URL('https://api.themoviedb.org/3/search/person')
        searchUrl.searchParams.append('api_key', apiKey)
        searchUrl.searchParams.append('query', query.trim())
        searchUrl.searchParams.append('page', page)
        searchUrl.searchParams.append('include_adult', 'false')

        const response = await fetch(searchUrl.toString())

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status} ${response.statusText}`)
        }

        const data: TMDBPersonSearchResponse = await response.json()

        // Filter results
        let filteredResults = data.results.filter((person) => {
            // Filter out adult content
            if (person.adult) return false

            // Only include people with profile images for better UX
            if (!person.profile_path) return false

            // Filter by department if specified
            if (department && department !== 'all') {
                const personDept = person.known_for_department?.toLowerCase()
                if (department === 'acting' && personDept !== 'acting') return false
                if (department === 'directing' && personDept !== 'directing') return false
                if (department === 'writing' && personDept !== 'writing') return false
            }

            return true
        })

        // Sort by popularity (most popular first)
        filteredResults = filteredResults.sort((a, b) => b.popularity - a.popularity)

        // Transform known_for to include media_type properly
        const transformedResults = filteredResults.map((person) => ({
            ...person,
            known_for: person.known_for?.map((item) => ({
                ...item,
                media_type: item.media_type,
            })) || [],
        }))

        const responseData = {
            results: transformedResults,
            total_results: data.total_results,
            total_pages: data.total_pages,
            page: parseInt(page),
            filtered_count: data.results.length - filteredResults.length,
        }

        // Cache the result
        searchCache.set(cacheKey, responseData)

        return NextResponse.json(responseData, {
            status: 200,
            headers: {
                'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800',
            },
        })
    } catch (error) {
        apiError('People Search API error:', error)
        return NextResponse.json(
            {
                message: 'Internal server error',
                error:
                    process.env.NODE_ENV === 'development' ? (error as Error).message : undefined,
            },
            { status: 500 }
        )
    }
}
