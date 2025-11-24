import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '../../../../utils/debugLogger'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

// Cache this route for 1 hour
export const revalidate = 3600

export async function GET(request: NextRequest) {
    if (!API_KEY) {
        return NextResponse.json({ message: 'TMDB API key not configured' }, { status: 500 })
    }

    try {
        const searchParams = request.nextUrl.searchParams

        // Validate and sanitize page parameter (1-500 as per TMDB limits)
        const rawPage = searchParams.get('page') || '1'
        const parsedPage = parseInt(rawPage, 10)
        const pageNumber = Math.max(1, Math.min(500, isNaN(parsedPage) ? 1 : parsedPage))

        // Time window: day or week
        const timeWindow = searchParams.get('time_window') || 'week'
        const validTimeWindow = timeWindow === 'day' ? 'day' : 'week'

        // Fetch trending people from TMDB
        const url = `${BASE_URL}/trending/person/${validTimeWindow}?api_key=${API_KEY}&language=en-US&page=${pageNumber}`

        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`)
        }

        const data = await response.json()

        // Filter to only people with profile images
        // Also filter by known_for_department based on request
        const department = searchParams.get('department') // 'Acting' or 'Directing'

        const filteredPeople = data.results.filter((person: any) => {
            // Must have a profile image
            if (!person.profile_path) return false

            // If department specified, filter by it
            if (department) {
                return person.known_for_department === department
            }

            // Otherwise include all people with images
            return true
        })

        return NextResponse.json(
            {
                ...data,
                results: filteredPeople,
                total_results: filteredPeople.length,
            },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
                },
            }
        )
    } catch (error) {
        apiError('TMDB API error:', error)
        return NextResponse.json({ message: 'Failed to fetch trending people' }, { status: 500 })
    }
}
