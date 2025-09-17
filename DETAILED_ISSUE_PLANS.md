# 📋 Detailed Implementation Plans for Critical Issues

## 🔴 CRITICAL SECURITY ISSUES

### Issue #1: Exposed Firebase Configuration
**File**: `firebase.ts:9-16`
**Priority**: IMMEDIATE (P0)
**Time Estimate**: 2-3 hours
**Dependencies**: None

#### Problem Analysis:
- Firebase API keys hardcoded in source code
- Client-side exposure allows unauthorized access
- Potential for quota abuse and data breaches
- Configuration visible in browser dev tools

#### Detailed Solution Plan:

**Step 1: Environment Setup (30 minutes)**
```bash
# Create environment files
touch .env.local
touch .env.example
echo ".env.local" >> .gitignore
```

**Step 2: Move Configuration to Environment (45 minutes)**
```typescript
// .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAUnk_RlyFa7BzLuhiadzy32iyBDKCcYSE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=netflix-clone-15862.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=netflix-clone-15862
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=netflix-clone-15862.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1090225576232
NEXT_PUBLIC_FIREBASE_APP_ID=1:1090225576232:web:4db337ae40f1de7aa5181d

# .env.example (for documentation)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain_here
# ... etc
```

**Step 3: Update Firebase Configuration (30 minutes)**
```typescript
// firebase.ts
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Add validation
if (!firebaseConfig.apiKey) {
    throw new Error('Firebase configuration is missing. Please check your environment variables.')
}
```

**Step 4: Firebase Security Rules (60 minutes)**
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Watchlists are user-specific
    match /watchlists/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**Step 5: Testing & Validation (30 minutes)**
- Test environment variable loading
- Verify Firebase connection works
- Test in development and production modes
- Validate security rules in Firebase console

**Success Criteria:**
- [ ] No hardcoded secrets in source code
- [ ] Firebase authentication still works
- [ ] Environment variables properly loaded
- [ ] Security rules applied and tested

---

### Issue #2: API Key Exposure
**File**: `utils/requests.ts:1`
**Priority**: CRITICAL (P0)
**Time Estimate**: 1-2 hours
**Dependencies**: Environment setup from Issue #1

#### Problem Analysis:
- TMDB API key uses `NEXT_PUBLIC_` prefix
- Key exposed in client-side bundle
- Potential for quota abuse and unauthorized usage
- API rate limits could be exhausted by malicious users

#### Detailed Solution Plan:

**Step 1: Move API Key to Server-Side (45 minutes)**
```typescript
// .env.local (add to existing file)
TMDB_API_KEY=your_actual_api_key_here

// utils/requests.ts - Remove client-side key reference
// const API_KEY = process.env.NEXT_PUBLIC_API_KEY // DELETE THIS LINE
const BASE_URL = 'https://api.themoviedb.org/3'

// Create server-side API routes
export const serverRequests = {
    fetchTrending: `/api/movies/trending`,
    fetchTopRatedMovies: `/api/movies/top-rated`,
    fetchActionMovies: `/api/movies/genre/action`,
    // ... etc
}
```

