import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

// Cache for 1 hour
export const revalidate = 3600

// TMDB genre IDs for movies
const GENRE_IDS: Record<string, number> = {
    action: 28,
    comedy: 35,
    drama: 18,
    horror: 27,
    romance: 10749,
    scifi: 878,
    thriller: 53,
    fantasy: 14,
    animation: 16,
    documentary: 99,
    mystery: 9648,
    crime: 80,
}

interface PreviewContent {
    id: number
    poster_path: string | null
    title?: string
    name?: string
}

export async function GET(request: NextRequest) {
    if (!API_KEY) {
        return NextResponse.json({ error: 'TMDB API key not configured' }, { status: 500 })
    }

    const searchParams = request.nextUrl.searchParams
    const genresParam = searchParams.get('genres')
    const limit = parseInt(searchParams.get('limit') || '3')

    // If specific genres requested, only fetch those
    const genresToFetch = genresParam ? genresParam.split(',') : Object.keys(GENRE_IDS)

    try {
        const results: Record<string, PreviewContent[]> = {}

        // Fetch content for each genre in parallel
        await Promise.all(
            genresToFetch.map(async (genreId) => {
                const tmdbGenreId = GENRE_IDS[genreId]
                if (!tmdbGenreId) return

                try {
                    const url = new URL(`${BASE_URL}/discover/movie`)
                    url.searchParams.append('api_key', API_KEY)
                    url.searchParams.append('language', 'en-US')
                    url.searchParams.append('with_genres', tmdbGenreId.toString())
                    url.searchParams.append('sort_by', 'popularity.desc')
                    url.searchParams.append('vote_count.gte', '1000') // Well-known movies
                    url.searchParams.append('page', '1')

                    const response = await fetch(url.toString())
                    if (!response.ok) return

                    const data = await response.json()

                    // Get top N movies with posters
                    const previews: PreviewContent[] = data.results
                        .filter((m: { poster_path: string | null }) => m.poster_path)
                        .slice(0, limit)
                        .map((m: { id: number; poster_path: string | null; title?: string }) => ({
                            id: m.id,
                            poster_path: m.poster_path,
                            title: m.title,
                        }))

                    results[genreId] = previews
                } catch {
                    // Silently fail individual genre fetches
                    results[genreId] = []
                }
            })
        )

        return NextResponse.json(
            { success: true, previews: results },
            {
                status: 200,
                headers: {
                    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
                },
            }
        )
    } catch (error) {
        console.error('Error fetching genre previews:', error)
        return NextResponse.json({ error: 'Failed to fetch genre previews' }, { status: 500 })
    }
}
