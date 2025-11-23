import { NextRequest, NextResponse } from 'next/server'

/**
 * Server-side API route to fetch alternate images from TMDB
 * This keeps the API key secure on the server side
 *
 * GET /api/images/[mediaType]/[id]
 * - mediaType: 'movie' or 'tv'
 * - id: TMDB content ID
 *
 * Returns the best available alternate image URL
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ mediaType: string; id: string }> }
) {
    try {
        const { mediaType, id } = await params

        // Validate media type
        if (mediaType !== 'movie' && mediaType !== 'tv') {
            return NextResponse.json(
                { error: 'Invalid media type. Must be "movie" or "tv"' },
                { status: 400 }
            )
        }

        // Validate ID
        const contentId = parseInt(id, 10)
        if (isNaN(contentId) || contentId <= 0) {
            return NextResponse.json({ error: 'Invalid content ID' }, { status: 400 })
        }

        const apiKey = process.env.TMDB_API_KEY
        if (!apiKey) {
            console.error('TMDB_API_KEY not configured')
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // Fetch images from TMDB
        const response = await fetch(
            `https://api.themoviedb.org/3/${mediaType}/${contentId}/images?api_key=${apiKey}`,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        )

        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json({ error: 'Content not found' }, { status: 404 })
            }
            throw new Error(`TMDB API error: ${response.status}`)
        }

        const data = await response.json()

        const posters: Array<{ file_path: string }> = data.posters || []
        const backdrops: Array<{ file_path: string }> = data.backdrops || []

        // TMDB returns images sorted by popularity by default
        // Just pick the first (most popular) poster, or backdrop if no posters
        const bestImage = posters[0] || backdrops[0]

        // Cache headers - cache for 24 hours (images don't change often)
        const cacheHeaders = {
            'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        }

        if (bestImage?.file_path) {
            return NextResponse.json(
                {
                    imageUrl: `https://image.tmdb.org/t/p/w500${bestImage.file_path}`,
                    source: posters[0] ? 'poster' : 'backdrop',
                },
                { headers: cacheHeaders }
            )
        }

        // No alternate images available - also cache this to avoid repeated lookups
        return NextResponse.json({ imageUrl: null, source: null }, { headers: cacheHeaders })
    } catch (error) {
        console.error('Error fetching alternate images:', error)
        return NextResponse.json({ error: 'Failed to fetch alternate images' }, { status: 500 })
    }
}
