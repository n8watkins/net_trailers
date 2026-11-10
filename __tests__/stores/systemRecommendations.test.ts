import { mergeSystemRecommendations } from '../../stores/createUserStore'
import { DEFAULT_SYSTEM_RECOMMENDATIONS, SystemRecommendation } from '../../types/recommendations'

describe('mergeSystemRecommendations', () => {
    it('no longer includes Trending Directors by default', () => {
        expect(DEFAULT_SYSTEM_RECOMMENDATIONS.map((r) => r.id)).not.toContain('trending-directors')
        expect(DEFAULT_SYSTEM_RECOMMENDATIONS.map((r) => r.id)).toContain('trending-actors')
    })

    it('drops a saved Trending Directors row and keeps the rest of the saved order', () => {
        const saved: SystemRecommendation[] = DEFAULT_SYSTEM_RECOMMENDATIONS.map((rec) => ({
            ...rec,
        }))
        saved.push({
            id: 'trending-directors',
            name: 'Trending Directors',
            enabled: true,
            order: 9,
            mediaType: 'both',
            genres: [],
        })
        const merged = mergeSystemRecommendations(saved)
        expect(merged.map((r) => r.id)).not.toContain('trending-directors')
        expect(merged).toHaveLength(DEFAULT_SYSTEM_RECOMMENDATIONS.length)
    })
})
