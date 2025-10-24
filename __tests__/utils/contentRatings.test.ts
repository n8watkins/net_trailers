/**
 * Tests for Content Rating Classification System
 */

import {
    SAFE_US_MOVIE_RATINGS,
    SAFE_US_TV_RATINGS,
    RESTRICTED_US_MOVIE_RATINGS,
    RESTRICTED_US_TV_RATINGS,
    isSafeRating,
    getSafeCertifications,
    getMovieCertification,
    getTVCertification,
    classifyContent,
} from '../../utils/contentRatings'

describe('Content Rating Constants', () => {
    test('should have correct safe US movie ratings', () => {
        expect(SAFE_US_MOVIE_RATINGS).toEqual(['G', 'PG', 'PG-13'])
    })

    test('should have correct restricted US movie ratings', () => {
        expect(RESTRICTED_US_MOVIE_RATINGS).toEqual(['R', 'NC-17', 'NR', 'UR'])
    })

    test('should have correct safe US TV ratings', () => {
        expect(SAFE_US_TV_RATINGS).toEqual(['TV-Y', 'TV-Y7', 'TV-Y7-FV', 'TV-G', 'TV-PG', 'TV-14'])
    })

    test('should have correct restricted US TV ratings', () => {
        expect(RESTRICTED_US_TV_RATINGS).toEqual(['TV-MA'])
    })
})

describe('isSafeRating', () => {
    describe('US Movies', () => {
        test('should return true for G rated movie', () => {
            expect(isSafeRating('G', 'movie', 'US')).toBe(true)
        })

        test('should return true for PG rated movie', () => {
            expect(isSafeRating('PG', 'movie', 'US')).toBe(true)
        })

        test('should return true for PG-13 rated movie', () => {
            expect(isSafeRating('PG-13', 'movie', 'US')).toBe(true)
        })

        test('should return false for R rated movie', () => {
            expect(isSafeRating('R', 'movie', 'US')).toBe(false)
        })

        test('should return false for NC-17 rated movie', () => {
            expect(isSafeRating('NC-17', 'movie', 'US')).toBe(false)
        })

        test('should handle lowercase ratings', () => {
            expect(isSafeRating('pg-13', 'movie', 'US')).toBe(true)
            expect(isSafeRating('r', 'movie', 'US')).toBe(false)
        })

        test('should handle ratings with whitespace', () => {
            expect(isSafeRating(' PG-13 ', 'movie', 'US')).toBe(true)
        })
    })

    describe('US TV Shows', () => {
        test('should return true for TV-Y', () => {
            expect(isSafeRating('TV-Y', 'tv', 'US')).toBe(true)
        })

        test('should return true for TV-14', () => {
            expect(isSafeRating('TV-14', 'tv', 'US')).toBe(true)
        })

        test('should return false for TV-MA', () => {
            expect(isSafeRating('TV-MA', 'tv', 'US')).toBe(false)
        })
    })

    describe('Null/Undefined Handling', () => {
        test('should return true for null certification (permissive default)', () => {
            expect(isSafeRating(null, 'movie', 'US')).toBe(true)
        })

        test('should return true for undefined certification (permissive default)', () => {
            expect(isSafeRating(undefined, 'movie', 'US')).toBe(true)
        })
    })

    describe('International Ratings', () => {
        test('should handle UK ratings', () => {
            expect(isSafeRating('U', 'movie', 'UK')).toBe(true)
            expect(isSafeRating('PG', 'movie', 'UK')).toBe(true)
            expect(isSafeRating('12A', 'movie', 'UK')).toBe(true)
            expect(isSafeRating('15', 'movie', 'UK')).toBe(false)
            expect(isSafeRating('18', 'movie', 'UK')).toBe(false)
        })

        test('should handle Canadian ratings', () => {
            expect(isSafeRating('G', 'movie', 'CA')).toBe(true)
            expect(isSafeRating('PG', 'movie', 'CA')).toBe(true)
            expect(isSafeRating('14A', 'movie', 'CA')).toBe(true)
            expect(isSafeRating('18A', 'movie', 'CA')).toBe(false)
            expect(isSafeRating('R', 'movie', 'CA')).toBe(false)
        })

        test('should handle German ratings', () => {
            expect(isSafeRating('0', 'movie', 'DE')).toBe(true)
            expect(isSafeRating('6', 'movie', 'DE')).toBe(true)
            expect(isSafeRating('12', 'movie', 'DE')).toBe(true)
            expect(isSafeRating('16', 'movie', 'DE')).toBe(false)
            expect(isSafeRating('18', 'movie', 'DE')).toBe(false)
        })
    })
})

