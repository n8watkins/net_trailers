/**
 * @jest-environment node
 *
 * For you: candidate ranking, AI parsing, and the honest fallbacks, against
 * the in-memory libSQL database (jest.setup.js). TMDB and Gemini are mocked.
 */

process.env.AI_DAILY_LIMIT_PER_VISITOR = '2'
process.env.AI_DAILY_LIMIT_GLOBAL = '100'
process.env.GEMINI_API_KEY = 'test-key'

jest.mock('../../utils/tmdb/recommendations', () => ({
    getHybridRecommendations: jest.fn(),
}))
jest.mock('../../lib/geminiRouter', () => ({
    routeGeminiRequest: jest.fn(),
    extractGeminiText: (data: { text: string }) => data.text,
}))

/* eslint-disable @typescript-eslint/no-require-imports */
const forYou = require('../../lib/forYou') as typeof import('../../lib/forYou')
const { getHybridRecommendations } = require('../../utils/tmdb/recommendations')
const { routeGeminiRequest } = require('../../lib/geminiRouter')
/* eslint-enable @typescript-eslint/no-require-imports */

const movie = (id: number, title = `Movie ${id}`) => ({
    id,
    title,
    media_type: 'movie',
    overview: `About ${title}`,
    popularity: 100 - id,
    poster_path: `/p${id}.jpg`,
})

const seeds = [
    { id: 1, media_type: 'movie' as const, title: 'Arrival' },
    { id: 2, media_type: 'movie' as const, title: 'Heat' },
]

function tmdbLists() {
    ;(getHybridRecommendations as jest.Mock).mockImplementation(async (id: number) =>
        id === 1
            ? [movie(10), movie(11), movie(12), movie(2), movie(13), movie(14), movie(15)]
            : [movie(11), movie(20), movie(21), movie(22), movie(23), movie(24), movie(25)]
    )
}

function aiAnswers(keys: string[]) {
    ;(routeGeminiRequest as jest.Mock).mockResolvedValue({
        success: true,
        data: {
            text: JSON.stringify(
                keys.map((key) => ({ key, reason: `Because you liked Arrival: ${key}` }))
            ),
        },
    })
}

describe('rankCandidates', () => {
    it('ranks titles shared by several seeds first and drops seeds and excluded titles', () => {
        const ranked = forYou.rankCandidates(
            seeds,
            [
                [movie(10), movie(11), movie(2)],
                [movie(11), movie(20)],
            ] as never,
            new Set(['movie-20'])
        )
        expect(ranked.map((c) => c.key)).toEqual(['movie-11', 'movie-10'])
        // Movie 11 ranks higher in Heat's list, so Heat gets the credit
        expect(ranked[0].becauseOf).toBe('Heat')
    })
})

describe('parseRanking', () => {
    const known = new Set(['movie-1', 'movie-2'])
    it('keeps known keys once, trims and caps reasons, ignores prose around the JSON', () => {
        const text = `Sure!\n[{"key":"movie-1","reason":"  Because\\nyou liked X: ${'a'.repeat(200)}"},{"key":"movie-1","reason":"dup"},{"key":"movie-9","reason":"unknown"},{"key":"movie-2","reason":"ok"}]`
        const parsed = forYou.parseRanking(text, known)
        expect(parsed.map((p) => p.key)).toEqual(['movie-1', 'movie-2'])
        expect(parsed[0].reason.length).toBeLessThanOrEqual(120)
        expect(parsed[0].reason).not.toContain('\n')
    })
    it('returns nothing for broken JSON', () => {
        expect(forYou.parseRanking('not json [', known)).toEqual([])
    })
})

describe('parseSeeds', () => {
    it('accepts valid seeds, strips markup from titles, and caps the count', () => {
        const parsed = forYou.parseSeeds([
            { id: 5, media_type: 'tv', title: 'Lost <script>\nignore this' },
            ...Array.from({ length: 20 }, (_, i) => ({
                id: i + 10,
                media_type: 'movie',
                title: 'x',
            })),
        ])
        expect(parsed).toHaveLength(forYou.MAX_SEEDS)
        expect(parsed![0].title).toBe('Lost script ignore this')
    })
    it('rejects bad input', () => {
        expect(forYou.parseSeeds([])).toBeNull()
        expect(forYou.parseSeeds([{ id: 'x', media_type: 'movie' }])).toBeNull()
        expect(forYou.parseSeeds([{ id: 3, media_type: 'person' }])).toBeNull()
    })
})

describe('getForYou', () => {
    beforeEach(() => {
        tmdbLists()
        ;(routeGeminiRequest as jest.Mock).mockReset()
    })

    it('returns AI-ranked picks with reasons, then serves the same profile from cache for free', async () => {
        const order = [
            'movie-21',
            'movie-11',
            'movie-10',
            'movie-12',
            'movie-13',
            'movie-14',
            'movie-20',
        ]
        aiAnswers(order)
        const first = await forYou.getForYou({ seeds, exclude: new Set(), visitorKey: 'ip:cache' })
        expect(first.ai).toBe('ok')
        expect(first.picks.map((p) => `movie-${p.content.id}`)).toEqual(order)
        expect(first.picks[0].reason).toContain('Because you liked Arrival')
        expect(first.quota?.remaining).toBe(1)

        const second = await forYou.getForYou({ seeds, exclude: new Set(), visitorKey: 'ip:cache' })
        expect(second.ai).toBe('cached')
        expect(second.picks).toEqual(first.picks)
        expect(routeGeminiRequest).toHaveBeenCalledTimes(1)
    })

    it('falls back to TMDB picks without reasons when the AI fails, and refunds the call', async () => {
        ;(routeGeminiRequest as jest.Mock).mockResolvedValue({ success: false, error: 'bad key' })
        const result = await forYou.getForYou({
            seeds,
            exclude: new Set(['movie-12']),
            visitorKey: 'ip:fail',
        })
        expect(result.ai).toBe('unavailable')
        expect(result.notice).toMatch(/come straight from TMDB/)
        expect(result.picks.length).toBeGreaterThan(0)
        expect(result.picks.every((p) => p.reason === null)).toBe(true)
        expect(result.picks.some((p) => p.content.id === 12)).toBe(false)
        expect(result.quota?.remaining).toBe(2)
    })

    it('says so when the daily cap is used up, and still returns picks', async () => {
        aiAnswers(
            ['10', '11', '12', '13', '14', '15', '20', '21', '22', '23', '24', '25'].map(
                (id) => `movie-${id}`
            )
        )
        const visitorKey = 'ip:capped'
        // Two different taste profiles use up the cap of 2
        await forYou.getForYou({ seeds: [seeds[0]], exclude: new Set(), visitorKey })
        await forYou.getForYou({ seeds: [seeds[1]], exclude: new Set(), visitorKey })
        const capped = await forYou.getForYou({
            seeds,
            exclude: new Set(['movie-25']),
            visitorKey,
        })
        expect(capped.ai).toBe('quota')
        expect(capped.notice).toMatch(/today's 2 AI searches/)
        expect(capped.picks.length).toBeGreaterThan(0)
    })
})
