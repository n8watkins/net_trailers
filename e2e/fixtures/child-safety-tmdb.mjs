/**
 * Writes the made-up TMDB answers e2e/child-safety-enforced.spec.ts needs into
 * e2e/fixtures/tmdb, in the format lib/e2eTmdbFixtures.ts reads (keyed by the
 * URL without the api_key, sorted query). They are hand-made, not recorded:
 * titles Child Safety Mode must hide (adult, R, TV-MA) next to ones it must
 * keep (PG, TV-Y), under ids TMDB does not use (99000x); the catalogue in
 * child-safety-catalogue.json (9901xx, 9902xx); and, for recorded titles whose
 * details carry their real ratings, those ratings under the lookup URLs.
 *
 *   node e2e/fixtures/child-safety-tmdb.mjs
 */

import { createHash } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync, gzipSync } from 'node:zlib'

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

// The details URL the single-title routes ask for (utils/tmdbApi.ts).
const DETAILS_APPEND =
    'append_to_response=videos%2Ccredits%2Cexternal_ids%2Crelease_dates%2Ccontent_ratings'

// The five titles above as the single-title routes fetch them.
for (const [item, appended] of [
    [familyFilm, { release_dates: certification('PG') }],
    [rFilm, { release_dates: certification('R') }],
    [adultFilm, { release_dates: { results: [] } }],
    [kidsShow, { content_ratings: rating('TV-Y') }],
    [matureShow, { content_ratings: rating('TV-MA') }],
]) {
    const { media_type: kind, ...details } = item
    const full = {
        ...details,
        genres: [],
        videos: { results: [] },
        credits: { cast: [], crew: [] },
    }
    answers[`/3/${kind}/${item.id}?${DETAILS_APPEND}&language=en-US`] = { ...full, ...appended }
    answers[`/3/${kind}/${item.id}?language=en-US`] ??= full
}

// The catalogue modelled on live titles whose list and single-title answers
// disagreed (e2e/fixtures/child-safety-catalogue.json): searchable under
// CATALOGUE_QUERY, with their ratings and details. A lookup marked "fail" gets
// no fixture, so the app sees TMDB answer 404, a failed lookup.
export const CATALOGUE_QUERY = 'childsafetycatalogue'
const catalogue = JSON.parse(readFileSync(join(here, 'child-safety-catalogue.json'), 'utf8'))
const catalogueMovie = (m) => ({
    ...movie(m.id, m.title, m.adult ?? false),
    genre_ids: m.genre_ids,
    vote_count: m.vote_count,
})
const catalogueShow = (s) => ({
    ...show(s.id, s.name),
    genre_ids: s.genre_ids,
    vote_count: s.vote_count,
})
const searchResults = [
    ...catalogue.movies.map(catalogueMovie),
    ...catalogue.shows.map(catalogueShow),
]
answers[`/3/search/multi?include_adult=false&page=1&query=${CATALOGUE_QUERY}`] = {
    page: 1,
    results: searchResults,
    total_pages: 1,
    total_results: searchResults.length,
}
for (const m of catalogue.movies) {
    const { media_type: _t, ...details } = catalogueMovie(m)
    const releaseDates = m.releaseDates === 'fail' ? [] : m.releaseDates
    if (m.releaseDates !== 'fail')
        answers[`/3/movie/${m.id}/release_dates?`] = { id: m.id, results: releaseDates }
    const full = {
        ...details,
        runtime: 100,
        genres: [],
        videos: { results: [] },
        credits: { cast: [], crew: [] },
    }
    answers[`/3/movie/${m.id}?${DETAILS_APPEND}&language=en-US`] = {
        ...full,
        release_dates: { results: releaseDates },
    }
    answers[`/3/movie/${m.id}?language=en-US`] = full
}
for (const s of catalogue.shows) {
    const { media_type: _t, ...details } = catalogueShow(s)
    const ratings = s.contentRatings === 'fail' ? [] : s.contentRatings
    if (s.contentRatings !== 'fail')
        answers[`/3/tv/${s.id}/content_ratings?`] = { id: s.id, results: ratings }
    const full = {
        ...details,
        genres: [],
        videos: { results: [] },
        credits: { cast: [], crew: [] },
    }
    answers[`/3/tv/${s.id}?${DETAILS_APPEND}&language=en-US`] = {
        ...full,
        content_ratings: { results: ratings },
    }
    answers[`/3/tv/${s.id}?language=en-US`] = full
}

// Recorded titles (trending rows) whose details were recorded with their real
// ratings appended: the same ratings under the lookup Child Safety Mode reads,
// so the e2e home rows with the mode on show real titles.
const tmdbDir = join(here, 'tmdb')
for (const file of readdirSync(tmdbDir)) {
    const saved = JSON.parse(gunzipSync(readFileSync(join(tmdbDir, file))).toString('utf8'))
    const match = saved.key.match(/^\/3\/(movie|tv)\/(\d+)\?append_to_response=[^&]*release_dates/)
    if (!match || saved.status !== 200 || Number(match[2]) >= 990000) continue
    const body = JSON.parse(saved.body)
    if (match[1] === 'movie' && body.release_dates) {
        answers[`/3/movie/${match[2]}/release_dates?`] ??= {
            id: body.id,
            results: body.release_dates.results,
        }
    }
    if (match[1] === 'tv' && body.content_ratings) {
        answers[`/3/tv/${match[2]}/content_ratings?`] ??= {
            id: body.id,
            results: body.content_ratings.results,
        }
    }
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
