import { NextRequest, NextResponse } from 'next/server'
import { apiError } from '../../../../utils/debugLogger'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

// Cache this route for 24 hours (person details don't change often)
export const revalidate = 86400

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (!API_KEY) {
        return NextResponse.json({ message: 'TMDB API key not configured' }, { status: 500 })
    }

    const { id: personId } = await params

    if (!personId) {
        return NextResponse.json({ message: 'Person ID is required' }, { status: 400 })
    }

    try {
        // Fetch person details from TMDB
        const url = `${BASE_URL}/person/${personId}?api_key=${API_KEY}&language=en-US`

        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`)
        }

        const data = await response.json()

        return NextResponse.json(data, {
            status: 200,
            headers: {
                'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
            },
        })
    } catch (error) {
        apiError('TMDB API error:', error)
        return NextResponse.json({ message: 'Failed to fetch person details' }, { status: 500 })
    }
}
