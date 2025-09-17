# 🚀 Detailed Implementation Plans for Potential Improvements

## 🏗️ ARCHITECTURE & PERFORMANCE

### Improvement #1: Implement Proper Caching Strategy
**Priority**: HIGH (P1)
**Time Estimate**: 6-8 hours
**Dependencies**: API restructuring
**ROI**: High - Significant performance improvement

#### Problem Analysis:
- No caching mechanism for movie data
- Repeated API calls on each page visit
- Poor performance and user experience
- Unnecessary bandwidth usage

#### Detailed Implementation Plan:

**Step 1: Install and Configure React Query (2 hours)**
```bash
pnpm add @tanstack/react-query @tanstack/react-query-devtools
```

```typescript
// providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            refetchOnWindowFocus: false,
        },
    },
})

export default function QueryProvider({ children }: { children: React.ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
            {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
        </QueryClientProvider>
    )
}
```

**Step 2: Create Query Hooks (3 hours)**
```typescript
// hooks/useMovieQueries.ts
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { Content, Movie, TVShow } from '../typings'

const API_BASE = '/api'

// Query keys factory
export const movieQueryKeys = {
    all: ['movies'] as const,
    lists: () => [...movieQueryKeys.all, 'list'] as const,
    list: (filters: string) => [...movieQueryKeys.lists(), { filters }] as const,
    details: () => [...movieQueryKeys.all, 'detail'] as const,
    detail: (id: number) => [...movieQueryKeys.details(), id] as const,
}

// Custom hooks
export function useTrendingContent() {
    return useQuery({
        queryKey: movieQueryKeys.list('trending'),
        queryFn: async (): Promise<Content[]> => {
            const response = await fetch(`${API_BASE}/movies/trending`)
            if (!response.ok) throw new Error('Failed to fetch trending content')
            const data = await response.json()
            return data.results
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 30 * 60 * 1000, // 30 minutes
    })
}

export function useMoviesByGenre(genreId: number, enabled: boolean = true) {
    return useQuery({
        queryKey: movieQueryKeys.list(`genre-${genreId}`),
        queryFn: async (): Promise<Movie[]> => {
            const response = await fetch(`${API_BASE}/movies/genre/${genreId}`)
            if (!response.ok) throw new Error(`Failed to fetch movies for genre ${genreId}`)
            const data = await response.json()
            return data.results
        },
        enabled,
        staleTime: 15 * 60 * 1000, // 15 minutes - genres change less frequently
        cacheTime: 60 * 60 * 1000, // 1 hour
    })
}

export function useInfiniteMovies(genreId?: number) {
    return useInfiniteQuery({
        queryKey: movieQueryKeys.list(`infinite-${genreId || 'all'}`),
        queryFn: async ({ pageParam = 1 }): Promise<{ results: Movie[]; page: number; totalPages: number }> => {
            const url = genreId
                ? `${API_BASE}/movies/genre/${genreId}?page=${pageParam}`
                : `${API_BASE}/movies/popular?page=${pageParam}`

            const response = await fetch(url)
            if (!response.ok) throw new Error('Failed to fetch movies')
            return response.json()
        },
        getNextPageParam: (lastPage) => {
            return lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined
        },
        staleTime: 10 * 60 * 1000,
        cacheTime: 30 * 60 * 1000,
    })
}

export function useMovieDetails(movieId: number, enabled: boolean = true) {
    return useQuery({
        queryKey: movieQueryKeys.detail(movieId),
        queryFn: async (): Promise<Movie & { videos: any[], credits: any }> => {
            const response = await fetch(`${API_BASE}/movies/${movieId}`)
            if (!response.ok) throw new Error(`Failed to fetch movie ${movieId}`)
            return response.json()
        },
        enabled,
        staleTime: 60 * 60 * 1000, // 1 hour - movie details rarely change
        cacheTime: 2 * 60 * 60 * 1000, // 2 hours
    })
}

// Prefetch utility
export function usePrefetchMovie() {
    const queryClient = useQueryClient()

    return useCallback((movieId: number) => {
        queryClient.prefetchQuery({
            queryKey: movieQueryKeys.detail(movieId),
            queryFn: async () => {
                const response = await fetch(`${API_BASE}/movies/${movieId}`)
                return response.json()
            },
            staleTime: 60 * 60 * 1000,
        })
    }, [queryClient])
}
```

