import { contentKey, planRowExclusions } from '../../utils/homeRowDedupe'
import type { Content } from '../../typings'

describe('planRowExclusions', () => {
    const order = ['trending', 'top-rated', 'action', 'comedy']

    it('lets each title stay only in the first row that has it', () => {
        const plan = planRowExclusions(order, {
            trending: ['movie-1', 'movie-2'],
            'top-rated': ['movie-2', 'movie-3'],
            action: ['movie-1', 'movie-3', 'movie-4'],
            comedy: ['movie-4', 'tv-1'],
        })
        expect([...plan.trending.exclude]).toEqual([])
        expect([...plan['top-rated'].exclude].sort()).toEqual(['movie-1', 'movie-2'])
        expect([...plan.action.exclude].sort()).toEqual(['movie-1', 'movie-2', 'movie-3'])
        expect([...plan.comedy.exclude].sort()).toEqual([
            'movie-1',
            'movie-2',
            'movie-3',
            'movie-4',
        ])
        expect(Object.values(plan).every((row) => row.ready)).toBe(true)
    })

    it('holds a row back until every row above it has reported', () => {
        const plan = planRowExclusions(order, {
            trending: ['movie-1'],
            action: ['movie-9'],
        })
        expect(plan.trending.ready).toBe(true)
        expect(plan['top-rated'].ready).toBe(true)
        expect(plan.action.ready).toBe(false)
        expect(plan.comedy.ready).toBe(false)
    })

    it('treats an empty report as settled so a hidden row never blocks the rest', () => {
        const plan = planRowExclusions(['recommended', 'trending'], { recommended: [] })
        expect(plan.trending.ready).toBe(true)
    })

    it('stops waiting when forced (a row above is too slow)', () => {
        const plan = planRowExclusions(order, { trending: ['movie-1'] }, { force: true })
        expect(plan.comedy.ready).toBe(true)
        expect([...plan.comedy.exclude]).toEqual(['movie-1'])
    })
})

describe('contentKey', () => {
    it('keeps movie and TV ids apart and infers a missing media type', () => {
        expect(contentKey({ id: 5, media_type: 'tv' } as Content)).toBe('tv-5')
        expect(contentKey({ id: 5, title: 'Heat' } as unknown as Content)).toBe('movie-5')
        expect(contentKey({ id: 5, name: 'Lost' } as unknown as Content)).toBe('tv-5')
    })
})
