/**
 * Script to check all seed data images and find broken ones
 */

import dotenv from 'dotenv'
import path from 'path'
import { sampleMovies, sampleTVShows } from '../utils/seedData'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const API_KEY = process.env.TMDB_API_KEY

if (!API_KEY) {
    console.error('❌ TMDB_API_KEY not found in .env.local')
    process.exit(1)
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
            console.error(`❌ Failed to fetch movie ${id}: ${response.status}`)
            return null
        }
        return await response.json()
    } catch (error) {
        console.error(`❌ Error fetching movie ${id}:`, error)
        return null
    }
}

async function fetchTVDetails(id: number): Promise<TMDBTVShow | null> {
    try {
        const response = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}`)
        if (!response.ok) {
            console.error(`❌ Failed to fetch TV show ${id}: ${response.status}`)
            return null
        }
        return await response.json()
    } catch (error) {
        console.error(`❌ Error fetching TV show ${id}:`, error)
        return null
    }
}

async function checkAllImages() {
    console.log('🔍 Checking all seed data images...\n')

    const brokenMovies: number[] = []
    const brokenTV: number[] = []

    console.log('📽️  Checking Movies:\n')
    for (const movie of sampleMovies) {
        const tmdbData = await fetchMovieDetails(movie.id)
        if (!tmdbData) {
            brokenMovies.push(movie.id)
            continue
        }

        const posterMismatch = movie.poster_path !== tmdbData.poster_path
        const backdropMismatch = movie.backdrop_path !== tmdbData.backdrop_path

        if (posterMismatch || backdropMismatch) {
            console.log(`⚠️  [${movie.id}] ${movie.title}`)
            if (posterMismatch) {
                console.log(`   Poster:   ${movie.poster_path} → ${tmdbData.poster_path}`)
            }
            if (backdropMismatch) {
                console.log(`   Backdrop: ${movie.backdrop_path} → ${tmdbData.backdrop_path}`)
            }
            console.log()
            brokenMovies.push(movie.id)
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 250))
    }

    console.log('\n📺 Checking TV Shows:\n')
    for (const show of sampleTVShows) {
        const tmdbData = await fetchTVDetails(show.id)
        if (!tmdbData) {
            brokenTV.push(show.id)
            continue
        }

        const posterMismatch = show.poster_path !== tmdbData.poster_path
        const backdropMismatch = show.backdrop_path !== tmdbData.backdrop_path

        if (posterMismatch || backdropMismatch) {
            console.log(`⚠️  [${show.id}] ${show.name}`)
            if (posterMismatch) {
                console.log(`   Poster:   ${show.poster_path} → ${tmdbData.poster_path}`)
            }
            if (backdropMismatch) {
                console.log(`   Backdrop: ${show.backdrop_path} → ${tmdbData.backdrop_path}`)
            }
            console.log()
            brokenTV.push(show.id)
        }

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 250))
    }

    console.log('\n📊 Summary:')
    console.log(`   Movies with mismatched images: ${brokenMovies.length}`)
    console.log(`   TV shows with mismatched images: ${brokenTV.length}`)

    if (brokenMovies.length > 0) {
        console.log(`\n   Broken movie IDs: [${brokenMovies.join(', ')}]`)
    }

    if (brokenTV.length > 0) {
        console.log(`   Broken TV IDs: [${brokenTV.join(', ')}]`)
    }
}

checkAllImages().catch(console.error)