**Step 3: Update Components to Use Queries (2 hours)**
```typescript
// pages/index.tsx - Convert to use React Query
import { useTrendingContent, useMoviesByGenre } from '../hooks/useMovieQueries'
import { movieGenres } from '../constants/genres'

export default function Home() {
    const { data: trending, isLoading: trendingLoading, error: trendingError } = useTrendingContent()
    const { data: actionMovies, isLoading: actionLoading } = useMoviesByGenre(movieGenres.ACTION)
    const { data: comedyMovies } = useMoviesByGenre(movieGenres.COMEDY)
    const { data: horrorMovies } = useMoviesByGenre(movieGenres.HORROR)

    const { loading: authLoading, user } = useAuth()

    // Show loading state
    if (authLoading || trendingLoading) {
        return <LoadingScreen />
    }

    // Show error state
    if (trendingError) {
        return <ErrorScreen error={trendingError} retry={() => window.location.reload()} />
    }

    return (
        <div className="relative h-screen overflow-x-clip">
            <Head>
                <title>Netflix Clone</title>
                <link rel="icon" href="/netflix.png" />
            </Head>
            <Header />
            <main className="absolute top-0 h-screen w-screen">
                <Banner trending={trending} />
                <section className="absolute top-[50em] pb-52">
                    <Row title="Trending" content={trending} />
                    <Row title="Action Movies" content={actionMovies} loading={actionLoading} />
                    <Row title="Comedy Movies" content={comedyMovies} />
                    <Row title="Horror Movies" content={horrorMovies} />
                </section>
            </main>
        </div>
    )
}

// Remove getServerSideProps - data fetching now handled by React Query
```

**Step 4: Implement Background Refresh (1 hour)**
```typescript
// hooks/useBackgroundSync.ts
import { useQueryClient } from '@tanstack/react-query'
import { movieQueryKeys } from './useMovieQueries'

export function useBackgroundSync() {
    const queryClient = useQueryClient()

    useEffect(() => {
        // Refresh critical data every 10 minutes
        const interval = setInterval(() => {
            queryClient.invalidateQueries({ queryKey: movieQueryKeys.list('trending') })
        }, 10 * 60 * 1000)

        // Prefetch likely next content when user is idle
        const prefetchTimer = setTimeout(() => {
            queryClient.prefetchQuery({
                queryKey: movieQueryKeys.list('popular'),
                queryFn: () => fetch('/api/movies/popular').then(res => res.json())
            })
        }, 5000)

        return () => {
            clearInterval(interval)
            clearTimeout(prefetchTimer)
        }
    }, [queryClient])
}
```

**Success Criteria:**
- [ ] Data loads instantly on subsequent visits
- [ ] Background updates without user disruption
- [ ] Offline browsing capability
- [ ] 50%+ reduction in API calls
- [ ] React Query DevTools working in development

---

### Improvement #2: Add Incremental Static Regeneration (ISR)
**Priority**: HIGH (P1)
**Time Estimate**: 4-6 hours
**Dependencies**: API routes setup
**ROI**: High - Better SEO and performance

#### Implementation Plan:

**Step 1: Convert to Static Generation (2 hours)**
```typescript
// pages/index.tsx - Convert to getStaticProps with ISR
export async function getStaticProps() {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        const [trending, topRatedMovies, actionMovies] = await Promise.all([
            fetch(`${baseUrl}/api/movies/trending`).then(res => res.json()),
            fetch(`${baseUrl}/api/movies/top-rated`).then(res => res.json()),
            fetch(`${baseUrl}/api/movies/genre/action`).then(res => res.json()),
        ])

        return {
            props: {
                trending: trending.results?.slice(0, 20) || [],
                topRatedMovies: topRatedMovies.results?.slice(0, 20) || [],
                actionMovies: actionMovies.results?.slice(0, 20) || [],
                buildTimestamp: Date.now(),
            },
            revalidate: 3600, // Revalidate every hour
        }
    } catch (error) {
        console.error('Failed to fetch data for static generation:', error)

        return {
            props: {
                trending: [],
                topRatedMovies: [],
                actionMovies: [],
                hasError: true,
            },
            revalidate: 300, // Retry in 5 minutes if there was an error
        }
    }
}
```

