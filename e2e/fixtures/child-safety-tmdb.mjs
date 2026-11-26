/**
 * Writes the made-up TMDB answers e2e/child-safety-enforced.spec.ts needs into
 * e2e/fixtures/tmdb, in the format lib/e2eTmdbFixtures.ts reads (keyed by the
 * URL without the api_key, sorted query). They are hand-made, not recorded:
 * titles Child Safety Mode must hide (adult, R, TV-MA) next to ones it must
 * keep (PG, TV-Y), under ids TMDB does not use (99000x).
 *
 *   node e2e/fixtures/child-safety-tmdb.mjs
 */

import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const here = dirname(fileURLToPath(import.meta.url))

export const FIXTURE_QUERY = 'childsafetyfixture'

const movie = (id, title, adult = false) => ({
    id,
    media_type: 'movie',
    title,
    original_title: title,
    adult,
    overview: `${title} (e2e fixture)`,
    poster_path: null,
    backdrop_path: null,
    genre_ids: [35],
    release_date: '2020-01-01',
    vote_average: 7,
    vote_count: 500,
    popularity: 50,
    original_language: 'en',
})

const show = (id, name) => ({
    id,
    media_type: 'tv',
    name,
    original_name: name,
    adult: false,
    overview: `${name} (e2e fixture)`,
    poster_path: null,
    backdrop_path: null,
    genre_ids: [35],
    first_air_date: '2020-01-01',
    vote_average: 7,
    vote_count: 500,
    popularity: 50,
    origin_country: ['US'],
    original_language: 'en',
})

const familyFilm = movie(990001, 'Fixture Family Film')
const rFilm = movie(990002, 'Fixture R Film')
const kidsShow = show(990003, 'Fixture Kids Show')
const matureShow = show(990004, 'Fixture Mature Show')
const adultFilm = movie(990005, 'Fixture Adult Film', true)

const certification = (value) => ({
    results: [{ iso_3166_1: 'US', release_dates: [{ certification: value, type: 3 }] }],
})
const rating = (value) => ({ results: [{ iso_3166_1: 'US', rating: value }] })

const { media_type: _m, ...rFilmDetails } = rFilm

const answers = {
    [`/3/search/multi?include_adult=false&page=1&query=${FIXTURE_QUERY}`]: {
        page: 1,
        results: [familyFilm, rFilm, kidsShow, matureShow, adultFilm],
        total_pages: 1,
        total_results: 5,
    },
    '/3/movie/990001/release_dates?': certification('PG'),
    '/3/movie/990002/release_dates?': certification('R'),
    '/3/tv/990003/content_ratings?': rating('TV-Y'),
    '/3/tv/990004/content_ratings?': rating('TV-MA'),
    '/3/movie/990002?language=en-US': { ...rFilmDetails, runtime: 100, genres: [] },
}

for (const [key, body] of Object.entries(answers)) {
    const name = createHash('sha1').update(key).digest('hex').slice(0, 20)
    const file = join(here, 'tmdb', `${name}.json.gz`)
    mkdirSync(dirname(file), { recursive: true })
    const saved = JSON.stringify({ key, status: 200, body: JSON.stringify(body) }) + '\n'
    // A fixed mtime in the gzip header, so a rerun writes the same bytes.
    writeFileSync(file, new Uint8Array(gzipSync(saved, { level: 9 })))
    console.log(`${name}.json.gz  ${key}`)
}