**Step 2: Create API Routes (60 minutes)**
```typescript
// pages/api/movies/trending.ts
import type { NextApiRequest, NextApiResponse } from 'next'

const API_KEY = process.env.TMDB_API_KEY
const BASE_URL = 'https://api.themoviedb.org/3'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' })
    }

    try {
        const response = await fetch(
            `${BASE_URL}/trending/all/week?api_key=${API_KEY}&language=en-US&page=1`
        )

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`)
        }

        const data = await response.json()

        // Cache for 1 hour
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
        res.status(200).json(data)
    } catch (error) {
        console.error('TMDB API error:', error)
        res.status(500).json({ message: 'Failed to fetch trending movies' })
    }
}
```

**Step 3: Update Data Fetching (30 minutes)**
```typescript
// pages/index.tsx - Update getServerSideProps
export const getServerSideProps = async () => {
    const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://yourapp.vercel.app'
        : 'http://localhost:3000'

    try {
        const [trending, topRatedMovies, actionMovies] = await Promise.all([
            fetch(`${baseUrl}/api/movies/trending`).then(res => res.json()),
            fetch(`${baseUrl}/api/movies/top-rated`).then(res => res.json()),
            fetch(`${baseUrl}/api/movies/genre/action`).then(res => res.json()),
        ])

        return {
            props: {
                trending: trending.results || [],
                topRatedMovies: topRatedMovies.results || [],
                actionMovies: actionMovies.results || [],
            }
        }
    } catch (error) {
        console.error('Failed to fetch movie data:', error)
        return {
            props: {
                trending: [],
                topRatedMovies: [],
                actionMovies: [],
            }
        }
    }
}
```

**Step 4: Error Handling & Rate Limiting (15 minutes)**
```typescript
// utils/rateLimit.ts
import { NextApiRequest, NextApiResponse } from 'next'

const rateLimit = new Map()

export function checkRateLimit(req: NextApiRequest, res: NextApiResponse) {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress
    const now = Date.now()
    const windowMs = 15 * 60 * 1000 // 15 minutes
    const maxRequests = 100

    if (!rateLimit.has(ip)) {
        rateLimit.set(ip, { count: 1, resetTime: now + windowMs })
        return true
    }

    const record = rateLimit.get(ip)
    if (now > record.resetTime) {
        record.count = 1
        record.resetTime = now + windowMs
        return true
    }

    if (record.count >= maxRequests) {
        res.status(429).json({ message: 'Too many requests' })
        return false
    }

    record.count++
    return true
}
```

**Success Criteria:**
- [ ] API key not visible in client-side code
- [ ] Server-side API routes working
- [ ] Rate limiting implemented
- [ ] Error handling for API failures

---

## 🟠 HIGH PRIORITY FUNCTIONAL ISSUES

### Issue #3: Unused Data Fetching
**File**: `pages/index.tsx:94-98`
**Priority**: HIGH (P1)
**Time Estimate**: 3-4 hours
**Dependencies**: None

#### Problem Analysis:
- Fetching TV show data but not displaying it
- Wasting API calls and bandwidth
- Inconsistent data usage patterns
- Performance impact from unnecessary requests

#### Detailed Solution Plan:

**Step 1: Audit Current Data Usage (30 minutes)**
```typescript
// Create data usage audit
// pages/index.tsx analysis:
// USED: trending, topRatedMovies, actionMovies, comedyMovies, horrorMovies, romanceMovies, documentaries
// UNUSED: topRatedTV, actionTV, comedyTV, horrorTV

// Decision matrix:
// Option A: Remove unused fetching (immediate fix)
// Option B: Implement TV show display (feature addition)
// Option C: Hybrid approach with conditional fetching
```

**Step 2: Implement TV Show Toggle Feature (2 hours)**
```typescript
// atoms/contentTypeAtom.ts
import { atom } from 'recoil'

export const contentTypeState = atom({
    key: 'contentTypeState',
    default: 'movies' as 'movies' | 'tv'
})

// components/ContentToggle.tsx
import { useRecoilState } from 'recoil'
import { contentTypeState } from '../atoms/contentTypeAtom'

export default function ContentToggle() {
    const [contentType, setContentType] = useRecoilState(contentTypeState)

    return (
        <div className="flex space-x-4 mb-8">
            <button
                onClick={() => setContentType('movies')}
                className={`px-4 py-2 rounded ${
                    contentType === 'movies'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-300'
                }`}
            >
                Movies
            </button>
            <button
                onClick={() => setContentType('tv')}
                className={`px-4 py-2 rounded ${
                    contentType === 'tv'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-700 text-gray-300'
                }`}
            >
                TV Shows
            </button>
        </div>
    )
}
```

**Step 3: Conditional Data Display (60 minutes)**
```typescript
// pages/index.tsx - Update component
import ContentToggle from '../components/ContentToggle'
import { useRecoilValue } from 'recoil'
import { contentTypeState } from '../atoms/contentTypeAtom'