describe('getSafeCertifications', () => {
    test('should return US movie certifications', () => {
        expect(getSafeCertifications('movie', 'US')).toEqual(['G', 'PG', 'PG-13'])
    })

    test('should return US TV certifications', () => {
        expect(getSafeCertifications('tv', 'US')).toEqual([
            'TV-Y',
            'TV-Y7',
            'TV-Y7-FV',
            'TV-G',
            'TV-PG',
            'TV-14',
        ])
    })

    test('should return UK certifications', () => {
        expect(getSafeCertifications('movie', 'UK')).toEqual(['U', 'PG', '12', '12A'])
    })

    test('should default to US ratings for unknown country', () => {
        expect(getSafeCertifications('movie', 'UNKNOWN')).toEqual(['G', 'PG', 'PG-13'])
    })
})

describe('getMovieCertification', () => {
    test('should extract US certification from movie data', () => {
        const movieData = {
            release_dates: {
                results: [
                    {
                        iso_3166_1: 'US',
                        release_dates: [{ certification: 'PG-13' }],
                    },
                ],
            },
        }
        expect(getMovieCertification(movieData, 'US')).toBe('PG-13')
    })

    test('should return null for movie without release dates', () => {
        const movieData = {}
        expect(getMovieCertification(movieData, 'US')).toBe(null)
    })

    test('should return null for movie without matching country', () => {
        const movieData = {
            release_dates: {
                results: [
                    {
                        iso_3166_1: 'UK',
                        release_dates: [{ certification: '12A' }],
                    },
                ],
            },
        }
        expect(getMovieCertification(movieData, 'US')).toBe(null)
    })
})

describe('getTVCertification', () => {
    test('should extract US certification from TV data', () => {
        const tvData = {
            content_ratings: {
                results: [
                    {
                        iso_3166_1: 'US',
                        rating: 'TV-14',
                    },
                ],
            },
        }
        expect(getTVCertification(tvData, 'US')).toBe('TV-14')
    })

    test('should return null for TV show without content ratings', () => {
        const tvData = {}
        expect(getTVCertification(tvData, 'US')).toBe(null)
    })

    test('should return null for TV show without matching country', () => {
        const tvData = {
            content_ratings: {
                results: [
                    {
                        iso_3166_1: 'UK',
                        rating: '12',
                    },
                ],
            },
        }
        expect(getTVCertification(tvData, 'US')).toBe(null)
    })
})

describe('classifyContent', () => {
    test('should classify adult flagged content as restricted', () => {
        const content = { adult: true }
        expect(classifyContent(content, 'movie', 'US')).toBe('restricted')
    })

    test('should classify PG-13 movie as safe', () => {
        const content = {
            adult: false,
            release_dates: {
                results: [
                    {
                        iso_3166_1: 'US',
                        release_dates: [{ certification: 'PG-13' }],
                    },
                ],
            },
        }
        expect(classifyContent(content, 'movie', 'US')).toBe('safe')
    })

    test('should classify R-rated movie as restricted', () => {
        const content = {
            adult: false,
            release_dates: {
                results: [
                    {
                        iso_3166_1: 'US',
                        release_dates: [{ certification: 'R' }],
                    },
                ],
            },
        }
        expect(classifyContent(content, 'movie', 'US')).toBe('restricted')
    })

    test('should classify TV-14 show as safe', () => {
        const content = {
            adult: false,
            content_ratings: {
                results: [
                    {
                        iso_3166_1: 'US',
                        rating: 'TV-14',
                    },
                ],
            },
        }
        expect(classifyContent(content, 'tv', 'US')).toBe('safe')
    })

    test('should classify TV-MA show as restricted', () => {
        const content = {
            adult: false,
            content_ratings: {
                results: [
                    {
                        iso_3166_1: 'US',
                        rating: 'TV-MA',
                    },
                ],
            },
        }
        expect(classifyContent(content, 'tv', 'US')).toBe('restricted')
    })

    test('should classify unrated content as unknown', () => {
        const content = { adult: false }
        expect(classifyContent(content, 'movie', 'US')).toBe('unknown')
    })
})
