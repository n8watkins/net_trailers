/**
 * Regenerate the saved result sets for the example moods
 * (constants/exampleMoods.ts) into public/example-moods/<id>.json.
 *
 *   TMDB_API_KEY=... npx tsx scripts/generate-example-moods.ts
 *   vercel env run -- npx tsx scripts/generate-example-moods.ts   # or with the Vercel env
 *
 * Each curated pick is resolved on TMDB (title + year), so the files hold real
 * ids, posters and ratings. No AI call is involved, so the examples work with no
 * Gemini key or quota.
 */

import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

import { EXAMPLE_MOODS } from '../constants/exampleMoods'

const apiKey = process.env.TMDB_API_KEY
if (!apiKey) {
    console.error('TMDB_API_KEY is not set')
    process.exit(1)
}

interface TmdbResult {
    id: number
    title?: string
    name?: string
    release_date?: string
    first_air_date?: string
    vote_count?: number
    adult?: boolean
    [key: string]: unknown
}

async function resolve(pick: { title: string; year: number; type: 'movie' | 'tv' }) {
    const url = new URL(`https://api.themoviedb.org/3/search/${pick.type}`)
    url.searchParams.set('api_key', apiKey!)
    url.searchParams.set('query', pick.title)
    url.searchParams.set('include_adult', 'false')
    const response = await fetch(url)
    if (!response.ok) throw new Error(`TMDB search failed for "${pick.title}": ${response.status}`)
    const { results } = (await response.json()) as { results: TmdbResult[] }
    const yearOf = (r: TmdbResult) => Number((r.release_date || r.first_air_date || '').slice(0, 4))
    const best =
        results.find((r) => Math.abs(yearOf(r) - pick.year) <= 1) ??
        results.sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))[0]
    if (!best) throw new Error(`No TMDB match for "${pick.title}" (${pick.year})`)
    return { ...best, media_type: pick.type }
}

async function main() {
    const outDir = join(process.cwd(), 'public', 'example-moods')
    mkdirSync(outDir, { recursive: true })
    for (const mood of EXAMPLE_MOODS) {
        const results = []
        for (const pick of mood.picks) results.push(await resolve(pick))
        const file = join(outDir, `${mood.id}.json`)
        writeFileSync(
            file,
            JSON.stringify(
                {
                    id: mood.id,
                    label: mood.label,
                    emoji: mood.emoji,
                    generatedAt: new Date().toISOString().slice(0, 10),
                    results,
                },
                null,
                2
            ) + '\n'
        )
        console.log(`${mood.id}: ${results.length} titles`)
    }
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
})
