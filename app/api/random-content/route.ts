import { NextRequest, NextResponse } from 'next/server'
import { filterContentByAdultFlag } from '../../../utils/contentFilter'
import { filterMatureTVShows } from '../../../utils/tvContentRatings'
import { Content } from '../../../typings'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'
const RANDOM_PAGE_MAX = 10
const MAX_ATTEMPTS = 4

type MediaType = 'movie' | 'tv'

interface RawContent {
    id: number
    media_type?: MediaType | string
    backdrop_path?: string | null
    poster_path?: string | null
    adult?: boolean
    [key: string]: unknown
}

function getRandomPage() {
    return Math.floor(Math.random() * RANDOM_PAGE_MAX) + 1
}

function normalizeMediaType(param: string | null): MediaType | null {
    if (param === 'movie' || param === 'tv') {
        return param
    }
    return null
}

async function fetchCandidates(mediaType: MediaType, page: number, childSafetyMode: boolean) {
    if (!API_KEY) {
        throw new Error('TMDB API key not configured')
    }
    const apiKey = API_KEY

    let url: string

    if (mediaType === 'movie') {
        if (childSafetyMode) {
            url = `${BASE_URL}/discover/movie?api_key=${apiKey}&language=en-US&page=${page}&sort_by=popularity.desc&certification_country=US&certification.lte=PG-13&include_adult=false&vote_count.gte=100`
        } else {
            url = `${BASE_URL}/trending/movie/week?api_key=${apiKey}&language=en-US&page=${page}`
        }
    } else {
        if (childSafetyMode) {
            url = `${BASE_URL}/discover/tv?api_key=${apiKey}&language=en-US&page=${page}&sort_by=popularity.desc&with_genres=16,10762,10751,35,10765,10759&include_adult=false`
        } else {
            url = `${BASE_URL}/trending/tv/week?api_key=${apiKey}&language=en-US&page=${page}`
        }
    }

    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
        throw new Error(`TMDB API error: ${response.status}`)
    }

    const data = await response.json()
    const rawResults: RawContent[] = Array.isArray(data.results) ? data.results : []
    let results: RawContent[] = rawResults.map((item) => ({
        ...item,
        media_type: mediaType,
    }))

    if (childSafetyMode) {
        if (mediaType === 'movie') {
            const safeMovies = filterContentByAdultFlag(
                results as unknown as Content[],
                true
            ) as unknown as RawContent[]
            results = safeMovies
        } else {
            const safeShows = (await filterMatureTVShows(results, apiKey)) as RawContent[]
            results = safeShows
        }
    }

    // Prefer content that has either a backdrop or poster so modal looks good
    return results.filter((item) => item.backdrop_path || item.poster_path)
}

export async function GET(request: NextRequest) {
    if (!API_KEY) {
        return NextResponse.json({ message: 'TMDB API key not configured' }, { status: 500 })
    }

    try {
        const searchParams = request.nextUrl.searchParams
        const childSafetyMode = searchParams.get('childSafetyMode') === 'true'
        const forcedMediaType = normalizeMediaType(searchParams.get('media_type'))

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            const mediaType =
                forcedMediaType ||
                (Math.random() > 0.5 ? ('movie' as MediaType) : ('tv' as MediaType))
            const page = getRandomPage()
            const candidates = await fetchCandidates(mediaType, page, childSafetyMode)

            if (candidates.length === 0) {
                continue
            }

            const randomItem = candidates[Math.floor(Math.random() * candidates.length)]

            return NextResponse.json(
                { content: randomItem, media_type: mediaType },
                {
                    status: 200,
                    headers: {
                        'Cache-Control': 'no-store',
                    },
                }
            )
        }

        return NextResponse.json(
            { message: 'No content available at the moment. Please try again.' },
            { status: 404 }
        )
    } catch (error) {
        console.error('Failed to fetch random content:', error)
        return NextResponse.json({ message: 'Failed to fetch random content' }, { status: 500 })
    }
}