**Step 2: Create Dynamic Movie Pages (3 hours)**
```typescript
// pages/movie/[id].tsx
import { GetStaticPaths, GetStaticProps } from 'next'
import { Movie } from '../../typings'

interface Props {
    movie: Movie & { videos: any[], credits: any, similar: Movie[] }
}

export default function MoviePage({ movie }: Props) {
    return (
        <div className="bg-black min-h-screen">
            <Header />
            <div className="relative">
                {/* Hero Section */}
                <div className="relative h-screen">
                    <Image
                        src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
                        layout="fill"
                        className="object-cover"
                        alt={movie.title}
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                    <div className="absolute bottom-32 left-8 max-w-2xl">
                        <h1 className="text-5xl font-bold mb-4">{movie.title}</h1>
                        <p className="text-lg mb-6">{movie.overview}</p>
                        <div className="flex items-center space-x-4 mb-6">
                            <span className="text-2xl font-semibold">⭐ {movie.vote_average.toFixed(1)}</span>
                            <span className="text-gray-300">{movie.release_date?.slice(0, 4)}</span>
                            <span className="text-gray-300">{movie.runtime} min</span>
                        </div>
                        <div className="flex space-x-4">
                            <button className="bg-white text-black px-8 py-3 rounded font-semibold hover:bg-gray-200">
                                ▶ Play
                            </button>
                            <button className="bg-gray-700 text-white px-8 py-3 rounded font-semibold hover:bg-gray-600">
                                + Add to List
                            </button>
                        </div>
                    </div>
                </div>

                {/* Details Section */}
                <div className="px-8 py-12">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        <div className="lg:col-span-2">
                            <h2 className="text-2xl font-bold mb-4">About</h2>
                            <p className="text-gray-300 leading-relaxed">{movie.overview}</p>

                            {movie.credits?.cast && (
                                <div className="mt-8">
                                    <h3 className="text-xl font-semibold mb-4">Cast</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {movie.credits.cast.slice(0, 6).map((actor: any) => (
                                            <div key={actor.id} className="text-center">
                                                <Image
                                                    src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                                                    width={100}
                                                    height={150}
                                                    className="rounded mx-auto mb-2"
                                                    alt={actor.name}
                                                />
                                                <p className="font-semibold">{actor.name}</p>
                                                <p className="text-sm text-gray-400">{actor.character}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div>
                            <h3 className="text-xl font-semibold mb-4">Details</h3>
                            <div className="space-y-2 text-sm">
                                <div><span className="text-gray-400">Release Date:</span> {movie.release_date}</div>
                                <div><span className="text-gray-400">Runtime:</span> {movie.runtime} minutes</div>
                                <div><span className="text-gray-400">Rating:</span> ⭐ {movie.vote_average}/10</div>
                                <div><span className="text-gray-400">Language:</span> {movie.original_language.toUpperCase()}</div>
                            </div>
                        </div>
                    </div>

                    {/* Similar Movies */}
                    {movie.similar && movie.similar.length > 0 && (
                        <div className="mt-12">
                            <h2 className="text-2xl font-bold mb-6">Similar Movies</h2>
                            <Row title="" content={movie.similar} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export const getStaticPaths: GetStaticPaths = async () => {
    // Pre-generate pages for popular movies
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/movies/popular`)
    const data = await response.json()

    const paths = data.results?.slice(0, 50).map((movie: Movie) => ({
        params: { id: movie.id.toString() }
    })) || []

    return {
        paths,
        fallback: 'blocking', // Enable ISR for other movie pages
    }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
    try {
        const movieId = params?.id as string
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

        const [movieResponse, videosResponse, creditsResponse, similarResponse] = await Promise.all([
            fetch(`${baseUrl}/api/movies/${movieId}`),
            fetch(`${baseUrl}/api/movies/${movieId}/videos`),
            fetch(`${baseUrl}/api/movies/${movieId}/credits`),
            fetch(`${baseUrl}/api/movies/${movieId}/similar`),
        ])

        if (!movieResponse.ok) {
            return { notFound: true }
        }

        const [movie, videos, credits, similar] = await Promise.all([
            movieResponse.json(),
            videosResponse.json(),
            creditsResponse.json(),
            similarResponse.json(),
        ])

        return {
            props: {
                movie: {
                    ...movie,
                    videos: videos.results || [],
                    credits: credits || {},
                    similar: similar.results?.slice(0, 12) || [],
                }
            },
            revalidate: 24 * 60 * 60, // Revalidate once per day
        }
    } catch (error) {
        console.error(`Failed to fetch movie ${params?.id}:`, error)
        return { notFound: true }
    }
}
```

**Step 3: API Route Optimization (1 hour)**
```typescript
// pages/api/movies/[id].ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query
    const API_KEY = process.env.TMDB_API_KEY

    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&append_to_response=videos,credits,similar`
        )

        if (!response.ok) {
            return res.status(response.status).json({ message: 'Movie not found' })
        }

        const movie = await response.json()

        // Cache for 24 hours
        res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=172800')
        res.status(200).json(movie)
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch movie details' })
    }
}
```