const Home = ({
    trending, topRatedMovies, actionMovies, comedyMovies, horrorMovies, romanceMovies, documentaries,
    topRatedTV, actionTV, comedyTV, horrorTV
}: Props) => {
    const contentType = useRecoilValue(contentTypeState)

    return (
        <div className={`relative h-screen overflow-x-clip ${showModal && 'overflow-y-hidden'}`}>
            <Head>
                <title>Netflix Clone</title>
                <link rel="icon" href="/netflix.png" />
            </Head>
            <Header />
            <main id="content" className="absolute top-0 h-screen w-screen">
                <Banner trending={trending} />
                <section className="absolute top-[50em] pb-52">
                    <ContentToggle />

                    {contentType === 'movies' ? (
                        <>
                            <Row title="Trending Movies" movies={trending.filter(item => item.media_type === 'movie')} />
                            <Row title="Top Rated Movies" movies={topRatedMovies} />
                            <Row title="Action Movies" movies={actionMovies} />
                            <Row title="Comedy Movies" movies={comedyMovies} />
                            <Row title="Horror Movies" movies={horrorMovies} />
                            <Row title="Romance Movies" movies={romanceMovies} />
                            <Row title="Documentaries" movies={documentaries} />
                        </>
                    ) : (
                        <>
                            <Row title="Trending TV Shows" movies={trending.filter(item => item.media_type === 'tv')} />
                            <Row title="Top Rated TV Shows" movies={topRatedTV} />
                            <Row title="Action TV Shows" movies={actionTV} />
                            <Row title="Comedy TV Shows" movies={comedyTV} />
                            <Row title="Horror TV Shows" movies={horrorTV} />
                        </>
                    )}
                </section>
                {showModal && <Modal />}
            </main>
        </div>
    )
}
```

**Step 4: Optimize Data Fetching (45 minutes)**
```typescript
// utils/dataFetcher.ts
export async function fetchContentData() {
    const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://yourapp.vercel.app'
        : 'http://localhost:3000'

    // Fetch trending first to determine what content to prioritize
    const trending = await fetch(`${baseUrl}/api/movies/trending`).then(res => res.json())

    // Count movie vs TV content in trending
    const movieCount = trending.results?.filter(item => item.media_type === 'movie').length || 0
    const tvCount = trending.results?.filter(item => item.media_type === 'tv').length || 0

    // Fetch movie data
    const moviePromises = [
        fetch(`${baseUrl}/api/movies/top-rated`),
        fetch(`${baseUrl}/api/movies/genre/action`),
        fetch(`${baseUrl}/api/movies/genre/comedy`),
        fetch(`${baseUrl}/api/movies/genre/horror`),
        fetch(`${baseUrl}/api/movies/genre/romance`),
        fetch(`${baseUrl}/api/movies/genre/documentary`),
    ]

    // Only fetch TV data if there's significant TV content in trending
    const tvPromises = tvCount > 5 ? [
        fetch(`${baseUrl}/api/tv/top-rated`),
        fetch(`${baseUrl}/api/tv/genre/action`),
        fetch(`${baseUrl}/api/tv/genre/comedy`),
        fetch(`${baseUrl}/api/tv/genre/horror`),
    ] : []

    return {
        movieData: await Promise.all(moviePromises),
        tvData: await Promise.all(tvPromises),
        trending
    }
}
```

**Step 5: Update Type Definitions (15 minutes)**
```typescript
// typings.d.ts - Update interface
export interface Movie {
    title?: string           // For movies
    name?: string           // For TV shows
    backdrop_path: string
    media_type: 'movie' | 'tv'
    release_date?: string   // For movies
    first_air_date?: string // For TV shows
    genre_ids: number[]
    id: number
    origin_country: string[]
    original_language: string
    original_name?: string
    original_title?: string
    overview: string
    popularity: number
    poster_path: string
    vote_average: number
    vote_count: number
}
```

**Success Criteria:**
- [ ] TV data is utilized or removed
- [ ] No unnecessary API calls
- [ ] Toggle between movies and TV shows works
- [ ] Performance improved (measure bundle size)

---

### Issue #4: Inconsistent Data Structure
**File**: `typings.d.ts:6-23`
**Priority**: HIGH (P1)
**Time Estimate**: 2-3 hours
**Dependencies**: Issue #3 (TV show implementation)

#### Problem Analysis:
- Movie interface mixing movie and TV properties
- `title` vs `name` confusion
- `release_date` vs `first_air_date` inconsistency
- Type safety compromised

#### Detailed Solution Plan:

**Step 1: Create Proper Type Hierarchy (60 minutes)**
```typescript
// typings.d.ts - Rewrite with proper inheritance
export interface BaseContent {
    id: number
    backdrop_path: string
    genre_ids: number[]
    origin_country: string[]
    original_language: string
    overview: string
    popularity: number
    poster_path: string
    vote_average: number
    vote_count: number
}

