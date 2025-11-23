#!/usr/bin/env npx tsx
/**
 * Refresh Seed Data Script
 *
 * Fetches fresh data from TMDB API to update the hardcoded seed data.
 * This ensures image paths and other metadata stay current.
 *
 * Usage: npx tsx scripts/refresh-seed-data.ts
 *
 * Or add to package.json:
 *   "refresh:seed": "npx tsx scripts/refresh-seed-data.ts"
 */

import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const TMDB_API_KEY = process.env.TMDB_API_KEY

if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not found in .env.local')
    process.exit(1)
}

interface TMDBMovie {
    id: number
    title: string
    original_title: string
    overview: string
    poster_path: string | null
    backdrop_path: string | null
    release_date: string
    vote_average: number
    vote_count: number
    genre_ids: number[]
    original_language: string
    popularity: number
}

interface TMDBTVShow {
    id: number
    name: string
    original_name: string
    overview: string
    poster_path: string | null
    backdrop_path: string | null
    first_air_date: string
    vote_average: number
    vote_count: number
    genre_ids: number[]
    origin_country: string[]
    original_language: string
    popularity: number
}

async function fetchMovieDetails(id: number): Promise<TMDBMovie | null> {
    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/movie/${id}?api_key=${TMDB_API_KEY}`
        )
        if (!response.ok) {
            console.warn(`  ⚠️  Movie ${id} not found (${response.status})`)
            return null
        }
        const data = await response.json()
        return {
            id: data.id,
            title: data.title,
            original_title: data.original_title,
            overview: data.overview,
            poster_path: data.poster_path,
            backdrop_path: data.backdrop_path,
            release_date: data.release_date,
            vote_average: data.vote_average,
            vote_count: data.vote_count,
            genre_ids: data.genres?.map((g: { id: number }) => g.id) || [],
            original_language: data.original_language,
            popularity: data.popularity,
        }
    } catch (error) {
        console.error(`  ❌ Error fetching movie ${id}:`, error)
        return null
    }
}

async function fetchTVShowDetails(id: number): Promise<TMDBTVShow | null> {
    try {
        const response = await fetch(
            `https://api.themoviedb.org/3/tv/${id}?api_key=${TMDB_API_KEY}`
        )
        if (!response.ok) {
            console.warn(`  ⚠️  TV show ${id} not found (${response.status})`)
            return null
        }
        const data = await response.json()
        return {
            id: data.id,
            name: data.name,
            original_name: data.original_name,
            overview: data.overview,
            poster_path: data.poster_path,
            backdrop_path: data.backdrop_path,
            first_air_date: data.first_air_date,
            vote_average: data.vote_average,
            vote_count: data.vote_count,
            genre_ids: data.genres?.map((g: { id: number }) => g.id) || [],
            origin_country: data.origin_country || [],
            original_language: data.original_language,
            popularity: data.popularity,
        }
    } catch (error) {
        console.error(`  ❌ Error fetching TV show ${id}:`, error)
        return null
    }
}

// Movie IDs to refresh (from seedData.ts)
const MOVIE_IDS = [
    550, // Fight Club
    680, // Pulp Fiction
    13, // Forrest Gump
    155, // The Dark Knight
    238, // The Godfather
    278, // The Shawshank Redemption
    27205, // Inception
    122, // The Lord of the Rings: The Return of the King
    603, // The Matrix
    157336, // Interstellar
    240, // The Godfather Part II
    424, // Schindler's List
    129, // Spirited Away
    496243, // Parasite
    497, // The Green Mile
    769, // GoodFellas
    429, // The Good, the Bad and the Ugly
    346, // Seven
    637, // Life Is Beautiful
    372058, // Your Name
    539, // Psycho
    372754, // Bohemian Rhapsody
    299536, // Avengers: Infinity War
    1891, // The Empire Strikes Back
    12477, // Grave of the Fireflies
]

// TV Show IDs to refresh (from seedData.ts)
const TV_SHOW_IDS = [
    1396, // Breaking Bad
    1399, // Game of Thrones
    60574, // Peaky Blinders
    66732, // Stranger Things
    84958, // Loki
    71912, // The Witcher
    63174, // Lucifer
    1402, // The Walking Dead
    62286, // Fear the Walking Dead
    82856, // The Mandalorian
    76331, // Succession
    94605, // Arcane
    93405, // Squid Game
    100088, // The Last of Us
    60735, // The Flash
    85271, // WandaVision
    88396, // The Falcon and the Winter Soldier
    60625, // Rick and Morty
    46952, // The Blacklist
    95396, // Severance
    97186, // House of the Dragon
    1418, // The Big Bang Theory
    456, // The Simpsons
    2190, // South Park
    60059, // Better Call Saul
]