**Success Criteria:**
- [ ] Pages load instantly from static generation
- [ ] SEO-friendly URLs for all movies
- [ ] Automatic background revalidation
- [ ] Fallback rendering for new content

---

### Improvement #3: Implement Code Splitting
**Priority**: MEDIUM (P2)
**Time Estimate**: 3-4 hours
**Dependencies**: Bundle analysis
**ROI**: Medium - Improved initial load time

#### Implementation Plan:

**Step 1: Analyze Current Bundle (30 minutes)**
```bash
# Install bundle analyzer
pnpm add -D @next/bundle-analyzer

# Add to next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
    enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
    // existing config
})

# Run analysis
ANALYZE=true pnpm build
```

**Step 2: Dynamic Import Heavy Components (2 hours)**
```typescript
// components/LazyComponents.tsx
import dynamic from 'next/dynamic'
import LoadingSpinner from './LoadingSpinner'

// Modal - only load when needed
export const Modal = dynamic(() => import('./Modal'), {
    loading: () => <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
        <LoadingSpinner />
    </div>,
    ssr: false, // Modal shouldn't render on server
})

// VideoPlayer - heavy component with react-player
export const VideoPlayer = dynamic(() => import('./VideoPlayer'), {
    loading: () => (
        <div className="aspect-video bg-black rounded flex items-center justify-center">
            <LoadingSpinner />
        </div>
    ),
    ssr: false,
})

// LikeOptions - interactive component
export const LikeOptions = dynamic(() => import('./LikeOptions'), {
    loading: () => <div className="h-8 w-8 bg-gray-700 rounded-full animate-pulse" />,
})

// Search component - feature specific
export const SearchOverlay = dynamic(() => import('./SearchOverlay'), {
    loading: () => (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center">
            <LoadingSpinner />
        </div>
    ),
    ssr: false,
})

// User profile components
export const UserProfile = dynamic(() => import('./UserProfile'), {
    loading: () => <div className="h-10 w-10 bg-gray-700 rounded-full animate-pulse" />,
})

export const WatchlistModal = dynamic(() => import('./WatchlistModal'), {
    loading: () => <LoadingSpinner />,
    ssr: false,
})
```

**Step 3: Implement Route-based Splitting (1 hour)**
```typescript
// pages/_app.tsx - Lazy load pages
import dynamic from 'next/dynamic'
import { useRouter } from 'next/router'

// Lazy load authentication pages
const LoginPage = dynamic(() => import('./login'), {
    loading: () => <AuthLoadingScreen />
})

const SignupPage = dynamic(() => import('./signup'), {
    loading: () => <AuthLoadingScreen />
})

const ResetPage = dynamic(() => import('./reset'), {
    loading: () => <AuthLoadingScreen />
})

// Profile page (less frequently accessed)
const ProfilePage = dynamic(() => import('./profile'), {
    loading: () => <ProfileLoadingScreen />
})

function AuthLoadingScreen() {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-center">
                <LoadingSpinner size="large" />
                <p className="text-white mt-4">Loading...</p>
            </div>
        </div>
    )
}
```

