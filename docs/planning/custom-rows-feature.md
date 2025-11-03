# Custom Rows Feature - Complete Implementation Plan

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Feature Overview](#feature-overview)
3. [Technical Architecture](#technical-architecture)
4. [Data Model](#data-model)
5. [TMDB API Integration](#tmdb-api-integration)
6. [Gemini AI Integration](#gemini-ai-integration)
7. [Firebase/Firestore Structure](#firebase-firestore-structure)
8. [State Management (Zustand)](#state-management-zustand)
9. [API Routes](#api-routes)
10. [Component Architecture](#component-architecture)
11. [UI/UX Design](#ui-ux-design)
12. [Authentication & Authorization](#authentication--authorization)
13. [Integration Points](#integration-points)
14. [Advanced Features](#advanced-features)
15. [Validation & Limitations](#validation--limitations)
16. [Error Handling](#error-handling)
17. [Testing Strategy](#testing-strategy)
18. [Implementation Timeline](#implementation-timeline)
19. [Open Questions](#open-questions)

---

## Executive Summary

**Feature Name:** Custom Content Rows

**Description:** Allow authenticated users to create personalized content rows with custom genre combinations, advanced filters, and AI-generated names. Users can display these rows on main, movies, or TV pages.

**Key Value Propositions:**

- Create unique content discovery experiences (e.g., "Musical Anime", "Epic Space Operas")
- Combine genres with AND/OR logic for precise curation
- AI-powered row naming with Gemini API
- Advanced filtering (year range, ratings, certification)
- Full control over row placement and visibility

**Target Users:** Authenticated users only (premium feature)

**Success Metrics:**

- Custom rows created per user
- Custom row views/engagement
- User retention improvement
- Feature adoption rate

---

## Feature Overview

### What Users Can Do

1. **Create Custom Rows**
    - Select multiple genres from TMDB genre lists
    - Choose AND logic (e.g., Animation AND Music) or OR logic (e.g., Action OR Comedy)
    - Apply to movies, TV shows, or both
    - Add advanced filters (year range, min rating, etc.)

2. **Name Their Rows**
    - Manually name rows
    - Use Gemini AI to generate creative names based on genre combinations
    - Edit names anytime

3. **Manage Display**
    - Choose which pages show each row (Main, Movies, TV Shows)
    - Reorder rows via drag-and-drop
    - Enable/disable rows without deleting
    - Preview content before saving

4. **Full CRUD Operations**
    - Create, Read, Update, Delete rows
    - Duplicate existing rows
    - Export/import row configurations (future)

### What Makes This Special

- **Genre AND Logic:** TMDB supports `with_genres=16,10402` for content that has BOTH Animation AND Music
- **Premium Feature:** Authenticated users only - drives sign-ups
- **AI Integration:** Gemini generates clever row names
- **Flexible Display:** Show different rows on different pages

---

## Technical Architecture

### High-Level Flow

```
User Creates Row
    ↓
Select Genres + Logic + Filters
    ↓
Generate/Input Name (optional Gemini AI)
    ↓
Save to Firestore (/users/{userId}/customRows/{rowId})
    ↓
Zustand Store Updates
    ↓
Pages Fetch Custom Rows + Default Rows
    ↓
Render Combined Row List
    ↓
Each Custom Row → TMDB Discover API
    ↓
Display Content with Infinite Scroll
```

### Technology Stack

| Component   | Technology                    | Purpose                      |
| ----------- | ----------------------------- | ---------------------------- |
| Frontend    | Next.js 14, React, TypeScript | UI and routing               |
| State       | Zustand                       | Custom rows state management |
| Backend     | Next.js API Routes            | CRUD operations              |
| Database    | Firebase Firestore            | Row metadata storage         |
| Content API | TMDB Discover API             | Fetch movies/TV by genre     |
| AI          | Google Gemini API             | Row name generation          |
| Styling     | Tailwind CSS                  | UI styling                   |

---

## Data Model

### TypeScript Interface: `CustomRow`

```typescript
// types/customRows.ts

export interface CustomRow {
    // Identity
    id: string // UUID v4
    userId: string // Firebase Auth UID

    // Naming
    name: string // User-facing title (3-50 chars)
    isAIGenerated: boolean // Tracked for analytics

    // Genre Configuration
    genres: number[] // TMDB genre IDs [16, 10402, 35]
    genreLogic: 'AND' | 'OR' // How to combine genres
    mediaType: 'movie' | 'tv' | 'both' // Content type

    // Advanced Filters (all optional)
    filters?: {
        // Year Range
        yearMin?: number // e.g., 2000
        yearMax?: number // e.g., 2024

        // Quality Thresholds
        minRating?: number // TMDB vote_average (0-10)
        minVotes?: number // Minimum vote count (for credibility)

        // Content Rating
        certification?: string // e.g., "PG-13", "TV-14"
        certificationCountry?: string // Default "US"

        // Sorting
        sortBy?: SortOption // See SortOption enum below

        // Language
        originalLanguage?: string // ISO 639-1 code (e.g., "en", "ja")
    }

    // Display Configuration
    displayOn: {
        main: boolean // Show on homepage (/)
        movies: boolean // Show on /movies
        tvShows: boolean // Show on /tv
    }

    // Organization
    order: number // Display order (0-based, lower = higher)
    enabled: boolean // Toggle visibility without deletion

    // Metadata
    createdAt: number // Unix timestamp
    updatedAt: number // Unix timestamp
    lastViewedAt?: number // Track engagement (optional)
    viewCount?: number // Analytics (optional)
}

export type SortOption =
    | 'popularity.desc' // Most popular first
    | 'popularity.asc' // Least popular first
    | 'vote_average.desc' // Highest rated first
    | 'vote_average.asc' // Lowest rated first
    | 'release_date.desc' // Newest first
    | 'release_date.asc' // Oldest first
    | 'revenue.desc' // Highest grossing first (movies only)
    | 'primary_release_date.desc' // Movies: newest release
    | 'first_air_date.desc' // TV: newest air date

export interface CustomRowFormData {
    // Subset of CustomRow for create/update forms
    name: string
    genres: number[]
    genreLogic: 'AND' | 'OR'
    mediaType: 'movie' | 'tv' | 'both'
    filters?: CustomRow['filters']
    displayOn: CustomRow['displayOn']
    enabled: boolean
}

export interface CustomRowPreview {
    // Preview data structure
    rowConfig: CustomRowFormData
    sampleContent: Content[] // First 10-20 items
    totalResults: number
}
```

### Example Data

```json
{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "abc123xyz",
    "name": "Musical Anime Masterpieces",
    "isAIGenerated": true,
    "genres": [16, 10402],
    "genreLogic": "AND",
    "mediaType": "movie",
    "filters": {
        "yearMin": 2010,
        "minRating": 7.5,
        "minVotes": 100,
        "sortBy": "vote_average.desc"
    },
    "displayOn": {
        "main": true,
        "movies": true,
        "tvShows": false
    },
    "order": 0,
    "enabled": true,
    "createdAt": 1704067200000,
    "updatedAt": 1704067200000
}
```

---

## TMDB API Integration

### Genre Discovery Endpoint

TMDB provides `/discover/movie` and `/discover/tv` endpoints with powerful filtering.

#### AND Logic (Comma-Separated)

**Use Case:** Content must have ALL specified genres

**Example:** Animation AND Music (Musical Anime)

```
GET https://api.themoviedb.org/3/discover/movie
  ?api_key=YOUR_KEY
  &with_genres=16,10402
  &sort_by=popularity.desc
```

**Result:** Only movies tagged with BOTH Animation (16) AND Music (10402)

#### OR Logic (Pipe-Separated)

**Use Case:** Content can have ANY of the specified genres

**Example:** Action OR Comedy OR Romance

```
GET https://api.themoviedb.org/3/discover/tv
  ?api_key=YOUR_KEY
  &with_genres=10759|35|10749
  &sort_by=vote_average.desc
```

**Result:** TV shows tagged with Action OR Comedy OR Romance

### Advanced Filter Parameters

```typescript
interface TMDBDiscoverParams {
    // Required
    api_key: string

    // Genre Filtering
    with_genres?: string // "16,10402" or "35|53"
    without_genres?: string // Exclude certain genres

    // Date Filtering
    'primary_release_date.gte'?: string // Movies: "2020-01-01"
    'primary_release_date.lte'?: string // Movies: "2024-12-31"
    'first_air_date.gte'?: string // TV: "2020-01-01"
    'first_air_date.lte'?: string // TV: "2024-12-31"

    // Rating Filtering
    'vote_average.gte'?: number // Min rating (0-10)
    'vote_average.lte'?: number // Max rating (0-10)
    'vote_count.gte'?: number // Min vote count

    // Certification
    certification_country?: string // "US"
    certification?: string // "PG-13"
    'certification.lte'?: string // "PG-13" (includes G, PG, PG-13)

    // Language
    with_original_language?: string // "en", "ja", "ko"

    // Sorting
    sort_by?: string // "popularity.desc", "vote_average.desc"

    // Pagination
    page?: number // 1-500

    // Misc
    include_adult?: boolean // Default false
    language?: string // "en-US"
}
```

### Full URL Construction Example

```typescript
function buildCustomRowURL(row: CustomRow, page: number = 1): string {
    const baseURL =
        row.mediaType === 'movie'
            ? 'https://api.themoviedb.org/3/discover/movie'
            : 'https://api.themoviedb.org/3/discover/tv'

    const params = new URLSearchParams({
        api_key: process.env.TMDB_API_KEY!,
        language: 'en-US',
        page: page.toString(),
        include_adult: 'false',
    })

    // Genre filtering
    const genreString =
        row.genreLogic === 'AND'
            ? row.genres.join(',') // 16,10402
            : row.genres.join('|') // 16|10402
    params.append('with_genres', genreString)

    // Filters
    if (row.filters) {
        if (row.filters.yearMin) {
            const dateKey =
                row.mediaType === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte'
            params.append(dateKey, `${row.filters.yearMin}-01-01`)
        }

        if (row.filters.yearMax) {
            const dateKey =
                row.mediaType === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte'
            params.append(dateKey, `${row.filters.yearMax}-12-31`)
        }

        if (row.filters.minRating) {
            params.append('vote_average.gte', row.filters.minRating.toString())
        }

        if (row.filters.minVotes) {
            params.append('vote_count.gte', row.filters.minVotes.toString())
        }

        if (row.filters.certification) {
            params.append('certification_country', row.filters.certificationCountry || 'US')
            params.append('certification', row.filters.certification)
        }

        if (row.filters.sortBy) {
            params.append('sort_by', row.filters.sortBy)
        } else {
            params.append('sort_by', 'popularity.desc')
        }

        if (row.filters.originalLanguage) {
            params.append('with_original_language', row.filters.originalLanguage)
        }
    } else {
        params.append('sort_by', 'popularity.desc')
    }

    return `${baseURL}?${params.toString()}`
}
```

### Handling "Both" Media Type

When `mediaType === 'both'`, we need to fetch from both endpoints:

```typescript
async function fetchCustomRowContent(row: CustomRow, page: number) {
    if (row.mediaType === 'both') {
        // Fetch from both endpoints
        const [movieResults, tvResults] = await Promise.all([
            fetch(buildCustomRowURL({ ...row, mediaType: 'movie' }, page)),
            fetch(buildCustomRowURL({ ...row, mediaType: 'tv' }, page)),
        ])

        const movies = await movieResults.json()
        const tvShows = await tvResults.json()

        // Merge and sort by popularity
        const combined = [
            ...movies.results.map((m) => ({ ...m, media_type: 'movie' })),
            ...tvShows.results.map((t) => ({ ...t, media_type: 'tv' })),
        ].sort((a, b) => b.popularity - a.popularity)

        return combined.slice(0, 20) // Return top 20
    } else {
        // Single media type
        const response = await fetch(buildCustomRowURL(row, page))
        const data = await response.json()
        return data.results.map((item) => ({
            ...item,
            media_type: row.mediaType,
        }))
    }
}
```

---

## Gemini AI Integration

### Setup

**Install Package:**

```bash
npm install @google/generative-ai
```

**Environment Variable:**

```env
# .env.local
GEMINI_API_KEY=your_gemini_api_key_here
```

**Get API Key:**

1. Visit https://aistudio.google.com/apikey
2. Create new API key
3. Copy to `.env.local`

### Name Generation Implementation

```typescript
// app/api/custom-rows/generate-name/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { MOVIE_GENRES, TV_GENRES } from '../../../../constants/genres'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: NextRequest) {
    try {
        const { genres, genreLogic, mediaType } = await request.json()

        // Validation
        if (!genres || genres.length === 0) {
            return NextResponse.json({ error: 'At least one genre is required' }, { status: 400 })
        }

        // Map genre IDs to names
        const genreList = mediaType === 'tv' ? TV_GENRES : MOVIE_GENRES
        const genreNames = genres
            .map((id) => genreList.find((g) => g.id === id)?.name)
            .filter(Boolean)

        // Build prompt
        const mediaTypeStr =
            mediaType === 'both' ? 'Movies & TV Shows' : mediaType === 'tv' ? 'TV Shows' : 'Movies'

        const logicStr =
            genreLogic === 'AND' ? 'must have ALL of these genres' : 'can have ANY of these genres'

        const prompt = `Generate a creative, catchy name for a ${mediaTypeStr} content row.

Genre Requirements:
- Genres: ${genreNames.join(', ')}
- Logic: Content ${logicStr}

Naming Guidelines:
- Maximum 5 words
- Catchy and memorable
- Accurately reflects the genre combination
- No emojis or special characters
- Capitalize properly (Title Case)

Examples:
- Animation + Music + AND = "Musical Masterpieces"
- Animation + Music + AND = "Animated Symphonies"
- Sci-Fi + Drama + AND = "Thoughtful Future Stories"
- Action + Adventure + AND = "Epic Action Adventures"
- Comedy + Romance + OR = "Love & Laughs"
- Horror + Thriller + AND = "Terrifying Thrillers"

Generate ONE creative name for: ${genreNames.join(' + ')} (${genreLogic})`

        const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
        const result = await model.generateContent(prompt)
        const response = await result.response
        const generatedName = response.text().trim()

        // Clean up response (remove quotes, extra whitespace)
        const cleanName = generatedName
            .replace(/^["']|["']$/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 50) // Enforce max length

        return NextResponse.json({
            name: cleanName,
            genresUsed: genreNames,
        })
    } catch (error) {
        console.error('Gemini API error:', error)

        // Fallback to auto-generated name
        const { genres, genreLogic, mediaType } = await request.json()
        const genreList = mediaType === 'tv' ? TV_GENRES : MOVIE_GENRES
        const genreNames = genres
            .map((id) => genreList.find((g) => g.id === id)?.name)
            .filter(Boolean)

        const fallbackName = genreLogic === 'AND' ? genreNames.join(' & ') : genreNames.join(' or ')

        return NextResponse.json({
            name: fallbackName,
            fallback: true,
            error: 'AI generation failed, using fallback',
        })
    }
}
```

### Rate Limiting

```typescript
// utils/rateLimiter.ts

interface RateLimit {
    count: number
    resetAt: number
}

const rateLimits = new Map<string, RateLimit>()

export function checkRateLimit(userId: string, maxRequests = 10, windowMs = 3600000): boolean {
    const now = Date.now()
    const userLimit = rateLimits.get(userId)

    if (!userLimit || now > userLimit.resetAt) {
        // New window
        rateLimits.set(userId, {
            count: 1,
            resetAt: now + windowMs,
        })
        return true
    }

    if (userLimit.count >= maxRequests) {
        return false // Rate limit exceeded
    }

    userLimit.count++
    return true
}

// In API route:
if (!checkRateLimit(userId, 10, 3600000)) {
    return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in an hour.' },
        { status: 429 }
    )
}
```

---

## Firebase Firestore Structure

### Collection Path

```
/users/{userId}/customRows/{rowId}
```

**Reasoning:**

- User-scoped for privacy and isolation
- Easy querying (all rows for a user)
- Automatic security with userId matching
- Subcollection keeps user document clean

### Document Structure

```typescript
// Firestore document (matches CustomRow interface)
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  userId: "abc123xyz",
  name: "Musical Anime",
  isAIGenerated: true,
  genres: [16, 10402],
  genreLogic: "AND",
  mediaType: "movie",
  filters: {
    yearMin: 2010,
    minRating: 7.5,
    minVotes: 100,
    sortBy: "vote_average.desc"
  },
  displayOn: {
    main: true,
    movies: true,
    tvShows: false
  },
  order: 0,
  enabled: true,
  createdAt: 1704067200000,
  updatedAt: 1704067200000,
  viewCount: 42
}
```

### Security Rules

```javascript
// firestore.rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Custom rows - user can only access their own
    match /users/{userId}/customRows/{rowId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId
        && request.resource.data.userId == userId  // Prevent userId spoofing
        && request.resource.data.genres.size() >= 1  // At least one genre
        && request.resource.data.genres.size() <= 5  // Max 5 genres
        && request.resource.data.name.size() >= 3    // Min 3 chars
        && request.resource.data.name.size() <= 50;  // Max 50 chars
    }

    // Count enforcement - max 10 rows per user
    match /users/{userId} {
      match /customRows/{rowId} {
        allow create: if request.auth != null
          && request.auth.uid == userId
          && getRowCount(userId) < 10;
      }
    }
  }

  function getRowCount(userId) {
    return get(/databases/$(database)/documents/users/$(userId)).data.customRowCount;
  }
}
```

### Firestore Operations

```typescript
// utils/firestore/customRows.ts

import { db } from '../firebase'
import {
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore'
import { CustomRow } from '../../types/customRows'

export async function createCustomRow(
    userId: string,
    rowData: Omit<CustomRow, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
    const rowId = crypto.randomUUID()
    const rowRef = doc(db, 'users', userId, 'customRows', rowId)

    await setDoc(rowRef, {
        ...rowData,
        id: rowId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
    })

    return rowId
}

export async function getUserCustomRows(userId: string): Promise<CustomRow[]> {
    const rowsRef = collection(db, 'users', userId, 'customRows')
    const q = query(rowsRef, orderBy('order', 'asc'))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) => doc.data() as CustomRow)
}

export async function updateCustomRow(
    userId: string,
    rowId: string,
    updates: Partial<CustomRow>
): Promise<void> {
    const rowRef = doc(db, 'users', userId, 'customRows', rowId)

    await updateDoc(rowRef, {
        ...updates,
        updatedAt: Date.now(),
    })
}

export async function deleteCustomRow(userId: string, rowId: string): Promise<void> {
    const rowRef = doc(db, 'users', userId, 'customRows', rowId)
    await deleteDoc(rowRef)
}

export async function incrementViewCount(userId: string, rowId: string): Promise<void> {
    const rowRef = doc(db, 'users', userId, 'customRows', rowId)

    await updateDoc(rowRef, {
        viewCount: increment(1),
        lastViewedAt: Date.now(),
    })
}
```

---

## State Management (Zustand)

### Store Implementation

```typescript
// stores/customRowsStore.ts

import { create } from 'zustand'
import { CustomRow, CustomRowFormData } from '../types/customRows'
import { Content } from '../typings'
import {
    getUserCustomRows,
    createCustomRow,
    updateCustomRow,
    deleteCustomRow,
} from '../utils/firestore/customRows'

interface CustomRowsState {
    // State
    rows: CustomRow[]
    loading: boolean
    error: string | null

    // CRUD Operations
    fetchRows: (userId: string) => Promise<void>
    createRow: (userId: string, rowData: CustomRowFormData) => Promise<string>
    updateRow: (userId: string, rowId: string, updates: Partial<CustomRow>) => Promise<void>
    deleteRow: (userId: string, rowId: string) => Promise<void>
    reorderRows: (userId: string, rowIds: string[]) => Promise<void>
    toggleRow: (userId: string, rowId: string) => Promise<void>

    // Content Operations
    fetchRowContent: (rowId: string, page: number) => Promise<Content[]>

    // AI Operations
    generateName: (genres: number[], genreLogic: 'AND' | 'OR', mediaType: string) => Promise<string>

    // Utilities
    getRowsByPage: (page: 'main' | 'movies' | 'tvShows') => CustomRow[]
    clearError: () => void
    reset: () => void
}

export const useCustomRowsStore = create<CustomRowsState>((set, get) => ({
    rows: [],
    loading: false,
    error: null,

    fetchRows: async (userId: string) => {
        set({ loading: true, error: null })
        try {
            const rows = await getUserCustomRows(userId)
            set({ rows, loading: false })
        } catch (error) {
            console.error('Error fetching custom rows:', error)
            set({
                error: 'Failed to load custom rows',
                loading: false,
            })
        }
    },

    createRow: async (userId: string, rowData: CustomRowFormData) => {
        set({ loading: true, error: null })
        try {
            // Validation: max 10 rows
            const currentRows = get().rows
            if (currentRows.length >= 10) {
                throw new Error('Maximum 10 custom rows allowed')
            }

            // Assign next order
            const maxOrder = currentRows.reduce((max, row) => Math.max(max, row.order), -1)

            const newRow: Omit<CustomRow, 'id' | 'createdAt' | 'updatedAt'> = {
                userId,
                ...rowData,
                order: maxOrder + 1,
                isAIGenerated: false,
                viewCount: 0,
            }

            const rowId = await createCustomRow(userId, newRow)

            // Update local state
            set((state) => ({
                rows: [
                    ...state.rows,
                    { ...newRow, id: rowId, createdAt: Date.now(), updatedAt: Date.now() },
                ],
                loading: false,
            }))

            return rowId
        } catch (error) {
            console.error('Error creating custom row:', error)
            set({
                error: error.message || 'Failed to create custom row',
                loading: false,
            })
            throw error
        }
    },

    updateRow: async (userId: string, rowId: string, updates: Partial<CustomRow>) => {
        set({ loading: true, error: null })
        try {
            await updateCustomRow(userId, rowId, updates)

            set((state) => ({
                rows: state.rows.map((row) =>
                    row.id === rowId ? { ...row, ...updates, updatedAt: Date.now() } : row
                ),
                loading: false,
            }))
        } catch (error) {
            console.error('Error updating custom row:', error)
            set({
                error: 'Failed to update custom row',
                loading: false,
            })
            throw error
        }
    },

    deleteRow: async (userId: string, rowId: string) => {
        set({ loading: true, error: null })
        try {
            await deleteCustomRow(userId, rowId)

            set((state) => ({
                rows: state.rows.filter((row) => row.id !== rowId),
                loading: false,
            }))
        } catch (error) {
            console.error('Error deleting custom row:', error)
            set({
                error: 'Failed to delete custom row',
                loading: false,
            })
            throw error
        }
    },

    reorderRows: async (userId: string, rowIds: string[]) => {
        set({ loading: true, error: null })
        try {
            // Update order for each row
            const updates = rowIds.map((rowId, index) =>
                updateCustomRow(userId, rowId, { order: index })
            )
            await Promise.all(updates)

            // Update local state
            set((state) => ({
                rows: state.rows
                    .map((row) => ({
                        ...row,
                        order: rowIds.indexOf(row.id),
                    }))
                    .sort((a, b) => a.order - b.order),
                loading: false,
            }))
        } catch (error) {
            console.error('Error reordering rows:', error)
            set({
                error: 'Failed to reorder rows',
                loading: false,
            })
            throw error
        }
    },

    toggleRow: async (userId: string, rowId: string) => {
        const row = get().rows.find((r) => r.id === rowId)
        if (!row) return

        await get().updateRow(userId, rowId, { enabled: !row.enabled })
    },

    fetchRowContent: async (rowId: string, page: number) => {
        try {
            const response = await fetch(`/api/custom-rows/${rowId}/content?page=${page}`)
            if (!response.ok) throw new Error('Failed to fetch content')

            const data = await response.json()
            return data.results
        } catch (error) {
            console.error('Error fetching row content:', error)
            throw error
        }
    },

    generateName: async (genres: number[], genreLogic: 'AND' | 'OR', mediaType: string) => {
        try {
            const response = await fetch('/api/custom-rows/generate-name', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ genres, genreLogic, mediaType }),
            })

            if (!response.ok) throw new Error('Failed to generate name')

            const data = await response.json()
            return data.name
        } catch (error) {
            console.error('Error generating name:', error)
            throw error
        }
    },

    getRowsByPage: (page: 'main' | 'movies' | 'tvShows') => {
        const pageKey = page === 'main' ? 'main' : page === 'movies' ? 'movies' : 'tvShows'
        return get()
            .rows.filter((row) => row.enabled && row.displayOn[pageKey])
            .sort((a, b) => a.order - b.order)
    },

    clearError: () => set({ error: null }),

    reset: () => set({ rows: [], loading: false, error: null }),
}))
```

---

## API Routes

### 1. GET `/api/custom-rows`

**Purpose:** Fetch all custom rows for authenticated user

```typescript
// app/api/custom-rows/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getUserCustomRows } from '../../../utils/firestore/customRows'

export async function GET(request: NextRequest) {
    try {
        // Get user ID from session/auth
        const userId = await getUserIdFromRequest(request)

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const rows = await getUserCustomRows(userId)

        return NextResponse.json({ rows })
    } catch (error) {
        console.error('Error fetching custom rows:', error)
        return NextResponse.json({ error: 'Failed to fetch custom rows' }, { status: 500 })
    }
}
```

### 2. POST `/api/custom-rows`

**Purpose:** Create new custom row

```typescript
export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request)

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const rowData = await request.json()

        // Validation
        if (!rowData.name || rowData.name.length < 3 || rowData.name.length > 50) {
            return NextResponse.json({ error: 'Row name must be 3-50 characters' }, { status: 400 })
        }

        if (!rowData.genres || rowData.genres.length === 0) {
            return NextResponse.json({ error: 'At least one genre is required' }, { status: 400 })
        }

        if (rowData.genres.length > 5) {
            return NextResponse.json({ error: 'Maximum 5 genres allowed' }, { status: 400 })
        }

        // Check row count limit
        const existingRows = await getUserCustomRows(userId)
        if (existingRows.length >= 10) {
            return NextResponse.json({ error: 'Maximum 10 custom rows allowed' }, { status: 400 })
        }

        const rowId = await createCustomRow(userId, {
            ...rowData,
            userId,
        })

        return NextResponse.json(
            {
                success: true,
                rowId,
            },
            { status: 201 }
        )
    } catch (error) {
        console.error('Error creating custom row:', error)
        return NextResponse.json({ error: 'Failed to create custom row' }, { status: 500 })
    }
}
```

### 3. PUT `/api/custom-rows/[id]`

**Purpose:** Update existing row

```typescript
// app/api/custom-rows/[id]/route.ts

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const rowId = params.id
        const updates = await request.json()

        // Validation (similar to POST)

        await updateCustomRow(userId, rowId, updates)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error updating custom row:', error)
        return NextResponse.json({ error: 'Failed to update custom row' }, { status: 500 })
    }
}
```

### 4. DELETE `/api/custom-rows/[id]`

**Purpose:** Delete row

```typescript
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const rowId = params.id

        await deleteCustomRow(userId, rowId)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error deleting custom row:', error)
        return NextResponse.json({ error: 'Failed to delete custom row' }, { status: 500 })
    }
}
```

### 5. GET `/api/custom-rows/[id]/content`

**Purpose:** Fetch TMDB content for row

```typescript
// app/api/custom-rows/[id]/content/route.ts

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    try {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const rowId = params.id
        const searchParams = request.nextUrl.searchParams
        const page = parseInt(searchParams.get('page') || '1', 10)

        // Get row config from Firestore
        const row = await getCustomRow(userId, rowId)

        if (!row) {
            return NextResponse.json({ error: 'Row not found' }, { status: 404 })
        }

        // Build TMDB URL
        const tmdbURL = buildCustomRowURL(row, page)

        // Fetch from TMDB
        const response = await fetch(tmdbURL)
        const data = await response.json()

        // Add media_type to results
        const enrichedResults = data.results.map((item) => ({
            ...item,
            media_type: row.mediaType === 'both' ? item.media_type || 'movie' : row.mediaType,
        }))

        return NextResponse.json({
            ...data,
            results: enrichedResults,
        })
    } catch (error) {
        console.error('Error fetching row content:', error)
        return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
    }
}
```

### 6. POST `/api/custom-rows/preview`

**Purpose:** Preview content before creating row

```typescript
// app/api/custom-rows/preview/route.ts

export async function POST(request: NextRequest) {
    try {
        const userId = await getUserIdFromRequest(request)
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const rowConfig = await request.json()

        // Build temporary row object
        const tempRow: CustomRow = {
            id: 'preview',
            userId,
            ...rowConfig,
            order: 0,
            enabled: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        }

        // Fetch first page
        const tmdbURL = buildCustomRowURL(tempRow, 1)
        const response = await fetch(tmdbURL)
        const data = await response.json()

        return NextResponse.json({
            sampleContent: data.results.slice(0, 10),
            totalResults: data.total_results,
        })
    } catch (error) {
        console.error('Error generating preview:', error)
        return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 })
    }
}
```

---

## Component Architecture

### Component Tree

```
app/my-rows/page.tsx                   # Management page
├── components/customRows/
│   ├── CustomRowCard.tsx              # Individual row display
│   ├── RowEditorModal.tsx             # Create/edit modal
│   ├── GenreMultiSelect.tsx           # Genre selection UI
│   ├── FilterPanel.tsx                # Advanced filters
│   ├── RowPreview.tsx                 # Content preview
│   ├── EmptyState.tsx                 # No rows placeholder
│   └── PremiumFeaturePrompt.tsx       # Guest user CTA
│
components/content/
├── Row.tsx (MODIFIED)                 # Support custom rows
└── MyListsDropdown.tsx (MODIFIED)     # Add "My Rows" link

app/page.tsx (MODIFIED)                # Render custom rows
app/movies/page.tsx (MODIFIED)         # Render custom rows
app/tv/page.tsx (MODIFIED)             # Render custom rows
```

### Component Details

#### 1. `app/my-rows/page.tsx`

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '../../stores/sessionStore'
import { useCustomRowsStore } from '../../stores/customRowsStore'
import CustomRowCard from '../../components/customRows/CustomRowCard'
import EmptyState from '../../components/customRows/EmptyState'
import PremiumFeaturePrompt from '../../components/customRows/PremiumFeaturePrompt'
import { PlusIcon } from '@heroicons/react/24/outline'

export default function MyRowsPage() {
  const router = useRouter()
  const { sessionType, userId } = useSessionStore()
  const { rows, loading, error, fetchRows } = useCustomRowsStore()
  const [showEditor, setShowEditor] = useState(false)

  useEffect(() => {
    if (sessionType === 'authenticated' && userId) {
      fetchRows(userId)
    }
  }, [sessionType, userId])

  // Guest users see premium prompt
  if (sessionType === 'guest') {
    return <PremiumFeaturePrompt />
  }

  // Loading state
  if (loading && rows.length === 0) {
    return <div>Loading your custom rows...</div>
  }

  return (
    <div className="min-h-screen bg-[#141414] pt-20 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              My Custom Rows
            </h1>
            <p className="text-gray-400">
              Create personalized content rows with custom genres and filters
            </p>
          </div>

          <button
            onClick={() => setShowEditor(true)}
            disabled={rows.length >= 10}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition"
          >
            <PlusIcon className="h-5 w-5" />
            Create Row
          </button>
        </div>

        {/* Row limit warning */}
        {rows.length >= 10 && (
          <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-600/40 rounded-lg">
            <p className="text-yellow-400">
              You've reached the maximum of 10 custom rows. Delete a row to create new ones.
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-600/40 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Rows list */}
        {rows.length === 0 ? (
          <EmptyState onCreateClick={() => setShowEditor(true)} />
        ) : (
          <div className="space-y-6">
            {rows.map(row => (
              <CustomRowCard key={row.id} row={row} />
            ))}
          </div>
        )}

        {/* Editor Modal */}
        {showEditor && (
          <RowEditorModal
            onClose={() => setShowEditor(false)}
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  )
}
```

#### 2. `components/customRows/CustomRowCard.tsx`

```typescript
'use client'

import { useState } from 'react'
import { CustomRow } from '../../types/customRows'
import { useCustomRowsStore } from '../../stores/customRowsStore'
import { useSessionStore } from '../../stores/sessionStore'
import { MOVIE_GENRES, TV_GENRES } from '../../constants/genres'
import {
  PencilIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'

interface Props {
  row: CustomRow
}

export default function CustomRowCard({ row }: Props) {
  const { userId } = useSessionStore()
  const { deleteRow, toggleRow, updateRow } = useCustomRowsStore()
  const [showPreview, setShowPreview] = useState(false)

  const genreList = row.mediaType === 'tv' ? TV_GENRES : MOVIE_GENRES
  const genreNames = row.genres
    .map(id => genreList.find(g => g.id === id)?.name)
    .filter(Boolean)

  const displayPages = Object.entries(row.displayOn)
    .filter(([_, enabled]) => enabled)
    .map(([page]) => page === 'main' ? 'Home' : page === 'movies' ? 'Movies' : 'TV Shows')

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this row?')) return
    await deleteRow(userId!, row.id)
  }

  const handleToggle = async () => {
    await toggleRow(userId!, row.id)
  }

  return (
    <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-6 hover:border-red-600/40 transition">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-semibold text-white">{row.name}</h3>
            {row.isAIGenerated && (
              <span className="text-xs px-2 py-1 bg-purple-600/20 text-purple-400 rounded">
                AI Generated
              </span>
            )}
            {!row.enabled && (
              <span className="text-xs px-2 py-1 bg-gray-600/20 text-gray-400 rounded">
                Disabled
              </span>
            )}
          </div>

          {/* Genre tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {genreNames.map(name => (
              <span key={name} className="text-sm px-3 py-1 bg-red-600/20 text-red-400 rounded-full">
                {name}
              </span>
            ))}
            <span className="text-sm px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full">
              {row.genreLogic}
            </span>
          </div>

          {/* Display info */}
          <p className="text-sm text-gray-400">
            Showing on: <span className="text-white">{displayPages.join(', ')}</span>
          </p>

          {/* Filters */}
          {row.filters && (
            <div className="mt-2 text-xs text-gray-500">
              {row.filters.yearMin && `${row.filters.yearMin}+`}
              {row.filters.minRating && ` • ${row.filters.minRating}★+`}
              {row.filters.certification && ` • ${row.filters.certification}`}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleToggle}
            className="p-2 hover:bg-white/10 rounded-lg transition"
            title={row.enabled ? 'Disable row' : 'Enable row'}
          >
            {row.enabled ? (
              <EyeIcon className="h-5 w-5 text-green-400" />
            ) : (
              <EyeSlashIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>

          <button
            onClick={() => {/* Open editor */}}
            className="p-2 hover:bg-white/10 rounded-lg transition"
            title="Edit row"
          >
            <PencilIcon className="h-5 w-5 text-blue-400" />
          </button>

          <button
            onClick={handleDelete}
            className="p-2 hover:bg-white/10 rounded-lg transition"
            title="Delete row"
          >
            <TrashIcon className="h-5 w-5 text-red-400" />
          </button>
        </div>
      </div>

      {/* Preview thumbnails (collapsed by default) */}
      <button
        onClick={() => setShowPreview(!showPreview)}
        className="text-sm text-blue-400 hover:text-blue-300"
      >
        {showPreview ? 'Hide' : 'Show'} Preview
      </button>

      {showPreview && (
        <RowPreview rowId={row.id} />
      )}
    </div>
  )
}
```

#### 3. `components/customRows/RowEditorModal.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { CustomRow, CustomRowFormData } from '../../types/customRows'
import { MOVIE_GENRES, TV_GENRES } from '../../constants/genres'
import { useCustomRowsStore } from '../../stores/customRowsStore'
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline'
import GenreMultiSelect from './GenreMultiSelect'
import FilterPanel from './FilterPanel'
import RowPreview from './RowPreview'

interface Props {
  row?: CustomRow  // If editing existing row
  onClose: () => void
  onSave: (data: CustomRowFormData) => Promise<void>
}

export default function RowEditorModal({ row, onClose, onSave }: Props) {
  const { generateName } = useCustomRowsStore()

  const [formData, setFormData] = useState<CustomRowFormData>({
    name: row?.name || '',
    genres: row?.genres || [],
    genreLogic: row?.genreLogic || 'AND',
    mediaType: row?.mediaType || 'movie',
    filters: row?.filters || {},
    displayOn: row?.displayOn || {
      main: true,
      movies: false,
      tvShows: false
    },
    enabled: row?.enabled ?? true
  })

  const [generatingName, setGeneratingName] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const handleGenerateName = async () => {
    if (formData.genres.length === 0) {
      alert('Please select at least one genre first')
      return
    }

    setGeneratingName(true)
    try {
      const name = await generateName(
        formData.genres,
        formData.genreLogic,
        formData.mediaType
      )
      setFormData(prev => ({ ...prev, name }))
    } catch (error) {
      console.error('Failed to generate name:', error)
    } finally {
      setGeneratingName(false)
    }
  }

  const handleSubmit = async () => {
    // Validation
    if (formData.name.length < 3) {
      alert('Row name must be at least 3 characters')
      return
    }

    if (formData.genres.length === 0) {
      alert('Please select at least one genre')
      return
    }

    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Failed to save row:', error)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[#1a1a1a] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#1a1a1a] border-b border-gray-800 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">
            {row ? 'Edit Custom Row' : 'Create Custom Row'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <XMarkIcon className="h-6 w-6 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Row Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Row Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Musical Anime"
                maxLength={50}
                className="flex-1 px-4 py-2 bg-[#141414] border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-600"
              />
              <button
                onClick={handleGenerateName}
                disabled={generatingName || formData.genres.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition"
              >
                <SparklesIcon className="h-5 w-5" />
                {generatingName ? 'Generating...' : 'AI Generate'}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {formData.name.length}/50 characters
            </p>
          </div>

          {/* Media Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Media Type
            </label>
            <div className="flex gap-4">
              {['movie', 'tv', 'both'].map(type => (
                <button
                  key={type}
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    mediaType: type as any,
                    genres: [] // Reset genres on type change
                  }))}
                  className={`px-6 py-2 rounded-lg transition ${
                    formData.mediaType === type
                      ? 'bg-red-600 text-white'
                      : 'bg-[#141414] text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {type === 'both' ? 'Movies & TV' : type === 'tv' ? 'TV Shows' : 'Movies'}
                </button>
              ))}
            </div>
          </div>

          {/* Genre Selection */}
          <GenreMultiSelect
            mediaType={formData.mediaType}
            selectedGenres={formData.genres}
            onChange={genres => setFormData(prev => ({ ...prev, genres }))}
          />

          {/* Genre Logic */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Genre Match Logic
            </label>
            <div className="flex gap-4">
              <button
                onClick={() => setFormData(prev => ({ ...prev, genreLogic: 'AND' }))}
                className={`flex-1 px-6 py-3 rounded-lg transition ${
                  formData.genreLogic === 'AND'
                    ? 'bg-red-600 text-white'
                    : 'bg-[#141414] text-gray-400 hover:bg-white/10'
                }`}
              >
                <div className="font-semibold">Must have ALL</div>
                <div className="text-xs mt-1">Content has all selected genres</div>
              </button>

              <button
                onClick={() => setFormData(prev => ({ ...prev, genreLogic: 'OR' }))}
                className={`flex-1 px-6 py-3 rounded-lg transition ${
                  formData.genreLogic === 'OR'
                    ? 'bg-red-600 text-white'
                    : 'bg-[#141414] text-gray-400 hover:bg-white/10'
                }`}
              >
                <div className="font-semibold">Can have ANY</div>
                <div className="text-xs mt-1">Content has at least one genre</div>
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          <FilterPanel
            filters={formData.filters || {}}
            mediaType={formData.mediaType}
            onChange={filters => setFormData(prev => ({ ...prev, filters }))}
          />

          {/* Display Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Display On
            </label>
            <div className="space-y-2">
              {[
                { key: 'main', label: 'Home Page' },
                { key: 'movies', label: 'Movies Page' },
                { key: 'tvShows', label: 'TV Shows Page' }
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.displayOn[key]}
                    onChange={e => setFormData(prev => ({
                      ...prev,
                      displayOn: {
                        ...prev.displayOn,
                        [key]: e.target.checked
                      }
                    }))}
                    className="w-5 h-5 text-red-600 bg-[#141414] border-gray-700 rounded focus:ring-red-600"
                  />
                  <span className="text-white">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Preview */}
          {formData.genres.length > 0 && (
            <div>
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="text-blue-400 hover:text-blue-300 text-sm mb-2"
              >
                {showPreview ? 'Hide' : 'Show'} Content Preview
              </button>

              {showPreview && (
                <RowPreview rowConfig={formData} />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#1a1a1a] border-t border-gray-800 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={formData.name.length < 3 || formData.genres.length === 0}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition"
          >
            {row ? 'Update Row' : 'Create Row'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

## UI/UX Design

### Page Layouts

#### My Rows Management Page

```
┌─────────────────────────────────────────────────────────────┐
│  Header (Navigation)                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  My Custom Rows                           [+ Create Row]   │
│  Create personalized content rows with custom genres       │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Musical Anime Masterpieces     👁️ ✏️ 🗑️    AI Generated│ │
│  │ Animation • Music • AND                                │ │
│  │ Showing on: Home, Movies                               │ │
│  │ 2010+ • 7.5★+ • PG-13                                  │ │
│  │ [▼ Show Preview]                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ Epic Space Operas              👁️ ✏️ 🗑️               │ │
│  │ Sci-Fi • Drama • AND                                   │ │
│  │ Showing on: Home, TV Shows                             │ │
│  │ 2000+ • 8.0★+                                          │ │
│  │ [▼ Show Preview]                                       │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │ 🎬 Create Your First Custom Row                        │ │
│  │ Combine genres and filters to discover unique content │ │
│  │                    [Get Started]                       │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Row Editor Modal

```
┌─────────────────────────────────────────────────────────────┐
│  Create Custom Row                                    ✕     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Row Name                                                   │
│  [Musical Anime Masterpieces_____________] [✨ AI Generate] │
│  42/50 characters                                           │
│                                                             │
│  Media Type                                                 │
│  [Movies] [TV Shows] [●Movies & TV]                         │
│                                                             │
│  Select Genres (max 5)                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [☑ Animation]  [☑ Music]    [ ] Action             │   │
│  │ [ ] Comedy     [ ] Drama    [ ] Sci-Fi             │   │
│  │ [ ] Horror     [ ] Romance  [ ] Thriller           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Genre Match Logic                                          │
│  [●Must have ALL]                  [ Can have ANY]          │
│   Content has all selected genres   Content has ≥1 genre   │
│                                                             │
│  ▼ Advanced Filters (optional)                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Year Range:    [2000] ──────────────── [2024]      │   │
│  │ Min Rating:    [7.5] ★                             │   │
│  │ Min Votes:     [100]                               │   │
│  │ Certification: [PG-13 ▼]                           │   │
│  │ Sort By:       [Highest Rated ▼]                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Display On                                                 │
│  [☑] Home Page                                              │
│  [☑] Movies Page                                            │
│  [ ] TV Shows Page                                          │
│                                                             │
│  ▼ Content Preview (14 results found)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ [Thumbnail][Thumbnail][Thumbnail][Thumbnail]...     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                     [Cancel] [Create Row]   │
└─────────────────────────────────────────────────────────────┘
```

### Navigation Integration

**Updated MyListsDropdown:**

```typescript
// components/content/MyListsDropdown.tsx

{/* Existing items */}
<Link href="/watchlists">Watchlists</Link>
<Link href="/liked">Liked Content</Link>
<Link href="/hidden">Hidden Content</Link>

{/* NEW: My Rows (auth only) */}
{sessionType === 'authenticated' && (
  <>
    <div className="border-t border-gray-700 my-2" />
    <Link href="/my-rows">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SparklesIcon className="h-4 w-4" />
          <span>My Rows</span>
        </div>
        <span className="text-xs px-2 py-1 bg-red-600 text-white rounded">
          PRO
        </span>
      </div>
    </Link>
  </>
)}
```

### Home Page Integration

```typescript
// app/page.tsx

const customRows = useCustomRowsStore(state =>
  state.getRowsByPage('main')
)

return (
  <>
    <Hero />

    {/* Default rows */}
    <Row title="Trending Now" url="/api/movies/trending" />

    {/* Custom rows - INSERTED AFTER TRENDING */}
    {customRows.map((row, index) => (
      <Row
        key={row.id}
        title={row.name}
        url={`/api/custom-rows/${row.id}/content`}
        isCustomRow={true}
        customRowOrder={index}
      />
    ))}

    {/* More default rows */}
    <Row title="Popular Movies" url="/api/movies/popular" />
    <Row title="Top Rated" url="/api/movies/top-rated" />
  </>
)
```

---

## Authentication & Authorization

### Auth Guards

```typescript
// middleware.ts (or in page component)

export function requireAuth(sessionType: SessionType) {
  if (sessionType === 'guest') {
    return {
      redirect: '/auth/signin',
      message: 'Please sign in to access custom rows'
    }
  }
  return { allowed: true }
}

// In /my-rows/page.tsx
const { sessionType } = useSessionStore()

if (sessionType === 'guest') {
  return <PremiumFeaturePrompt />
}
```

### Premium Feature Prompt

```typescript
// components/customRows/PremiumFeaturePrompt.tsx

export default function PremiumFeaturePrompt() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center px-4">
      <div className="max-w-2xl text-center">
        <SparklesIcon className="h-20 w-20 text-red-600 mx-auto mb-6" />

        <h1 className="text-4xl font-bold text-white mb-4">
          Custom Rows - Premium Feature
        </h1>

        <p className="text-xl text-gray-300 mb-8">
          Create personalized content rows with custom genre combinations,
          AI-powered naming, and advanced filters.
        </p>

        <div className="bg-[#1a1a1a] rounded-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-white mb-4">
            What You'll Get:
          </h2>

          <ul className="text-left space-y-3 text-gray-300">
            <li className="flex items-start gap-3">
              <CheckIcon className="h-6 w-6 text-green-500 mt-0.5" />
              <span>Create up to 10 custom content rows</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckIcon className="h-6 w-6 text-green-500 mt-0.5" />
              <span>Combine genres with AND/OR logic (e.g., "Musical Anime")</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckIcon className="h-6 w-6 text-green-500 mt-0.5" />
              <span>AI-powered row naming with Gemini</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckIcon className="h-6 w-6 text-green-500 mt-0.5" />
              <span>Advanced filters (year range, ratings, certification)</span>
            </li>
            <li className="flex items-start gap-3">
              <CheckIcon className="h-6 w-6 text-green-500 mt-0.5" />
              <span>Display rows on Home, Movies, or TV pages</span>
            </li>
          </ul>
        </div>

        <button
          onClick={() => router.push('/auth/signin')}
          className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white text-lg font-semibold rounded-lg transition"
        >
          Sign Up to Unlock
        </button>

        <p className="mt-4 text-sm text-gray-500">
          Already have an account? <Link href="/auth/signin" className="text-red-500 hover:underline">Sign In</Link>
        </p>
      </div>
    </div>
  )
}
```

---

## Integration Points

### 1. Modified Row Component

```typescript
// components/content/Row.tsx

interface RowProps {
  title: string
  url: string
  isCustomRow?: boolean       // NEW
  customRowOrder?: number     // NEW
}

export default function Row({ title, url, isCustomRow, customRowOrder }: RowProps) {
  // ... existing code

  // Add custom row indicator
  return (
    <div className="row">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold">{title}</h2>

        {isCustomRow && (
          <span className="text-xs px-2 py-1 bg-purple-600/20 text-purple-400 rounded">
            Custom
          </span>
        )}
      </div>

      {/* ... rest of row */}
    </div>
  )
}
```

### 2. Page Integration Pattern

```typescript
// app/page.tsx, app/movies/page.tsx, app/tv/page.tsx

'use client'

import { useEffect } from 'react'
import { useCustomRowsStore } from '../stores/customRowsStore'
import { useSessionStore } from '../stores/sessionStore'
import Row from '../components/content/Row'

export default function HomePage() {
  const { sessionType, userId } = useSessionStore()
  const { rows, fetchRows, getRowsByPage } = useCustomRowsStore()

  // Fetch custom rows on mount
  useEffect(() => {
    if (sessionType === 'authenticated' && userId) {
      fetchRows(userId)
    }
  }, [sessionType, userId, fetchRows])

  // Get rows for this page
  const customRows = getRowsByPage('main')

  return (
    <>
      <Hero />

      {/* Default rows */}
      <Row title="Trending Now" url="/api/movies/trending" />

      {/* Custom rows */}
      {customRows.map((row, index) => (
        <Row
          key={row.id}
          title={row.name}
          url={`/api/custom-rows/${row.id}/content`}
          isCustomRow={true}
          customRowOrder={index}
        />
      ))}

      {/* More default rows */}
      <Row title="Popular" url="/api/movies/popular" />
    </>
  )
}
```

---

## Advanced Features

### 1. Drag-and-Drop Reordering

**Library:** `@dnd-kit/core`, `@dnd-kit/sortable`

```typescript
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

function handleDragEnd(event) {
    const { active, over } = event

    if (active.id !== over.id) {
        const oldIndex = rows.findIndex((r) => r.id === active.id)
        const newIndex = rows.findIndex((r) => r.id === over.id)

        const newOrder = arrayMove(rows, oldIndex, newIndex)
        const rowIds = newOrder.map((r) => r.id)

        reorderRows(userId, rowIds)
    }
}
```

### 2. Row Templates

```typescript
const ROW_TEMPLATES: CustomRowFormData[] = [
  {
    name: "Classic Westerns",
    genres: [37],
    genreLogic: 'AND',
    mediaType: 'movie',
    filters: { yearMax: 1980 },
    displayOn: { main: true, movies: true, tvShows: false },
    enabled: true
  },
  {
    name: "Anime Action",
    genres: [16, 28],
    genreLogic: 'AND',
    mediaType: 'tv',
    filters: { minRating: 7.0 },
    displayOn: { main: true, movies: false, tvShows: true },
    enabled: true
  }
  // ... more templates
]

// In editor:
<select onChange={e => applyTemplate(templates[e.target.value])}>
  <option>Choose a template...</option>
  {ROW_TEMPLATES.map((t, i) => (
    <option key={i} value={i}>{t.name}</option>
  ))}
</select>
```

### 3. Row Analytics

```typescript
interface CustomRowAnalytics {
    rowId: string
    views: number
    clicks: number
    avgTimeSpent: number
    topContent: string[] // Most clicked content IDs
    lastViewed: number
}

// Track in Row component:
useEffect(() => {
    if (isCustomRow) {
        trackRowView(rowId)
    }
}, [isCustomRow, rowId])
```

### 4. Share Row Feature

```typescript
// Generate shareable link
const shareableLink = `${APP_URL}/shared-rows/${row.id}`

// Public endpoint for viewing shared rows (read-only)
// GET /api/shared-rows/[id]

export async function GET(req, { params }) {
    const row = await getSharedRow(params.id)

    if (!row || !row.isPublic) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ row })
}
```

### 5. Duplicate Row

```typescript
async function duplicateRow(userId: string, rowId: string) {
    const original = rows.find((r) => r.id === rowId)
    if (!original) return

    const duplicate: CustomRowFormData = {
        ...original,
        name: `${original.name} (Copy)`,
    }

    await createRow(userId, duplicate)
}
```

---

## Validation & Limitations

### Client-Side Validation

```typescript
function validateCustomRow(data: CustomRowFormData): string[] {
    const errors: string[] = []

    // Name validation
    if (!data.name || data.name.trim().length < 3) {
        errors.push('Row name must be at least 3 characters')
    }
    if (data.name.length > 50) {
        errors.push('Row name must be 50 characters or less')
    }

    // Genre validation
    if (data.genres.length === 0) {
        errors.push('At least one genre is required')
    }
    if (data.genres.length > 5) {
        errors.push('Maximum 5 genres allowed')
    }

    // Display validation
    const displayCount = Object.values(data.displayOn).filter(Boolean).length
    if (displayCount === 0) {
        errors.push('Row must be displayed on at least one page')
    }

    // Filter validation
    if (data.filters) {
        if (data.filters.yearMin && data.filters.yearMax) {
            if (data.filters.yearMin > data.filters.yearMax) {
                errors.push('Year min cannot be greater than year max')
            }
        }

        if (data.filters.minRating && (data.filters.minRating < 0 || data.filters.minRating > 10)) {
            errors.push('Rating must be between 0 and 10')
        }
    }

    return errors
}
```

### Limitations Summary

| Limit                   | Value      | Rationale                          |
| ----------------------- | ---------- | ---------------------------------- |
| Max rows per user       | 10         | Prevent spam, maintain performance |
| Max genres per row      | 5          | API complexity, UX clarity         |
| Row name length         | 3-50 chars | Readability                        |
| AI generations per hour | 10         | Rate limiting, cost control        |
| Preview items           | 20         | Performance                        |
| Empty row warning       | <5 items   | User feedback                      |

### Empty Row Detection

```typescript
async function checkRowViability(rowConfig: CustomRowFormData): Promise<{
    isViable: boolean
    itemCount: number
    message?: string
}> {
    const preview = await fetchPreview(rowConfig)

    if (preview.totalResults === 0) {
        return {
            isViable: false,
            itemCount: 0,
            message: 'No content found with these filters. Try adjusting your criteria.',
        }
    }

    if (preview.totalResults < 5) {
        return {
            isViable: true,
            itemCount: preview.totalResults,
            message: `Only ${preview.totalResults} items found. Consider broadening your filters.`,
        }
    }

    return {
        isViable: true,
        itemCount: preview.totalResults,
    }
}
```

---

## Error Handling

### Error Types & Strategies

```typescript
enum CustomRowErrorType {
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    API_ERROR = 'API_ERROR',
    FIREBASE_ERROR = 'FIREBASE_ERROR',
    TMDB_ERROR = 'TMDB_ERROR',
    GEMINI_ERROR = 'GEMINI_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
}

interface CustomRowError {
    type: CustomRowErrorType
    message: string
    details?: any
    retryable: boolean
    fallback?: () => void
}

function handleCustomRowError(error: CustomRowError) {
    switch (error.type) {
        case CustomRowErrorType.VALIDATION_ERROR:
            // Show inline form errors
            showFormErrors(error.details)
            break

        case CustomRowErrorType.QUOTA_EXCEEDED:
            // Show upgrade prompt
            showToast('error', 'Maximum 10 rows reached. Delete a row to create new ones.')
            break

        case CustomRowErrorType.GEMINI_ERROR:
            // Fall back to auto-generated name
            const fallbackName = generateFallbackName(genres, logic)
            setFormData((prev) => ({ ...prev, name: fallbackName }))
            showToast('warning', 'AI generation failed. Using fallback name.')
            break

        case CustomRowErrorType.TMDB_ERROR:
            // Show cached content or error state
            if (hasCachedContent) {
                showCachedContent()
                showToast('warning', 'Showing cached content. TMDB API unavailable.')
            } else {
                showErrorState('Unable to load content. Try again later.')
            }
            break

        case CustomRowErrorType.FIREBASE_ERROR:
            // Retry with exponential backoff
            if (error.retryable) {
                retryWithBackoff(error.fallback)
            } else {
                showToast('error', 'Failed to save. Please try again.')
            }
            break

        default:
            showToast('error', 'An unexpected error occurred')
    }
}
```

### Retry Logic

```typescript
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
): Promise<T> {
    let lastError: any

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn()
        } catch (error) {
            lastError = error

            if (i < maxRetries - 1) {
                const delay = baseDelay * Math.pow(2, i)
                await new Promise((resolve) => setTimeout(resolve, delay))
            }
        }
    }

    throw lastError
}

// Usage:
try {
    await retryWithBackoff(() => createCustomRow(userId, rowData))
} catch (error) {
    handleError(error)
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// stores/customRowsStore.test.ts

describe('CustomRowsStore', () => {
    it('should create a custom row', async () => {
        const { createRow } = useCustomRowsStore.getState()

        const rowData: CustomRowFormData = {
            name: 'Test Row',
            genres: [16, 10402],
            genreLogic: 'AND',
            mediaType: 'movie',
            displayOn: { main: true, movies: false, tvShows: false },
            enabled: true,
        }

        const rowId = await createRow('testUserId', rowData)
        expect(rowId).toBeTruthy()

        const { rows } = useCustomRowsStore.getState()
        expect(rows).toHaveLength(1)
        expect(rows[0].name).toBe('Test Row')
    })

    it('should enforce max 10 rows limit', async () => {
        // ... create 10 rows

        await expect(createRow('testUserId', rowData)).rejects.toThrow(
            'Maximum 10 custom rows allowed'
        )
    })

    it('should generate correct TMDB URL for AND logic', () => {
        const row: CustomRow = {
            genres: [16, 10402],
            genreLogic: 'AND',
            mediaType: 'movie',
            // ... other fields
        }

        const url = buildCustomRowURL(row, 1)
        expect(url).toContain('with_genres=16,10402')
    })
})
```

### Integration Tests

```typescript
// __tests__/api/custom-rows.test.ts

describe('Custom Rows API', () => {
    it('should create row via API', async () => {
        const response = await fetch('/api/custom-rows', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: 'Test Row',
                genres: [16],
                genreLogic: 'AND',
                mediaType: 'movie',
                displayOn: { main: true, movies: false, tvShows: false },
                enabled: true,
            }),
        })

        expect(response.status).toBe(201)
        const data = await response.json()
        expect(data.rowId).toBeTruthy()
    })

    it('should fetch row content from TMDB', async () => {
        const rowId = 'test-row-id'

        const response = await fetch(`/api/custom-rows/${rowId}/content?page=1`)
        expect(response.status).toBe(200)

        const data = await response.json()
        expect(data.results).toBeInstanceOf(Array)
    })
})
```

### E2E Tests

```typescript
// e2e/custom-rows.spec.ts

test('create custom row flow', async ({ page }) => {
    // Sign in
    await page.goto('/auth/signin')
    // ... sign in steps

    // Navigate to My Rows
    await page.goto('/my-rows')

    // Click create
    await page.click('button:has-text("Create Row")')

    // Fill form
    await page.fill('input[name="name"]', 'Musical Anime')
    await page.click('button:has-text("Movies")')
    await page.click('label:has-text("Animation")')
    await page.click('label:has-text("Music")')
    await page.click('button:has-text("Must have ALL")')

    // Submit
    await page.click('button:has-text("Create Row")')

    // Verify
    await expect(page.locator('text=Musical Anime')).toBeVisible()
})
```

---

## Implementation Timeline

### Phase 1: Foundation (Days 1-2)

**Day 1: Data & Backend**

- [ ] Create `types/customRows.ts`
- [ ] Set up Firebase collection structure
- [ ] Implement Firestore utility functions
- [ ] Create API routes (`/api/custom-rows/*`)
- [ ] Write API tests

**Day 2: State Management**

- [ ] Build `stores/customRowsStore.ts`
- [ ] Implement CRUD operations
- [ ] Add error handling
- [ ] Write store unit tests

### Phase 2: Core UI (Days 3-4)

**Day 3: Management Page**

- [ ] Create `/app/my-rows/page.tsx`
- [ ] Build `CustomRowCard` component
- [ ] Build `EmptyState` component
- [ ] Build `PremiumFeaturePrompt` component
- [ ] Add auth guards

**Day 4: Row Editor**

- [ ] Build `RowEditorModal` component
- [ ] Build `GenreMultiSelect` component
- [ ] Add validation logic
- [ ] Style with Tailwind

### Phase 3: TMDB Integration (Day 5)

- [ ] Implement `buildCustomRowURL` utility
- [ ] Create `/api/custom-rows/[id]/content` endpoint
- [ ] Handle AND/OR logic
- [ ] Handle "both" media type
- [ ] Add caching layer
- [ ] Build `RowPreview` component

### Phase 4: Display Integration (Day 6)

- [ ] Modify `Row` component for custom rows
- [ ] Update `app/page.tsx` (main)
- [ ] Update `app/movies/page.tsx`
- [ ] Update `app/tv/page.tsx`
- [ ] Update `MyListsDropdown` navigation
- [ ] Test infinite scrolling with custom rows

### Phase 5: Gemini AI (Day 7)

- [ ] Install Gemini SDK
- [ ] Create `/api/custom-rows/generate-name` endpoint
- [ ] Add rate limiting
- [ ] Add fallback logic
- [ ] Integrate into editor modal
- [ ] Test AI generation

### Phase 6: Polish & Advanced Features (Day 8)

- [ ] Build `FilterPanel` component
- [ ] Add loading states
- [ ] Add error messages
- [ ] Implement row reordering (drag-drop)
- [ ] Add row toggle (enable/disable)
- [ ] Responsive design
- [ ] Write E2E tests

### Phase 7: Testing & Deployment (Day 9)

- [ ] Run full test suite
- [ ] Fix bugs
- [ ] Performance optimization
- [ ] Security audit
- [ ] Deploy to production

---

## Open Questions

### 1. Gemini API Key

**Question:** Do you have a Gemini API key, or should I add instructions to obtain one?

**Options:**

- A) I have a key (provide it)
- B) Add setup instructions to docs
- C) Skip AI generation for now

### 2. Row Limits

**Question:** Is 10 custom rows per user a reasonable limit?

**Considerations:**

- Storage costs (Firestore)
- UI clutter
- User value

**Alternative:** Start with 5, allow upgrades?

### 3. Implementation Priority

**Question:** Which phase should I prioritize?

**Options:**

- A) Build foundation → basic UI → iterate
- B) Build complete editor first (with preview)
- C) Focus on TMDB integration first

### 4. Guest User Experience

**Question:** Should guest users:

- A) See "Sign up for custom rows" prompt only
- B) Be able to create rows (stored in localStorage, lost on logout)
- C) Hide feature entirely for guests

**Recommendation:** Option A (auth-gated feature drives sign-ups)

### 5. Advanced Features Priority

**Question:** Which advanced features should be included in v1?

**Must-Have:**

- [ ] Basic CRUD
- [ ] Genre selection
- [ ] AND/OR logic
- [ ] Display on pages

**Nice-to-Have:**

- [ ] AI name generation
- [ ] Advanced filters
- [ ] Row reordering
- [ ] Preview

**v2:**

- [ ] Row templates
- [ ] Sharing
- [ ] Analytics

### 6. Empty Row Handling

**Question:** If a row returns 0 results, should we:

- A) Block creation with error message
- B) Allow creation but warn user
- C) Auto-disable the row until filters change

**Recommendation:** Option B (allow with warning)

---

## Next Steps

**Recommended Approach:**

1. **Review this document thoroughly**
2. **Answer open questions**
3. **Start with Phase 1** (Foundation)
4. **Iterate based on feedback**

**Ready to Begin?**

Let me know:

- Which questions you want to address first
- If you want me to start implementing (which phase?)
- Any modifications to the plan

This is a comprehensive, production-ready design. Let's build something amazing! 🚀