export interface Movie extends BaseContent {
    media_type: 'movie'
    title: string
    original_title: string
    release_date: string
    runtime?: number
}

export interface TVShow extends BaseContent {
    media_type: 'tv'
    name: string
    original_name: string
    first_air_date: string
    number_of_seasons?: number
    number_of_episodes?: number
}

export type Content = Movie | TVShow

// Type guards for runtime checking
export function isMovie(content: Content): content is Movie {
    return content.media_type === 'movie'
}

export function isTVShow(content: Content): content is TVShow {
    return content.media_type === 'tv'
}

// Utility functions for consistent access
export function getTitle(content: Content): string {
    return isMovie(content) ? content.title : content.name
}

export function getReleaseDate(content: Content): string {
    return isMovie(content) ? content.release_date : content.first_air_date
}

export function getOriginalTitle(content: Content): string {
    return isMovie(content) ? content.original_title : content.original_name
}
```

**Step 2: Update Components to Use Utility Functions (90 minutes)**
```typescript
// components/Thumbnail.tsx - Update to handle both types
import { Content, getTitle, getReleaseDate, isMovie } from '../typings'

interface Props {
    content: Content  // Changed from 'movie'
}

export default function Thumbnail({ content }: Props) {
    return (
        <div className="relative h-28 min-w-[180px] cursor-pointer transition duration-200 ease-out md:h-36 md:min-w-[260px] md:hover:scale-105">
            <Image
                src={`https://image.tmdb.org/t/p/w500${content.backdrop_path || content.poster_path}`}
                className="rounded-sm object-cover md:rounded"
                layout="fill"
                alt={getTitle(content)}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                <h3 className="text-sm font-semibold">{getTitle(content)}</h3>
                <p className="text-xs text-gray-300">
                    {isMovie(content) ? 'Movie' : 'TV Show'} • {getReleaseDate(content)?.slice(0, 4)}
                </p>
            </div>
        </div>
    )
}
```

**Step 3: Update Row Component (30 minutes)**
```typescript
// components/Row.tsx - Make generic for both content types
import { Content } from '../typings'

interface Props {
    title: string
    content: Content[]  // Changed from movies
}

export default function Row({ title, content }: Props) {
    return (
        <div className="h-40 space-y-0.5 md:space-y-2">
            <h2 className="w-56 cursor-pointer text-sm font-semibold text-[#e5e5e5] transition duration-200 hover:text-white md:text-2xl">
                {title}
            </h2>
            <div className="group relative md:-ml-2">
                <div className="flex items-center space-x-0.5 overflow-x-scroll scrollbar-hide md:space-x-2.5 md:p-2">
                    {content.map((item) => (
                        <Thumbnail key={item.id} content={item} />
                    ))}
                </div>
            </div>
        </div>
    )
}
```

**Step 4: Update Modal Component (45 minutes)**
```typescript
// components/Modal.tsx - Handle both content types
import { useRecoilState } from 'recoil'
import { modalState, movieState } from '../atoms/modalAtom'
import { Content, getTitle, getReleaseDate, isMovie, isTVShow } from '../typings'

