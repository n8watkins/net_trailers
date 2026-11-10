import { formatResultsHeading } from '../../../components/search/SearchResults'
import { countActiveDetailFilters } from '../../../components/search/SearchFilters'
import { useSearchStore } from '../../../stores/searchStore'

describe('formatResultsHeading', () => {
    it('puts the count in the heading', () => {
        expect(formatResultsHeading({ count: 86, noun: 'result', query: 'inception' })).toBe(
            '86 results for “inception”'
        )
    })

    it('uses the singular for one result and one person', () => {
        expect(formatResultsHeading({ count: 1, noun: 'result', query: 'x' })).toBe(
            '1 result for “x”'
        )
        expect(formatResultsHeading({ count: 1, noun: 'person', query: 'nolan' })).toBe(
            '1 person for “nolan”'
        )
        expect(formatResultsHeading({ count: 3, noun: 'person', query: 'nolan' })).toBe(
            '3 people for “nolan”'
        )
    })

    it('marks a count that is still growing and formats thousands', () => {
        expect(
            formatResultsHeading({ count: 1240, noun: 'result', query: ' war ', isPartial: true })
        ).toBe('1,240+ results for “war”')
    })
})

describe('countActiveDetailFilters', () => {
    it('counts only filters that differ from their defaults', () => {
        expect(
            countActiveDetailFilters({ rating: 'all', year: 'all', sortBy: 'popularity.desc' })
        ).toBe(0)
        expect(
            countActiveDetailFilters({ rating: '7.0+', year: '2010s', sortBy: 'popularity.desc' })
        ).toBe(2)
        expect(countActiveDetailFilters({ rating: 'all', sortBy: 'revenue.desc' })).toBe(1)
    })
})

describe('search defaults', () => {
    it('shows movies and TV by default so TV is never hidden by surprise', () => {
        expect(useSearchStore.getState().filters.contentType).toBe('all')
    })
})
