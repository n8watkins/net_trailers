# API Documentation

NetTrailer's internal API routes proxy requests to The Movie Database (TMDB) API with additional features like caching, filtering, and child safety controls.

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Search API](#search-api)
- [Content APIs](#content-apis)
- [Movie APIs](#movie-apis)
- [TV Show APIs](#tv-show-apis)
- [Genre APIs](#genre-apis)
- [Caching](#caching)
- [Child Safety Mode](#child-safety-mode)
- [Error Handling](#error-handling)

## Base URL

All API routes are prefixed with `/api`:

```
Local Development: http://localhost:3000/api
Production: https://yourapp.vercel.app/api
```

## Authentication

API routes are **server-side only** and use the `TMDB_API_KEY` environment variable. Client applications don't need to provide authentication - the server handles it.

## Search API

### Search Movies and TV Shows

Search for movies and TV shows with optional child safety filtering.

**Endpoint:** `GET /api/search`

**Query Parameters:**

| Parameter         | Type   | Required | Default | Description                                    |
| ----------------- | ------ | -------- | ------- | ---------------------------------------------- |
| `query`           | string | Yes      | -       | Search query (min 1 character)                 |
| `page`            | string | No       | "1"     | Page number for pagination                     |
| `childSafetyMode` | string | No       | "false" | Enable child safety filtering ("true"/"false") |

**Example Request:**

```typescript
const response = await fetch('/api/search?query=inception&page=1&childSafetyMode=true')
const data = await response.json()
```

**Success Response (200 OK):**

```json
{
    "results": [
        {
            "id": 27205,
            "media_type": "movie",
            "title": "Inception",
            "poster_path": "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
            "vote_average": 8.4
        }
    ],
    "total_results": 42,
    "total_pages": 3,
    "page": 1,
    "child_safety_enabled": true,
    "hidden_count": 5
}
```

**Error Responses:**

- `400 Bad Request` - Missing or invalid query parameter
- `405 Method Not Allowed` - Non-GET request
- `500 Internal Server Error` - API configuration error

**Features:**

- Filters out person results (only movies and TV shows)
- 10-minute server-side cache
- Child safety filtering removes adult content and mature TV shows
- Returns `hidden_count` when child safety is enabled

---

## Content APIs

### Get Content Details

Fetch detailed information about a specific movie or TV show.

**Endpoint:** `GET /api/content/[id]`

**Query Parameters:**

| Parameter         | Type   | Required | Default | Description                   |
| ----------------- | ------ | -------- | ------- | ----------------------------- |
| `id`              | string | Yes      | -       | TMDB content ID               |
| `childSafetyMode` | string | No       | "false" | Enable child safety filtering |

**Example Request:**

```typescript
const response = await fetch('/api/content/550?childSafetyMode=true')
const data = await response.json()
```

**Success Response (200 OK):**

```json
{
    "id": 550,
    "title": "Fight Club",
    "media_type": "movie",
    "overview": "A ticking-time-bomb insomniac...",
    "poster_path": "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    "backdrop_path": "/fCayJrkfRaCRCTh8GqN30f8oyQF.jpg",
    "vote_average": 8.4,
    "release_date": "1999-10-15",
    "runtime": 139,
    "genres": [{ "id": 18, "name": "Drama" }]
}
```

**Error Responses:**

- `400 Bad Request` - Missing or invalid content ID
- `403 Forbidden` - Content blocked by child safety mode
- `404 Not Found` - Content not found in TMDB
- `405 Method Not Allowed` - Non-GET request
- `500 Internal Server Error` - API configuration error

**Features:**

- Automatically detects if content is a movie or TV show
- 10-minute server-side cache (separate cache for child safety mode)
- Blocks adult movies and mature TV shows in child safety mode
- Returns helpful error messages with `reason` field for blocked content

---

## Movie APIs

### Get Trending Movies

Fetch currently trending movies.

**Endpoint:** `GET /api/movies/trending`

**Query Parameters:**

| Parameter         | Type   | Required | Default | Description                   |
| ----------------- | ------ | -------- | ------- | ----------------------------- |
| `childSafetyMode` | string | No       | "false" | Enable child safety filtering |

**Example Request:**

```typescript
const response = await fetch('/api/movies/trending?childSafetyMode=true')
const data = await response.json()
```

**Success Response (200 OK):**

```json
{
    "results": [
        {
            "id": 299534,
            "title": "Avengers: Endgame",
            "media_type": "movie",
            "poster_path": "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
            "vote_average": 8.3
        }
    ],
    "page": 1,
    "total_pages": 500,
    "total_results": 10000
}
```

---

### Get Top-Rated Movies

Fetch top-rated movies of all time.

**Endpoint:** `GET /api/movies/top-rated`

**Query Parameters:**

| Parameter         | Type   | Required | Default | Description                   |
| ----------------- | ------ | -------- | ------- | ----------------------------- |
| `childSafetyMode` | string | No       | "false" | Enable child safety filtering |

**Features:**

- Server-side caching (10 minutes)
- Filters adult content when child safety is enabled
- Returns movies sorted by vote average (highest first)

---

### Get Movie Details

Fetch detailed information about a specific movie including trailers.

**Endpoint:** `GET /api/movies/details/[id]`

**Query Parameters:**

| Parameter         | Type   | Required | Default | Description                   |
| ----------------- | ------ | -------- | ------- | ----------------------------- |
| `id`              | string | Yes      | -       | TMDB movie ID                 |
| `childSafetyMode` | string | No       | "false" | Enable child safety filtering |

**Success Response (200 OK):**

```json
{
    "id": 550,
    "title": "Fight Club",
    "overview": "...",
    "runtime": 139,
    "release_date": "1999-10-15",
    "videos": {
        "results": [
            {
                "key": "SUXWAEX2jlg",
                "site": "YouTube",
                "type": "Trailer"
            }
        ]
    }
}
```

---

### Get Movies by Genre

Fetch movies filtered by genre.

**Endpoint:** `GET /api/movies/genre/[genre]`

**Query Parameters:**

| Parameter         | Type   | Required | Default | Description                   |
| ----------------- | ------ | -------- | ------- | ----------------------------- |
| `genre`           | string | Yes      | -       | TMDB genre ID                 |
| `page`            | string | No       | "1"     | Page number                   |
| `childSafetyMode` | string | No       | "false" | Enable child safety filtering |

---

## TV Show APIs

### Get Trending TV Shows

Fetch currently trending TV shows.

**Endpoint:** `GET /api/tv/trending`

**Query Parameters:**

| Parameter         | Type   | Required | Default | Description                   |
| ----------------- | ------ | -------- | ------- | ----------------------------- |
| `childSafetyMode` | string | No       | "false" | Enable child safety filtering |

**Features:**

- Filters mature TV shows (TV-MA, etc.) in child safety mode
- Fetches content ratings from TMDB
- Server-side caching

---

### Get Top-Rated TV Shows

Fetch top-rated TV shows of all time.

**Endpoint:** `GET /api/tv/top-rated`

**Query Parameters:**

| Parameter         | Type   | Required | Default | Description                   |
| ----------------- | ------ | -------- | ------- | ----------------------------- |
| `childSafetyMode` | string | No       | "false" | Enable child safety filtering |

---

## Genre APIs

### Get Content by Genre and Type

Fetch movies or TV shows for a specific genre with advanced filtering.

**Endpoint:** `GET /api/genres/[type]/[id]`

**Path Parameters:**

- `type` - Media type: "movie" or "tv"
- `id` - TMDB genre ID

**Query Parameters:**

| Parameter              | Type   | Required | Default           | Description                   |
| ---------------------- | ------ | -------- | ----------------- | ----------------------------- |
| `page`                 | string | No       | "1"               | Page number                   |
| `sort_by`              | string | No       | "popularity.desc" | Sort order                    |
| `vote_average_gte`     | string | No       | -                 | Minimum rating filter         |
| `primary_release_year` | string | No       | -                 | Year filter (movies)          |
| `first_air_date_year`  | string | No       | -                 | Year filter (TV shows)        |
| `childSafetyMode`      | string | No       | "false"           | Enable child safety filtering |

**Sort Options:**

- `popularity.desc` - Most popular first
- `popularity.asc` - Least popular first
- `vote_average.desc` - Highest rated first
- `vote_average.asc` - Lowest rated first
- `release_date.desc` - Newest first
- `release_date.asc` - Oldest first

**Example Request:**

```typescript
const response = await fetch(
    '/api/genres/movie/28?page=1&sort_by=vote_average.desc&vote_average_gte=7.0'
)
const data = await response.json()
```

**Success Response (200 OK):**

```json
{
    "results": [
        {
            "id": 299534,
            "title": "Avengers: Endgame",
            "vote_average": 8.3,
            "genre_ids": [28, 12, 878]
        }
    ],
    "page": 1,
    "total_pages": 100,
    "total_results": 2000
}
```

---

## Caching

All API routes implement server-side caching for improved performance and reduced TMDB API calls.

### Cache Strategy

- **Cache Duration:** 10 minutes (600 seconds)
- **Cache Keys:** Include all query parameters (including `childSafetyMode`)
- **Cache Invalidation:** Automatic after TTL expires
- **Cache Storage:** In-memory (resets on server restart)

### Cache Keys Format

```
search-[query]-page-[page]-childSafe-[true/false]
content-[id]-childSafe-[true/false]
trending-movies-childSafe-[true/false]
```

### Cache Modules

- `searchCache` - Search results
- `tmdbContentCache` - Content details
- `genreCache` - Genre listings

Located in `utils/apiCache.ts`

---

## Child Safety Mode

Child Safety Mode filters content based on MPAA movie ratings and TV content ratings.

### Filtering Rules

**Movies:**

- Blocks all movies with `adult: true` flag
- Can be extended to filter by MPAA rating (G, PG, PG-13, R, NC-17)

**TV Shows:**

- Fetches content ratings from TMDB
- Blocks shows rated: TV-MA, TV-14 (configurable)
- Supports region-specific ratings (US, GB, etc.)

### Implementation

1. **Client-side:** UI indicates when child safety is active
2. **Server-side:** API routes filter results before sending to client
3. **Cache separation:** Child-safe and normal results cached separately

### Blocked Content Response

When content is blocked, API returns 403:

```json
{
    "error": "Content blocked by child safety mode",
    "reason": "adult_content"
}
```

---

## Error Handling

All APIs follow consistent error response format:

### Error Response Format

```json
{
    "error": "Human-readable error message",
    "reason": "error_code" // Optional
}
```

### Common HTTP Status Codes

| Code | Meaning               | Common Causes                                       |
| ---- | --------------------- | --------------------------------------------------- |
| 400  | Bad Request           | Missing required parameters, invalid format         |
| 403  | Forbidden             | Content blocked by child safety mode                |
| 404  | Not Found             | Content ID doesn't exist in TMDB                    |
| 405  | Method Not Allowed    | Using wrong HTTP method (e.g., POST instead of GET) |
| 500  | Internal Server Error | TMDB API key not configured, TMDB API error         |

### Error Handling Best Practices

```typescript
try {
    const response = await fetch('/api/search?query=inception')

    if (!response.ok) {
        const error = await response.json()
        console.error('API Error:', error.error)
        // Handle specific errors
        if (response.status === 403) {
            // Content blocked by child safety
        }
    }

    const data = await response.json()
    // Use data
} catch (error) {
    console.error('Network error:', error)
}
```

---

## Rate Limiting

### TMDB Rate Limits

- **40 requests per second** per IP address
- Our caching strategy significantly reduces API calls
- Cache hit rate typically > 80% for popular content

### Best Practices

1. Use cached results when possible
2. Avoid rapid sequential requests
3. Implement client-side debouncing for search (already implemented: 300ms)

---

## TMDB API Integration

All routes proxy to TMDB API v3:

**Base URL:** `https://api.themoviedb.org/3`

**Authentication:** Server-side using `TMDB_API_KEY` environment variable

**Documentation:** [TMDB API Docs](https://developers.themoviedb.org/3)

### TMDB Endpoints Used

- `/search/multi` - Multi-search (movies, TV, people)
- `/movie/{movie_id}` - Movie details
- `/tv/{tv_id}` - TV show details
- `/movie/trending` - Trending movies
- `/tv/trending` - Trending TV shows
- `/movie/top_rated` - Top-rated movies
- `/tv/top_rated` - Top-rated TV shows
- `/discover/movie` - Discover movies by genre
- `/discover/tv` - Discover TV shows by genre
- `/movie/{movie_id}/content_ratings` - Movie ratings
- `/tv/{tv_id}/content_ratings` - TV show ratings

---

## Example Usage

### Search with Child Safety

```typescript
async function searchMovies(query: string, childSafe: boolean) {
    const params = new URLSearchParams({
        query,
        childSafetyMode: childSafe.toString(),
    })

    const response = await fetch(`/api/search?${params}`)

    if (!response.ok) {
        throw new Error('Search failed')
    }

    const data = await response.json()
    return data.results
}
```

### Get Content with Error Handling

```typescript
async function getContent(id: number) {
    try {
        const response = await fetch(`/api/content/${id}`)

        if (response.status === 403) {
            return { blocked: true, reason: 'child_safety' }
        }

        if (response.status === 404) {
            return { blocked: true, reason: 'not_found' }
        }

        return await response.json()
    } catch (error) {
        console.error('Failed to fetch content:', error)
        return null
    }
}
```

---

## Notes

- All timestamps in responses are in ISO 8601 format
- Image paths are relative - prepend with `https://image.tmdb.org/t/p/w500`
- Content IDs are TMDB IDs (not internal database IDs)
- API routes are stateless - no session management required