**Step 4: Library Code Splitting (30 minutes)**
```typescript
// utils/dynamicImports.ts
export const loadReactPlayer = () => import('react-player/lazy')

export const loadMUIComponents = () => Promise.all([
    import('@mui/material/Button'),
    import('@mui/material/TextField'),
    import('@mui/material/Dialog'),
])

export const loadReactHookForm = () => import('react-hook-form')

// components/VideoPlayer.tsx - Use dynamic import
import { useState, useEffect } from 'react'

export default function VideoPlayer({ url }: { url: string }) {
    const [ReactPlayer, setReactPlayer] = useState<any>(null)

    useEffect(() => {
        import('react-player/lazy').then((module) => {
            setReactPlayer(() => module.default)
        })
    }, [])

    if (!ReactPlayer) {
        return (
            <div className="aspect-video bg-black rounded flex items-center justify-center">
                <LoadingSpinner />
            </div>
        )
    }

    return (
        <ReactPlayer
            url={url}
            width="100%"
            height="100%"
            controls
            config={{
                youtube: {
                    playerVars: { showinfo: 1 }
                }
            }}
        />
    )
}
```

**Step 5: Preload Critical Routes (30 minutes)**
```typescript
// hooks/useRoutePreloading.ts
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export function useRoutePreloading() {
    const router = useRouter()

    useEffect(() => {
        // Preload likely next routes after initial load
        const preloadRoutes = () => {
            if (router.pathname === '/') {
                // From home, users likely go to movie details or profile
                router.prefetch('/movie/[id]')
                router.prefetch('/profile')
            }

            if (router.pathname === '/login') {
                // From login, users go to home
                router.prefetch('/')
            }
        }

        // Delay preloading to not impact initial page load
        const timer = setTimeout(preloadRoutes, 2000)
        return () => clearTimeout(timer)
    }, [router])
}

// components/Thumbnail.tsx - Preload on hover
export default function Thumbnail({ content }: Props) {
    const router = useRouter()

    const handleMouseEnter = () => {
        // Preload movie page when user hovers
        router.prefetch(`/movie/${content.id}`)
    }

    return (
        <div onMouseEnter={handleMouseEnter}>
            {/* thumbnail content */}
        </div>
    )
}
```

**Success Criteria:**
- [ ] Initial bundle size reduced by 30%+
- [ ] Lazy loading visible in Network tab
- [ ] No blocking on heavy component loads
- [ ] Improved Lighthouse performance score

---

## 🎨 USER EXPERIENCE ENHANCEMENTS

### Improvement #4: Enhanced Search Functionality
**Priority**: HIGH (P1)
**Time Estimate**: 8-10 hours
**Dependencies**: API routes, debouncing utility
**ROI**: Very High - Core user feature

#### Implementation Plan:

**Step 1: Create Search Infrastructure (3 hours)**
```typescript
// pages/api/search.ts
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { q, page = 1, type = 'multi' } = req.query
    const API_KEY = process.env.TMDB_API_KEY

    if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: 'Search query is required' })
    }

    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/search/${type}?api_key=${API_KEY}&query=${encodeURIComponent(q)}&page=${page}`
        )

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`)
        }

        const data = await response.json()

        // Cache search results for 30 minutes
        res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600')
        res.status(200).json(data)
    } catch (error) {
        res.status(500).json({ message: 'Search failed' })
    }
}

// hooks/useSearch.ts
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Content } from '../typings'

interface SearchResult {
    results: Content[]
    totalResults: number
    totalPages: number
}

export function useSearch(query: string, enabled: boolean = true) {
    const trimmedQuery = query.trim()

    return useQuery({
        queryKey: ['search', trimmedQuery],
        queryFn: async (): Promise<SearchResult> => {
            if (!trimmedQuery) return { results: [], totalResults: 0, totalPages: 0 }

            const response = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`)
            if (!response.ok) throw new Error('Search failed')
            return response.json()
        },
        enabled: enabled && trimmedQuery.length >= 2,
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
    })
}

export function useSearchSuggestions(query: string) {
    const { data } = useSearch(query, query.length >= 2)

    const suggestions = useMemo(() => {
        if (!data?.results) return []

        // Extract unique suggestions from results
        const titleSuggestions = data.results
            .map(item => getTitle(item))
            .filter(title => title.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5)

        return titleSuggestions
    }, [data, query])

    return suggestions
}
```

**Step 2: Build Search UI Components (4 hours)**
```typescript
// components/SearchOverlay.tsx
import { useState, useRef, useEffect } from 'react'
import { useSearch, useSearchSuggestions } from '../hooks/useSearch'
import { useDebounce } from '../hooks/useDebounce'
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface Props {
    isOpen: boolean
    onClose: () => void
}