export default function Modal() {
    const [showModal, setShowModal] = useRecoilState(modalState)
    const [currentContent] = useRecoilState(movieState)  // Rename from movie to content

    if (!currentContent) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="relative mx-4 max-w-4xl overflow-hidden rounded-lg bg-[#181818]">
                {/* Header */}
                <div className="relative h-96">
                    <Image
                        src={`https://image.tmdb.org/t/p/original${currentContent.backdrop_path}`}
                        layout="fill"
                        className="object-cover"
                        alt={getTitle(currentContent)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-transparent" />
                    <button
                        onClick={() => setShowModal(false)}
                        className="absolute right-4 top-4 rounded-full bg-[#181818] p-2"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    <h1 className="text-3xl font-bold">{getTitle(currentContent)}</h1>
                    <div className="mt-4 flex items-center space-x-4">
                        <span className="rounded bg-gray-700 px-2 py-1 text-sm">
                            {isMovie(currentContent) ? 'Movie' : 'TV Show'}
                        </span>
                        <span className="text-sm text-gray-400">
                            {getReleaseDate(currentContent)?.slice(0, 4)}
                        </span>
                        <span className="text-sm text-gray-400">
                            ⭐ {currentContent.vote_average.toFixed(1)}
                        </span>
                    </div>

                    <p className="mt-4 text-lg">{currentContent.overview}</p>

                    {/* Show different details based on content type */}
                    {isTVShow(currentContent) && (
                        <div className="mt-4 text-sm text-gray-400">
                            {currentContent.number_of_seasons && (
                                <span>{currentContent.number_of_seasons} seasons</span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
```

**Step 5: Update Atom Types (15 minutes)**
```typescript
// atoms/modalAtom.ts - Update types
import { atom } from 'recoil'
import { Content } from '../typings'

export const modalState = atom({
    key: 'modalState',
    default: false,
})

export const movieState = atom<Content | null>({  // Update type
    key: 'movieState', // Keep key name for backward compatibility
    default: null,
})
```

**Success Criteria:**
- [ ] Type safety enforced throughout app
- [ ] Components handle both movies and TV shows
- [ ] No more type-related runtime errors
- [ ] Consistent data access patterns

---

### Issue #5: Poor Error Handling
**Files**: `hooks/useAuth.tsx:95,113`, `pages/index.tsx:86-98`
**Priority**: HIGH (P1)
**Time Estimate**: 4-5 hours
**Dependencies**: None

#### Problem Analysis:
- Using browser `alert()` for error messages
- No error handling for API requests
- Poor user experience during failures
- No error recovery mechanisms

#### Detailed Solution Plan:

**Step 1: Create Error Management System (90 minutes)**
```typescript
// atoms/errorAtom.ts
import { atom } from 'recoil'

export interface AppError {
    id: string
    type: 'auth' | 'api' | 'network' | 'validation'
    message: string
    details?: string
    timestamp: number
    dismissed?: boolean
}

export const errorsState = atom<AppError[]>({
    key: 'errorsState',
    default: [],
})

// utils/errorHandler.ts
import { SetterOrUpdater } from 'recoil'
import { AppError } from '../atoms/errorAtom'

export class ErrorHandler {
    private setErrors: SetterOrUpdater<AppError[]>

    constructor(setErrors: SetterOrUpdater<AppError[]>) {
        this.setErrors = setErrors
    }

    addError(type: AppError['type'], message: string, details?: string) {
        const error: AppError = {
            id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            message,
            details,
            timestamp: Date.now(),
        }

        this.setErrors(prev => [...prev, error])

        // Auto-dismiss after 5 seconds for non-critical errors
        if (type !== 'auth') {
            setTimeout(() => this.dismissError(error.id), 5000)
        }
    }

    dismissError(errorId: string) {
        this.setErrors(prev => prev.filter(error => error.id !== errorId))
    }

    clearAllErrors() {
        this.setErrors([])
    }

    handleAuthError(error: any) {
        const errorMessages: Record<string, string> = {
            'auth/user-not-found': 'No account found with this email address.',
            'auth/wrong-password': 'Invalid password. Please try again.',
            'auth/email-already-in-use': 'An account with this email already exists.',
            'auth/weak-password': 'Password should be at least 6 characters long.',
            'auth/invalid-email': 'Please enter a valid email address.',
            'auth/too-many-requests': 'Too many failed attempts. Please try again later.',
        }

        const message = errorMessages[error.code] || 'An authentication error occurred.'
        this.addError('auth', message, error.code)
    }

    handleApiError(error: any, context: string) {
        let message = `Failed to ${context}. Please try again.`

        if (error.status === 429) {
            message = 'Too many requests. Please wait a moment and try again.'
        } else if (error.status >= 500) {
            message = 'Server error. Our team has been notified.'
        } else if (!navigator.onLine) {
            message = 'No internet connection. Please check your network.'
        }

        this.addError('api', message, `${context} - ${error.status || 'Network Error'}`)
    }
}
```

**Step 2: Create Error Display Components (60 minutes)**
```typescript
// components/ErrorToast.tsx
import { useRecoilState } from 'recoil'
import { errorsState, AppError } from '../atoms/errorAtom'
import { XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

export default function ErrorToast() {
    const [errors, setErrors] = useRecoilState(errorsState)

    const dismissError = (errorId: string) => {
        setErrors(prev => prev.filter(error => error.id !== errorId))
    }

    const getErrorIcon = (type: AppError['type']) => {
        switch (type) {
            case 'auth':
                return <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
            case 'api':
                return <InformationCircleIcon className="h-6 w-6 text-blue-500" />
            default:
                return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
        }
    }

    const getErrorStyles = (type: AppError['type']) => {
        const baseStyles = "fixed top-4 right-4 z-50 max-w-md rounded-lg p-4 shadow-lg transition-all duration-300"

        switch (type) {
            case 'auth':
                return `${baseStyles} bg-red-50 border border-red-200`
            case 'api':
                return `${baseStyles} bg-blue-50 border border-blue-200`
            default:
                return `${baseStyles} bg-yellow-50 border border-yellow-200`
        }
    }

    return (
        <div className="pointer-events-none fixed inset-0 z-50">
            {errors.map((error, index) => (
                <div
                    key={error.id}
                    className="pointer-events-auto"
                    style={{ top: `${16 + index * 80}px` }}
                >
                    <div className={getErrorStyles(error.type)}>
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                {getErrorIcon(error.type)}
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                    {error.message}
                                </p>
                                {error.details && (
                                    <p className="mt-1 text-xs text-gray-500">
                                        {error.details}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => dismissError(error.id)}
                                className="ml-4 flex-shrink-0 rounded-md bg-transparent p-1 hover:bg-gray-100"
                            >
                                <XMarkIcon className="h-4 w-4 text-gray-400" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

// components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('Error caught by boundary:', error, errorInfo)

        // Send to error reporting service
        if (process.env.NODE_ENV === 'production') {
            // reportError(error, errorInfo)
        }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex min-h-screen items-center justify-center bg-gray-900">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-white mb-4">
                            Something went wrong
                        </h1>
                        <p className="text-gray-400 mb-4">
                            We're sorry for the inconvenience. Please refresh the page.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                        >
                            Refresh Page
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
```

**Step 3: Update Authentication Hook (90 minutes)**
```typescript
// hooks/useAuth.tsx - Replace alert() calls with proper error handling
import { useRecoilState } from 'recoil'
import { errorsState } from '../atoms/errorAtom'
import { ErrorHandler } from '../utils/errorHandler'

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useRecoilState(errorsState)

    const errorHandler = new ErrorHandler(setErrors)

    const signUp = async (email: string, password: string) => {
        setLoading(true)

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password)
            const user = userCredential.user
            router.push('/')
        } catch (error: any) {
            errorHandler.handleAuthError(error)
        } finally {
            setLoading(false)
        }
    }

    const signIn = async (email: string, password: string) => {
        setLoading(true)

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password)
            const user = userCredential.user
            router.push('/')
        } catch (error: any) {
            errorHandler.handleAuthError(error)
        } finally {
            setLoading(false)
        }
    }

    const signInWithGoogle = async () => {
        setLoading(true)
        const provider = new GoogleAuthProvider()

        try {
            const result = await signInWithPopup(auth, provider)
            // Handle success silently - user will be redirected
        } catch (error: any) {
            if (error.code !== 'auth/popup-closed-by-user') {
                errorHandler.handleAuthError(error)
            }
        } finally {
            setLoading(false)
        }
    }

    const logOut = async () => {
        setLoading(true)

        try {
            await signOut(auth)
        } catch (error: any) {
            errorHandler.handleAuthError(error)
        } finally {
            setLoading(false)
        }
    }

    const resetPass = async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email)
            setPassResetSuccess(true)
            // Show success message
            errorHandler.addError('auth', 'Password reset email sent! Check your inbox.', 'success')
        } catch (error: any) {
            errorHandler.handleAuthError(error)
            setPassResetSuccess(false)
        }
    }

    // ... rest of the component
}
```

**Step 4: Add API Error Handling (45 minutes)**
```typescript
// utils/apiClient.ts
import { ErrorHandler } from './errorHandler'

export class ApiClient {
    private errorHandler: ErrorHandler

    constructor(errorHandler: ErrorHandler) {
        this.errorHandler = errorHandler
    }

    async fetchWithErrorHandling(url: string, context: string) {
        try {
            const response = await fetch(url)

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`)
            }

            return await response.json()
        } catch (error: any) {
            this.errorHandler.handleApiError(error, context)
            throw error // Re-throw for component-level handling
        }
    }
}

// pages/index.tsx - Update getServerSideProps
export const getServerSideProps = async () => {
    try {
        const [trending, topRatedMovies, actionMovies] = await Promise.all([
            fetch(`${baseUrl}/api/movies/trending`).then(async res => {
                if (!res.ok) throw new Error(`Failed to fetch trending movies: ${res.status}`)
                return res.json()
            }),
            // ... other API calls with similar error handling
        ])

        return {
            props: {
                trending: trending.results || [],
                topRatedMovies: topRatedMovies.results || [],
                actionMovies: actionMovies.results || [],
                hasErrors: false,
            }
        }
    } catch (error) {
        console.error('Failed to fetch movie data:', error)

        // Return empty data but indicate there were errors
        return {
            props: {
                trending: [],
                topRatedMovies: [],
                actionMovies: [],
                hasErrors: true,
                errorMessage: 'Failed to load movie data. Please try again later.',
            }
        }
    }
}
```

**Step 5: Update App Component (30 minutes)**
```typescript
// pages/_app.tsx - Add error handling components
import ErrorBoundary from '../components/ErrorBoundary'
import ErrorToast from '../components/ErrorToast'
import { RecoilRoot } from 'recoil'

export default function App({ Component, pageProps }: AppProps) {
    return (
        <RecoilRoot>
            <ErrorBoundary>
                <AuthProvider>
                    <Component {...pageProps} />
                    <ErrorToast />
                </AuthProvider>
            </ErrorBoundary>
        </RecoilRoot>
    )
}
```

**Success Criteria:**
- [ ] No more browser alert() calls
- [ ] User-friendly error messages
- [ ] Error recovery mechanisms in place
- [ ] Network errors handled gracefully
- [ ] Authentication errors properly categorized

---

## 🟡 MEDIUM PRIORITY ISSUES

### Issue #6: Missing Environment Configuration
**Priority**: MEDIUM (P2)
**Time Estimate**: 1-2 hours
**Dependencies**: Issues #1, #2 (Environment setup)

#### Detailed Solution Plan:

**Step 1: Create Environment Structure (30 minutes)**
```bash
# Create environment files
touch .env.local
touch .env.example
touch .env.development
touch .env.production

# Update .gitignore
echo "# Environment files" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.development" >> .gitignore
echo ".env.production" >> .gitignore
echo ".env*.local" >> .gitignore
```

**Step 2: Define Environment Variables (45 minutes)**
```bash
# .env.example (template for developers)
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# TMDB API
TMDB_API_KEY=your_tmdb_api_key

# App Configuration
NEXT_PUBLIC_APP_NAME=Netflix Clone
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Optional: Analytics
NEXT_PUBLIC_GA_ID=your_google_analytics_id

# Optional: Error Reporting
SENTRY_DSN=your_sentry_dsn
```

**Step 3: Create Configuration Module (30 minutes)**
```typescript
// config/index.ts
interface Config {
    firebase: {
        apiKey: string
        authDomain: string
        projectId: string
        storageBucket: string
        messagingSenderId: string
        appId: string
    }
    tmdb: {
        apiKey: string
        baseUrl: string
    }
    app: {
        name: string
        url: string
        isDevelopment: boolean
        isProduction: boolean
    }
    analytics?: {
        gaId?: string
    }
    sentry?: {
        dsn?: string
    }
}

function validateEnvVar(name: string, value: string | undefined): string {
    if (!value) {
        throw new Error(`Environment variable ${name} is required but not set`)
    }
    return value
}

function createConfig(): Config {
    return {
        firebase: {
            apiKey: validateEnvVar('NEXT_PUBLIC_FIREBASE_API_KEY', process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
            authDomain: validateEnvVar('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
            projectId: validateEnvVar('NEXT_PUBLIC_FIREBASE_PROJECT_ID', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
            storageBucket: validateEnvVar('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
            messagingSenderId: validateEnvVar('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
            appId: validateEnvVar('NEXT_PUBLIC_FIREBASE_APP_ID', process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
        },
        tmdb: {
            apiKey: validateEnvVar('TMDB_API_KEY', process.env.TMDB_API_KEY),
            baseUrl: 'https://api.themoviedb.org/3',
        },
        app: {
            name: process.env.NEXT_PUBLIC_APP_NAME || 'Netflix Clone',
            url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
            isDevelopment: process.env.NODE_ENV === 'development',
            isProduction: process.env.NODE_ENV === 'production',
        },
        analytics: {
            gaId: process.env.NEXT_PUBLIC_GA_ID,
        },
        sentry: {
            dsn: process.env.SENTRY_DSN,
        },
    }
}

export const config = createConfig()
```

**Step 4: Update Firebase Configuration (15 minutes)**
```typescript
// firebase.ts - Use config module
import { config } from './config'

const firebaseConfig = config.firebase

// Validate configuration
if (!firebaseConfig.apiKey) {
    throw new Error('Firebase configuration is incomplete. Please check your environment variables.')
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
const db = getFirestore(app)
const auth = getAuth(app)

export default app
export { auth, db }
```

**Step 5: Create Setup Documentation (20 minutes)**
```markdown
# Development Setup

## Environment Configuration

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your actual values in `.env.local`:
   - Get Firebase config from your Firebase Console
   - Get TMDB API key from https://www.themoviedb.org/settings/api
   - Set your app URL for the environment

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Run the development server:
   ```bash
   pnpm dev
   ```

## Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API Key | Yes |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain | Yes |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase Project ID | Yes |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket | Yes |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID | Yes |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID | Yes |
| `TMDB_API_KEY` | The Movie Database API Key | Yes |
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID | No |
| `SENTRY_DSN` | Sentry Error Reporting DSN | No |

## Deployment

For production deployment, make sure to set all required environment variables in your hosting platform.
```

**Success Criteria:**
- [ ] Environment variables properly organized
- [ ] Configuration validation in place
- [ ] Clear setup documentation
- [ ] No hardcoded configuration values

---

*[Continuing with remaining issues in next part due to length...]*