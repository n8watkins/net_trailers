/**
 * Script to check which images from seed data are returning 404 errors
 */

import { sampleMovies, sampleTVShows } from '../utils/seedData'

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500'

interface ImageCheckResult {
    contentId: number
    title: string
    mediaType: 'movie' | 'tv'
    posterPath: string | null
    backdropPath: string | null
    posterStatus: number | null
    backdropStatus: number | null
    posterError: string | null
    backdropError: string | null
}

async function checkImage(url: string): Promise<{ status: number | null; error: string | null }> {
    try {
        const response = await fetch(url, { method: 'HEAD' })
        return { status: response.status, error: null }
    } catch (error) {
        return { status: null, error: error instanceof Error ? error.message : 'Unknown error' }
    }
}

async function checkAllImages() {
    const results: ImageCheckResult[] = []

    console.log('🔍 Checking movie images...\n')
    for (const movie of sampleMovies) {
        const posterUrl = movie.poster_path ? `${TMDB_IMAGE_BASE}${movie.poster_path}` : null
        const backdropUrl = movie.backdrop_path ? `${TMDB_IMAGE_BASE}${movie.backdrop_path}` : null

        const posterCheck = posterUrl ? await checkImage(posterUrl) : { status: null, error: null }
        const backdropCheck = backdropUrl
            ? await checkImage(backdropUrl)
            : { status: null, error: null }

        results.push({
            contentId: movie.id,
            title: movie.title,
            mediaType: 'movie',
            posterPath: movie.poster_path,
            backdropPath: movie.backdrop_path,
            posterStatus: posterCheck.status,
            backdropStatus: backdropCheck.status,
            posterError: posterCheck.error,
            backdropError: backdropCheck.error,
        })

        const posterIcon =
            posterCheck.status === 200 ? '✅' : posterCheck.status === 404 ? '❌' : '⚠️'
        const backdropIcon =
            backdropCheck.status === 200 ? '✅' : backdropCheck.status === 404 ? '❌' : '⚠️'

        console.log(
            `${posterIcon} ${backdropIcon} [${movie.id}] ${movie.title} (poster: ${posterCheck.status || 'null'}, backdrop: ${backdropCheck.status || 'null'})`
        )
    }

    console.log('\n🔍 Checking TV show images...\n')
    for (const show of sampleTVShows) {
        const posterUrl = show.poster_path ? `${TMDB_IMAGE_BASE}${show.poster_path}` : null
        const backdropUrl = show.backdrop_path ? `${TMDB_IMAGE_BASE}${show.backdrop_path}` : null

        const posterCheck = posterUrl ? await checkImage(posterUrl) : { status: null, error: null }
        const backdropCheck = backdropUrl
            ? await checkImage(backdropUrl)
            : { status: null, error: null }

        results.push({
            contentId: show.id,
            title: show.name,
            mediaType: 'tv',
            posterPath: show.poster_path,
            backdropPath: show.backdrop_path,
            posterStatus: posterCheck.status,
            backdropStatus: backdropCheck.status,
            posterError: posterCheck.error,
            backdropError: backdropCheck.error,
        })

        const posterIcon =
            posterCheck.status === 200 ? '✅' : posterCheck.status === 404 ? '❌' : '⚠️'
        const backdropIcon =
            backdropCheck.status === 200 ? '✅' : backdropCheck.status === 404 ? '❌' : '⚠️'

        console.log(
            `${posterIcon} ${backdropIcon} [${show.id}] ${show.name} (poster: ${posterCheck.status || 'null'}, backdrop: ${backdropCheck.status || 'null'})`
        )
    }

    // Summary
    console.log('\n\n📊 SUMMARY\n')
    const failedPosters = results.filter((r) => r.posterStatus === 404)
    const failedBackdrops = results.filter((r) => r.backdropStatus === 404)
    const bothFailed = results.filter((r) => r.posterStatus === 404 && r.backdropStatus === 404)

    console.log(`Total content items: ${results.length}`)
    console.log(`Failed posters: ${failedPosters.length}`)
    console.log(`Failed backdrops: ${failedBackdrops.length}`)
    console.log(`Both failed (needs alternate): ${bothFailed.length}`)

    if (bothFailed.length > 0) {
        console.log('\n⚠️  Items that need alternate images:')
        bothFailed.forEach((item) => {
            console.log(`  - [${item.contentId}] ${item.title} (${item.mediaType})`)
        })
    }

    if (failedPosters.length > 0) {
        console.log('\n❌ Failed poster URLs:')
        failedPosters.forEach((item) => {
            console.log(`  - [${item.contentId}] ${item.title}: ${item.posterPath}`)
        })
    }
}

checkAllImages().catch(console.error)
