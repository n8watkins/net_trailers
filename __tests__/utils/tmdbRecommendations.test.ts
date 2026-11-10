jest.mock('../../utils/tmdbApi', () => ({
    TMDBApiClient: { getInstance: () => ({ fetch: jest.fn() }) },
}))

import { isRecommendable, MIN_RECOMMENDATION_VOTES } from '../../utils/tmdb/recommendations'

describe('isRecommendable', () => {
    it('rejects adult titles even when they have many votes', () => {
        expect(isRecommendable({ adult: true, vote_count: 10_000 })).toBe(false)
    })

    it('rejects titles below the vote threshold', () => {
        expect(isRecommendable({ adult: false, vote_count: MIN_RECOMMENDATION_VOTES - 1 })).toBe(
            false
        )
        expect(isRecommendable({})).toBe(false)
    })

    it('accepts non-adult titles at or above the vote threshold', () => {
        expect(isRecommendable({ adult: false, vote_count: MIN_RECOMMENDATION_VOTES })).toBe(true)
        expect(isRecommendable({ vote_count: 2_500 })).toBe(true)
    })
})
