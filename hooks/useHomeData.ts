import { useState, useEffect, useCallback } from 'react'
import { Content } from '../typings'
import { useChildSafety } from './useChildSafety'

interface HomeData {
    trending: Content[]
    topRated: Content[]
    genre1: Content[] // Action (movies) | Action & Adventure (TV)
    genre2: Content[] // Comedy (both)
    genre3: Content[] // Horror (movies) | Sci-Fi & Fantasy (TV)
    genre4: Content[] // Romance (movies) | Animation (TV)
    documentaries: Content[]
}

interface UseHomeDataReturn {
    data: HomeData
    loading: boolean
    error: string | null
}

/**
 * Custom hook to fetch home page content with child safety filtering
 * @param filter - Content filter: 'movies' | 'tv' | undefined (all)
 */
export function useHomeData(filter?: string): UseHomeDataReturn {
    const [data, setData] = useState<HomeData>({
        trending: [],
        topRated: [],
        genre1: [],
        genre2: [],
        genre3: [],
        genre4: [],
        documentaries: [],
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const { isEnabled: childSafetyEnabled } = useChildSafety()

    const fetchHomeData = useCallback(async () => {
        setLoading(true)
        setError(null)

        try {
            const childSafetyParam = childSafetyEnabled ? 'childSafetyMode=true' : ''

            let fetchPromises: Promise<Response>[]

            if (filter === 'tv') {
                // Fetch TV-specific content
                fetchPromises = [
                    fetch(`/api/tv/trending?${childSafetyParam}`),
                    fetch(`/api/tv/top-rated?page=1&${childSafetyParam}`),
                    fetch(`/api/tv/top-rated?page=2&${childSafetyParam}`),
                    fetch(`/api/genres/tv/10759?${childSafetyParam}`), // Action & Adventure
                    fetch(`/api/genres/tv/35?${childSafetyParam}`), // Comedy
                    fetch(`/api/genres/tv/10765?${childSafetyParam}`), // Sci-Fi & Fantasy
                    fetch(`/api/genres/tv/16?${childSafetyParam}`), // Animation
                    fetch(`/api/genres/tv/99?${childSafetyParam}`), // Documentary
                ]
            } else if (filter === 'movies') {
                // Fetch movie-specific content
                // In child safety mode, use family-friendly genres only
                if (childSafetyEnabled) {
                    fetchPromises = [
                        fetch(`/api/movies/trending?${childSafetyParam}`),
                        fetch(`/api/movies/top-rated?page=1&${childSafetyParam}`),
                        fetch(`/api/movies/top-rated?page=2&${childSafetyParam}`),
                        fetch(`/api/genres/movie/16?${childSafetyParam}`), // Animation
                        fetch(`/api/genres/movie/10751?${childSafetyParam}`), // Family
                        fetch(`/api/genres/movie/12?${childSafetyParam}`), // Adventure
                        fetch(`/api/genres/movie/14?${childSafetyParam}`), // Fantasy
                        fetch(`/api/genres/movie/99?${childSafetyParam}`), // Documentary
                    ]
                } else {
                    fetchPromises = [
                        fetch(`/api/movies/trending?${childSafetyParam}`),
                        fetch(`/api/movies/top-rated?page=1&${childSafetyParam}`),
                        fetch(`/api/movies/top-rated?page=2&${childSafetyParam}`),
                        fetch(`/api/genres/movie/28?${childSafetyParam}`), // Action
                        fetch(`/api/genres/movie/35?${childSafetyParam}`), // Comedy
                        fetch(`/api/genres/movie/27?${childSafetyParam}`), // Horror
                        fetch(`/api/genres/movie/10749?${childSafetyParam}`), // Romance
                        fetch(`/api/genres/movie/99?${childSafetyParam}`), // Documentary
                    ]
                }
            } else {
                // Default mixed content (both movies and TV shows)
                // In child safety mode, use family-friendly genres only
                if (childSafetyEnabled) {
                    fetchPromises = [
                        // Fetch both movie and TV trending
                        fetch(`/api/movies/trending?${childSafetyParam}`),
                        fetch(`/api/tv/trending?${childSafetyParam}`),
                        // Fetch both movie and TV top rated
                        fetch(`/api/movies/top-rated?page=1&${childSafetyParam}`),
                        fetch(`/api/tv/top-rated?page=1&${childSafetyParam}`),
                        // Mixed genres - Animation (movies + TV)
                        fetch(`/api/genres/movie/16?${childSafetyParam}`),
                        fetch(`/api/genres/tv/16?${childSafetyParam}`),
                        // Mixed genres - Family/Comedy (movies + TV)
                        fetch(`/api/genres/movie/10751?${childSafetyParam}`),
                        fetch(`/api/genres/tv/35?${childSafetyParam}`),
                        // Mixed genres - Adventure (movies + TV Action & Adventure)
                        fetch(`/api/genres/movie/12?${childSafetyParam}`),
                        fetch(`/api/genres/tv/10759?${childSafetyParam}`),
                        // Mixed genres - Fantasy (movies + TV Sci-Fi & Fantasy)
                        fetch(`/api/genres/movie/14?${childSafetyParam}`),
                        fetch(`/api/genres/tv/10765?${childSafetyParam}`),
                        // Documentary (both)
                        fetch(`/api/genres/movie/99?${childSafetyParam}`),
                        fetch(`/api/genres/tv/99?${childSafetyParam}`),
                    ]
                } else {
                    fetchPromises = [
                        // Fetch both movie and TV trending
                        fetch(`/api/movies/trending?${childSafetyParam}`),
                        fetch(`/api/tv/trending?${childSafetyParam}`),
                        // Fetch both movie and TV top rated
                        fetch(`/api/movies/top-rated?page=1&${childSafetyParam}`),
                        fetch(`/api/tv/top-rated?page=1&${childSafetyParam}`),
                        // Mixed genres - Action (movies + TV Action & Adventure)
                        fetch(`/api/genres/movie/28?${childSafetyParam}`),
                        fetch(`/api/genres/tv/10759?${childSafetyParam}`),
                        // Mixed genres - Comedy (both)
                        fetch(`/api/genres/movie/35?${childSafetyParam}`),
                        fetch(`/api/genres/tv/35?${childSafetyParam}`),
                        // Mixed genres - Horror (movies) + Sci-Fi & Fantasy (TV)
                        fetch(`/api/genres/movie/27?${childSafetyParam}`),
                        fetch(`/api/genres/tv/10765?${childSafetyParam}`),
                        // Mixed genres - Romance (movies) + Animation (TV)
                        fetch(`/api/genres/movie/10749?${childSafetyParam}`),
                        fetch(`/api/genres/tv/16?${childSafetyParam}`),
                        // Documentary (both)
                        fetch(`/api/genres/movie/99?${childSafetyParam}`),
                        fetch(`/api/genres/tv/99?${childSafetyParam}`),
                    ]
                }
            }

            const responses = await Promise.all(fetchPromises)

            // Check if all responses are ok
            const failedResponse = responses.find((r) => !r.ok)
            if (failedResponse) {
                throw new Error(`Failed to fetch content: ${failedResponse.status}`)
            }

            // Helper to randomize array (Fisher-Yates shuffle)
            const randomizeArray = (arr: Content[]) => {
                const shuffled = [...arr]
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1))
                    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
                }
                return shuffled
            }

            const jsonData = await Promise.all(responses.map((r) => r.json()))

            // Process data based on filter type
            if (filter === 'tv' || filter === 'movies') {
                // Single content type (existing behavior)
                const [
                    trendingData,
                    topRated1Data,
                    topRated2Data,
                    actionData,
                    comedyData,
                    horrorData,
                    romanceData,
                    documentariesData,
                ] = jsonData

                setData({
                    trending: randomizeArray(trendingData.results || []),
                    topRated: randomizeArray([
                        ...(topRated1Data.results || []),
                        ...(topRated2Data.results || []),
                    ]),
                    genre1: randomizeArray(actionData.results || []),
                    genre2: randomizeArray(comedyData.results || []),
                    genre3: randomizeArray(horrorData.results || []),
                    genre4: randomizeArray(romanceData.results || []),
                    documentaries: randomizeArray(documentariesData.results || []),
                })
            } else {
                // Mixed content (movies + TV) - pairs of results
                const [
                    movieTrendingData,
                    tvTrendingData,
                    movieTopRatedData,
                    tvTopRatedData,
                    genre1MovieData,
                    genre1TvData,
                    genre2MovieData,
                    genre2TvData,
                    genre3MovieData,
                    genre3TvData,
                    genre4MovieData,
                    genre4TvData,
                    movieDocData,
                    tvDocData,
                ] = jsonData

                setData({
                    trending: randomizeArray([
                        ...(movieTrendingData.results || []),
                        ...(tvTrendingData.results || []),
                    ]),
                    topRated: randomizeArray([
                        ...(movieTopRatedData.results || []),
                        ...(tvTopRatedData.results || []),
                    ]),
                    genre1: randomizeArray([
                        ...(genre1MovieData.results || []),
                        ...(genre1TvData.results || []),
                    ]),
                    genre2: randomizeArray([
                        ...(genre2MovieData.results || []),
                        ...(genre2TvData.results || []),
                    ]),
                    genre3: randomizeArray([
                        ...(genre3MovieData.results || []),
                        ...(genre3TvData.results || []),
                    ]),
                    genre4: randomizeArray([
                        ...(genre4MovieData.results || []),
                        ...(genre4TvData.results || []),
                    ]),
                    documentaries: randomizeArray([
                        ...(movieDocData.results || []),
                        ...(tvDocData.results || []),
                    ]),
                })
            }
        } catch (err) {
            console.error('Error fetching home data:', err)
            setError(err instanceof Error ? err.message : 'Failed to load content')
        } finally {
            setLoading(false)
        }
    }, [filter, childSafetyEnabled])

    useEffect(() => {
        fetchHomeData()
    }, [fetchHomeData])

    return { data, loading, error }
}
