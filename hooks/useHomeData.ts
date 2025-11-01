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
                // Default mixed content (movies)
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
                        fetch(`/api/genres/movie/28?${childSafetyParam}`), // Action Movies
                        fetch(`/api/genres/movie/35?${childSafetyParam}`), // Comedy Movies
                        fetch(`/api/genres/movie/27?${childSafetyParam}`), // Horror Movies
                        fetch(`/api/genres/movie/10749?${childSafetyParam}`), // Romance Movies
                        fetch(`/api/genres/movie/99?${childSafetyParam}`), // Documentary Movies
                    ]
                }
            }

            const responses = await Promise.all(fetchPromises)

            // Check if all responses are ok
            const failedResponse = responses.find((r) => !r.ok)
            if (failedResponse) {
                throw new Error(`Failed to fetch content: ${failedResponse.status}`)
            }

            const [
                trendingData,
                topRated1Data,
                topRated2Data,
                actionData,
                comedyData,
                horrorData,
                romanceData,
                documentariesData,
            ] = await Promise.all(responses.map((r) => r.json()))

            // Helper to randomize array (Fisher-Yates shuffle)
            const randomizeArray = (arr: Content[]) => {
                const shuffled = [...arr]
                for (let i = shuffled.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1))
                    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
                }
                return shuffled
            }

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
