/**
 * Script to fetch correct image paths from TMDB for broken images
 */

import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const API_KEY = process.env.TMDB_API_KEY

if (!API_KEY) {
    console.error('❌ TMDB_API_KEY not found in .env.local')
    process.exit(1)
}

// Content IDs with failed backdrops
const brokenBackdrops = {
    movies: [680, 13, 155, 372058, 11216, 120, 539, 429],
    tv: [1668, 1434, 1622, 46952, 4057, 84773],
}

interface TMDBMovie {
    id: number
    title: string
    poster_path: string | null
    backdrop_path: string | null
}

interface TMDBTVShow {
    id: number
    name: string
    poster_path: string | null
    backdrop_path: string | null
}

async function fetchMovieDetails(id: number): Promise<TMDBMovie | null> {
    try {
        const response = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}`)
        if (!response.ok) {
            console.error(`Failed to fetch movie ${id}: ${response.status}`)
            return null
        }
        return await response.json()
    } catch (error) {
        console.error(`Error fetching movie ${id}:`, error)
        return null
    }
}

async function fetchTVDetails(id: number): Promise<TMDBTVShow | null> {
    try {
        const response = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}`)
        if (!response.ok) {
            console.error(`Failed to fetch TV show ${id}: ${response.status}`)
            return null
        }
        return await response.json()
    } catch (error) {
        console.error(`Error fetching TV show ${id}:`, error)
        return null
    }
}

async function fixImages() {
    console.log('🔧 Fetching correct image paths from TMDB...\n')

    console.log('📺 Movies:\n')
    for (const id of brokenBackdrops.movies) {
        const movie = await fetchMovieDetails(id)
        if (movie) {
            console.log(`[${id}] ${movie.title}`)
            console.log(`  Poster:   ${movie.poster_path || 'null'}`)
            console.log(`  Backdrop: ${movie.backdrop_path || 'null'}`)
            console.log()
        }
        // Rate limiting - wait 250ms between requests
        await new Promise((resolve) => setTimeout(resolve, 250))
    }

    console.log('\n📺 TV Shows:\n')
    for (const id of brokenBackdrops.tv) {
        const show = await fetchTVDetails(id)
        if (show) {
            console.log(`[${id}] ${show.name}`)
            console.log(`  Poster:   ${show.poster_path || 'null'}`)
            console.log(`  Backdrop: ${show.backdrop_path || 'null'}`)
            console.log()
        }
        // Rate limiting - wait 250ms between requests
        await new Promise((resolve) => setTimeout(resolve, 250))
    }
}

fixImages().catch(console.error)