export default function SearchOverlay({ isOpen, onClose }: Props) {
    const [query, setQuery] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const debouncedQuery = useDebounce(query, 300)
    const inputRef = useRef<HTMLInputElement>(null)

    const { data: searchResults, isLoading, error } = useSearch(debouncedQuery)
    const suggestions = useSearchSuggestions(debouncedQuery)

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus()
        }
    }, [isOpen])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose()
        } else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(prev =>
                prev < (searchResults?.results.length || 0) - 1 ? prev + 1 : prev
            )
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(prev => prev > -1 ? prev - 1 : prev)
        } else if (e.key === 'Enter' && selectedIndex >= 0) {
            const selectedResult = searchResults?.results[selectedIndex]
            if (selectedResult) {
                handleResultClick(selectedResult)
            }
        }
    }

    const handleResultClick = (content: Content) => {
        router.push(`/${content.media_type}/${content.id}`)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 bg-black/90">
            <div className="container mx-auto px-4 pt-20">
                {/* Search Input */}
                <div className="relative mb-8">
                    <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-6 w-6 -translate-y-1/2 text-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search movies, TV shows..."
                        className="w-full bg-gray-800 text-white pl-12 pr-12 py-4 text-xl rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none"
                    />
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Search Suggestions */}
                {suggestions.length > 0 && query.length < 4 && (
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-3">Suggestions</h3>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => setQuery(suggestion)}
                                    className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-full text-sm transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Loading State */}
                {isLoading && query.length >= 2 && (
                    <div className="text-center py-8">
                        <LoadingSpinner />
                        <p className="text-gray-400 mt-2">Searching...</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="text-center py-8">
                        <p className="text-red-400">Search failed. Please try again.</p>
                    </div>
                )}

                {/* Search Results */}
                {searchResults && searchResults.results.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold mb-4">
                            Results ({searchResults.totalResults})
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {searchResults.results.map((content, index) => (
                                <SearchResultCard
                                    key={content.id}
                                    content={content}
                                    isSelected={index === selectedIndex}
                                    onClick={() => handleResultClick(content)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* No Results */}
                {searchResults && searchResults.results.length === 0 && query.length >= 2 && !isLoading && (
                    <div className="text-center py-8">
                        <p className="text-gray-400">No results found for "{query}"</p>
                        <p className="text-sm text-gray-500 mt-2">Try different keywords or check the spelling</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// components/SearchResultCard.tsx
interface Props {
    content: Content
    isSelected: boolean
    onClick: () => void
}

export function SearchResultCard({ content, isSelected, onClick }: Props) {
    return (
        <div
            onClick={onClick}
            className={`cursor-pointer transition-all duration-200 ${
                isSelected ? 'ring-2 ring-red-500 scale-105' : 'hover:scale-105'
            }`}
        >
            <div className="relative aspect-[2/3] rounded-lg overflow-hidden">
                <Image
                    src={`https://image.tmdb.org/t/p/w342${content.poster_path}`}
                    alt={getTitle(content)}
                    layout="fill"
                    className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                    <h4 className="font-semibold text-sm line-clamp-2">
                        {getTitle(content)}
                    </h4>
                    <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-300">
                            {isMovie(content) ? 'Movie' : 'TV'}
                        </span>
                        <span className="text-xs text-gray-300">
                            ⭐ {content.vote_average.toFixed(1)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
```

**Step 3: Add Advanced Search Features (2 hours)**
```typescript
// components/SearchFilters.tsx
interface SearchFilters {
    type: 'all' | 'movie' | 'tv'
    genre: number | null
    year: number | null
    rating: [number, number]
}

export function SearchFilters({ filters, onChange }: {
    filters: SearchFilters
    onChange: (filters: SearchFilters) => void
}) {
    return (
        <div className="bg-gray-800 p-4 rounded-lg mb-6">
            <h3 className="font-semibold mb-4">Filters</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Content Type */}
                <div>
                    <label className="block text-sm font-medium mb-2">Type</label>
                    <select
                        value={filters.type}
                        onChange={(e) => onChange({ ...filters, type: e.target.value as any })}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                    >
                        <option value="all">All</option>
                        <option value="movie">Movies</option>
                        <option value="tv">TV Shows</option>
                    </select>
                </div>

                {/* Genre */}
                <div>
                    <label className="block text-sm font-medium mb-2">Genre</label>
                    <select
                        value={filters.genre || ''}
                        onChange={(e) => onChange({
                            ...filters,
                            genre: e.target.value ? parseInt(e.target.value) : null
                        })}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                    >
                        <option value="">All Genres</option>
                        <option value="28">Action</option>
                        <option value="35">Comedy</option>
                        <option value="18">Drama</option>
                        <option value="27">Horror</option>
                        <option value="10749">Romance</option>
                        <option value="878">Sci-Fi</option>
                    </select>
                </div>

                {/* Year */}
                <div>
                    <label className="block text-sm font-medium mb-2">Year</label>
                    <select
                        value={filters.year || ''}
                        onChange={(e) => onChange({
                            ...filters,
                            year: e.target.value ? parseInt(e.target.value) : null
                        })}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                    >
                        <option value="">Any Year</option>
                        {Array.from({ length: 30 }, (_, i) => 2024 - i).map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>

                {/* Rating */}
                <div>
                    <label className="block text-sm font-medium mb-2">Min Rating</label>
                    <select
                        value={filters.rating[0]}
                        onChange={(e) => onChange({
                            ...filters,
                            rating: [parseFloat(e.target.value), filters.rating[1]]
                        })}
                        className="w-full bg-gray-700 text-white rounded px-3 py-2"
                    >
                        <option value="0">Any Rating</option>
                        <option value="7">7.0+</option>
                        <option value="8">8.0+</option>
                        <option value="9">9.0+</option>
                    </select>
                </div>
            </div>
        </div>
    )
}
```

**Step 4: Add Search to Header (1 hour)**
```typescript
// components/Header.tsx - Add search integration
export default function Header() {
    const [searchOpen, setSearchOpen] = useState(false)

    return (
        <header className="flex items-center space-x-2 md:space-x-10 h-14 bg-black/90">
            {/* Logo */}
            <Image src="/logo.png" width={120} height={120} alt="Netflix" />

            {/* Navigation */}
            <nav className="hidden md:flex space-x-4">
                <a href="/" className="text-white hover:text-gray-300">Home</a>
                <a href="/tv" className="text-white hover:text-gray-300">TV Shows</a>
                <a href="/movies" className="text-white hover:text-gray-300">Movies</a>
                <a href="/watchlist" className="text-white hover:text-gray-300">My List</a>
            </nav>

            <div className="flex-1" />

            {/* Search */}
            <button
                onClick={() => setSearchOpen(true)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                aria-label="Search"
            >
                <MagnifyingGlassIcon className="h-6 w-6 text-white" />
            </button>

            {/* Search Overlay */}
            <SearchOverlay
                isOpen={searchOpen}
                onClose={() => setSearchOpen(false)}
            />

            {/* User Menu */}
            <UserMenu />
        </header>
    )
}
```

**Success Criteria:**
- [ ] Real-time search with debouncing
- [ ] Keyboard navigation support
- [ ] Advanced filtering options
- [ ] Search suggestions working
- [ ] Mobile-responsive search interface

---

*[Document continues with remaining 26 improvements...]*

### Improvement #5: Watchlist Feature
**Priority**: HIGH (P1)
**Time Estimate**: 6-8 hours
**Dependencies**: Firebase Firestore, user authentication
**ROI**: Very High - Core engagement feature

#### Implementation Plan:

**Step 1: Firestore Schema Design (1 hour)**
```typescript
// types/watchlist.ts
export interface WatchlistItem {
    id: string           // movieId or tvId
    userId: string
    contentType: 'movie' | 'tv'
    title: string
    posterPath: string
    addedAt: Timestamp
    isWatched: boolean
    rating?: number      // User's personal rating
    notes?: string       // User's personal notes
}

export interface UserWatchlist {
    userId: string
    items: WatchlistItem[]
    createdAt: Timestamp
    updatedAt: Timestamp
}

// Firestore structure:
// watchlists/{userId}/
//   items/{contentId}
//   metadata/info
```

**Success Criteria:**
- [ ] Users can add/remove content from watchlist
- [ ] Watchlist persists across sessions
- [ ] Fast watchlist operations
- [ ] Offline support for watchlist viewing
- [ ] Personal ratings and notes functionality

---

*[Continue with remaining 25 improvements...]*