async function refreshSeedData() {
    console.log('🔄 Refreshing seed data from TMDB...\n')

    // Fetch all movies
    console.log('📽️  Fetching movies...')
    const movies: TMDBMovie[] = []
    for (const id of MOVIE_IDS) {
        const movie = await fetchMovieDetails(id)
        if (movie) {
            movies.push(movie)
            console.log(`  ✓ ${movie.title}`)
        }
        // Rate limiting - TMDB allows 40 requests/second
        await new Promise((r) => setTimeout(r, 50))
    }

    // Fetch all TV shows
    console.log('\n📺 Fetching TV shows...')
    const tvShows: TMDBTVShow[] = []
    for (const id of TV_SHOW_IDS) {
        const show = await fetchTVShowDetails(id)
        if (show) {
            tvShows.push(show)
            console.log(`  ✓ ${show.name}`)
        }
        await new Promise((r) => setTimeout(r, 50))
    }

    // Generate the updated seedData.ts content
    console.log('\n📝 Generating updated seed data...')

    const movieEntries = movies
        .map(
            (m) => `    {
        id: ${m.id},
        title: '${escapeString(m.title)}',
        original_title: '${escapeString(m.original_title)}',
        overview: '${escapeString(m.overview)}',
        poster_path: ${m.poster_path ? `'${m.poster_path}'` : 'null'},
        backdrop_path: ${m.backdrop_path ? `'${m.backdrop_path}'` : 'null'},
        release_date: '${m.release_date || ''}',
        vote_average: ${m.vote_average},
        vote_count: ${m.vote_count},
        genre_ids: [${m.genre_ids.join(', ')}],
        media_type: 'movie',
        origin_country: ['US'],
        original_language: '${m.original_language}',
        popularity: ${m.popularity.toFixed(1)},
    }`
        )
        .join(',\n')

    const tvEntries = tvShows
        .map(
            (t) => `    {
        id: ${t.id},
        name: '${escapeString(t.name)}',
        original_name: '${escapeString(t.original_name)}',
        overview: '${escapeString(t.overview)}',
        poster_path: ${t.poster_path ? `'${t.poster_path}'` : 'null'},
        backdrop_path: ${t.backdrop_path ? `'${t.backdrop_path}'` : 'null'},
        first_air_date: '${t.first_air_date || ''}',
        vote_average: ${t.vote_average},
        vote_count: ${t.vote_count},
        genre_ids: [${t.genre_ids.join(', ')}],
        media_type: 'tv',
        origin_country: [${t.origin_country.map((c) => `'${c}'`).join(', ')}],
        original_language: '${t.original_language}',
        popularity: ${t.popularity.toFixed(1)},
    }`
        )
        .join(',\n')

    // Read existing file to preserve the rest of the content
    const seedDataPath = path.join(process.cwd(), 'utils', 'seedData.ts')
    const existingContent = fs.readFileSync(seedDataPath, 'utf-8')

    // Find where sampleTVShows array ends - look for the closing bracket followed by other code
    // The pattern is: closing ] of the array, then some code that uses the arrays
    const tvShowsEndPattern = /export const sampleTVShows: TVShow\[\] = \[[\s\S]*?\n\]\n/
    const tvShowsMatch = existingContent.match(tvShowsEndPattern)

    if (!tvShowsMatch) {
        console.error('❌ Could not find sampleTVShows array in seedData.ts')
        process.exit(1)
    }

    // Get everything after the sampleTVShows array
    const tvShowsEndIndex = existingContent.indexOf(tvShowsMatch[0]) + tvShowsMatch[0].length
    const afterTVShows = existingContent.substring(tvShowsEndIndex)

    const newContent = `/**
 * Seed Data Utility
 *
 * Populates the app with sample data for testing:
 * - Liked movies and TV shows
 * - Hidden movies and TV shows
 * - Custom collections
 * - Watch history
 * - Notifications
 *
 * Last refreshed: ${new Date().toISOString().split('T')[0]}
 * Run 'npm run refresh:seed' to update with latest TMDB data
 */

import { Movie, TVShow, Content } from '../typings'
import type { CreateNotificationRequest } from '../types/notifications'
import type { ForumCategory, Thread, Poll } from '../types/forum'
import { Timestamp } from 'firebase/firestore'

// Sample movies for seeding (${movies.length} popular movies)
export const sampleMovies: Movie[] = [
${movieEntries}
]

// Sample TV shows for seeding (${tvShows.length} popular TV shows)
export const sampleTVShows: TVShow[] = [
${tvEntries}
]
${afterTVShows}`

    // Write the updated file
    fs.writeFileSync(seedDataPath, newContent)

    console.log(`\n✅ Seed data refreshed!`)
    console.log(`   - ${movies.length} movies updated`)
    console.log(`   - ${tvShows.length} TV shows updated`)
    console.log(`\n📁 Updated: utils/seedData.ts`)
}

function escapeString(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}

// Run the script
refreshSeedData().catch(console.error)
