import { TMDBApiClient } from './tmdbApi'
import type { Entity } from '../components/customRows/smart/SmartInput'

export interface Suggestion {
    type:
        | 'genre'
        | 'rating'
        | 'year_range'
        | 'studio'
        | 'actor'
        | 'director'
        | 'certification'
        | 'content_list'
    value: any
    displayName?: string // Human-readable name for display
    confidence: number // 0-100
    reason: string
    estimatedResults?: number
    source: 'user' | 'tmdb' | 'text_analysis' | 'gemini'
}

export interface SuggestionResult {
    suggestions: Suggestion[]
    rowNames: string[]
    insight: string
}

interface InputData {
    entities: Entity[]
    rawText: string
    mediaType: 'movie' | 'tv' | 'both'
}

/**
 * Generate suggestions based on user input (TMDB-powered, no AI)
 */
export async function generateSmartSuggestions(
    inputData: InputData,
    seed?: number
): Promise<SuggestionResult> {
    const suggestions: Suggestion[] = []

    // 1. Add user-tagged entities (100% confidence)
    inputData.entities.forEach((entity) => {
        if (entity.type === 'genre') {
            suggestions.push({
                type: 'genre',
                value: [entity.id],
                displayName: entity.name,
                confidence: 100,
                reason: 'Your selection',
                source: 'user',
            })
        } else if (entity.type === 'person') {
            const isDirector = entity.subtitle?.toLowerCase().includes('direct')
            suggestions.push({
                type: isDirector ? 'director' : 'actor',
                value: entity.id,
                displayName: entity.name,
                confidence: 100,
                reason: 'Your selection',
                source: 'user',
            })
        } else if (entity.type === 'company') {
            suggestions.push({
                type: 'studio',
                value: entity.id,
                displayName: entity.name,
                confidence: 100,
                reason: 'Your selection',
                source: 'user',
            })
        }
    })

    // 2. Analyze tagged people (fetch their filmography)
    for (const person of inputData.entities.filter((e) => e.type === 'person')) {
        try {
            const analysis = await analyzePersonFilmography(
                person.id as number,
                inputData.mediaType
            )

            // Add common genres
            if (analysis.commonGenres.length > 0) {
                suggestions.push({
                    type: 'genre',
                    value: analysis.commonGenres,
                    confidence: 90,
                    reason: `Common in ${person.name}'s filmography (${analysis.totalWorks} ${inputData.mediaType === 'tv' ? 'shows' : 'films'})`,
                    source: 'tmdb',
                })
            }

            // Add rating suggestion if consistently high-rated
            if (analysis.averageRating > 7.5) {
                suggestions.push({
                    type: 'rating',
                    value: { min: 7.0 },
                    confidence: 85,
                    reason: `${person.name}'s work averages ${analysis.averageRating.toFixed(1)}/10 rating`,
                    source: 'tmdb',
                })
            }

            // Add year range for era
            if (analysis.mostActiveYears) {
                suggestions.push({
                    type: 'year_range',
                    value: analysis.mostActiveYears,
                    confidence: 75,
                    reason: `${person.name}'s most active period`,
                    source: 'tmdb',
                })
            }
        } catch (error) {
            console.error(`Error analyzing person ${person.id}:`, error)
        }
    }

    // 3. Analyze raw text for keywords
    const textSuggestions = analyzeTextKeywords(inputData.rawText)
    suggestions.push(...textSuggestions)

    // 4. Generate row names (with optional seed for variations)
    const rowNames = generateRowNames(inputData, seed)

    // 5. Generate insight
    const insight = generateInsight(inputData, suggestions)

    return {
        suggestions: deduplicateSuggestions(suggestions),
        rowNames,
        insight,
    }
}

/**
 * Analyze a person's filmography to find patterns
 */
async function analyzePersonFilmography(
    personId: number,
    mediaType: 'movie' | 'tv' | 'both'
): Promise<{
    commonGenres: number[]
    averageRating: number
    totalWorks: number
    mostActiveYears?: { min: number; max: number }
}> {
    const tmdb = TMDBApiClient.getInstance()

    try {
        // Fetch person's credits
        const credits =
            mediaType === 'tv'
                ? await tmdb.fetch(`/person/${personId}/tv_credits`)
                : await tmdb.fetch(`/person/${personId}/movie_credits`)

        const works = mediaType === 'tv' ? (credits as any).cast : (credits as any).crew

        if (!works || works.length === 0) {
            return { commonGenres: [], averageRating: 0, totalWorks: 0 }
        }

        // Count genre frequency
        const genreCounts = new Map<number, number>()
        let totalRating = 0
        let ratedWorks = 0
        const years: number[] = []

        works.forEach((work: any) => {
            // Genre counting
            if (work.genre_ids && Array.isArray(work.genre_ids)) {
                work.genre_ids.forEach((genreId: number) => {
                    genreCounts.set(genreId, (genreCounts.get(genreId) || 0) + 1)
                })
            }

            // Rating averaging
            if (work.vote_average && work.vote_count > 10) {
                // Only count if has enough votes
                totalRating += work.vote_average
                ratedWorks++
            }

            // Year tracking
            const date = work.release_date || work.first_air_date
            if (date) {
                const year = parseInt(date.split('-')[0])
                if (!isNaN(year)) {
                    years.push(year)
                }
            }
        })

        // Get top 3 most common genres
        const sortedGenres = Array.from(genreCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([genreId]) => genreId)

        // Calculate average rating
        const averageRating = ratedWorks > 0 ? totalRating / ratedWorks : 0

        // Most active years (e.g., 2000-2024)
        let mostActiveYears
        if (years.length > 3) {
            years.sort()
            const median = years.length / 2
            const startIdx = Math.floor(median / 2)
            const endIdx = Math.ceil(median + median / 2)
            mostActiveYears = {
                min: years[startIdx],
                max: years[endIdx],
            }
        }

        return {
            commonGenres: sortedGenres,
            averageRating,
            totalWorks: works.length,
            mostActiveYears,
        }
    } catch (error) {
        console.error('Error fetching person credits:', error)
        return { commonGenres: [], averageRating: 0, totalWorks: 0 }
    }
}

/**
 * Analyze raw text for keywords and intent
 */
function analyzeTextKeywords(text: string): Suggestion[] {
    const lowerText = text.toLowerCase()
    const suggestions: Suggestion[] = []

    // Rating keywords
    if (lowerText.match(/high.?(rating|quality|rated)|acclaimed|best|top|excellent/)) {
        suggestions.push({
            type: 'rating',
            value: { min: 7.5 },
            confidence: 90,
            reason: 'You mentioned high quality content',
            source: 'text_analysis',
        })
    }

    // Era keywords
    const eraMatch = lowerText.match(/(classic|old|vintage|retro|80s|90s|2000s)/i)
    if (eraMatch) {
        let yearRange
        if (lowerText.includes('80s')) {
            yearRange = { min: 1980, max: 1989 }
        } else if (lowerText.includes('90s')) {
            yearRange = { min: 1990, max: 1999 }
        } else if (lowerText.includes('2000s')) {
            yearRange = { min: 2000, max: 2009 }
        } else if (lowerText.match(/classic|old|vintage|retro/)) {
            yearRange = { max: 1999 }
        }

        if (yearRange) {
            suggestions.push({
                type: 'year_range',
                value: yearRange,
                confidence: 85,
                reason: `You mentioned ${eraMatch[0]}`,
                source: 'text_analysis',
            })
        }
    }

    // Modern/recent keywords
    if (lowerText.match(/modern|recent|new|latest|contemporary/)) {
        suggestions.push({
            type: 'year_range',
            value: { min: 2015 },
            confidence: 85,
            reason: 'You mentioned recent content',
            source: 'text_analysis',
        })
    }

    // Tone/maturity keywords
    if (lowerText.match(/dark|gritty|serious|mature|intense|violent/)) {
        suggestions.push({
            type: 'certification',
            value: ['R', 'TV-MA'],
            confidence: 80,
            reason: 'You mentioned mature themes',
            source: 'text_analysis',
        })
    }

    // Family-friendly keywords
    if (lowerText.match(/family|kids|children|wholesome|all.ages/)) {
        suggestions.push({
            type: 'certification',
            value: ['G', 'PG', 'TV-G', 'TV-PG'],
            confidence: 85,
            reason: 'You mentioned family-friendly content',
            source: 'text_analysis',
        })
    }

    return suggestions
}

/**
 * Generate row names based on entities with whimsical variations
 */
function generateRowNames(inputData: InputData, seed: number = 0): string[] {
    const { entities, mediaType } = inputData
    const names: string[] = []

    const genres = entities.filter((e) => e.type === 'genre')
    const people = entities.filter((e) => e.type === 'person')
    const studios = entities.filter((e) => e.type === 'company')

    const contentType = mediaType === 'movie' ? 'Films' : mediaType === 'tv' ? 'Shows' : 'Content'

    // Helper to pick variation based on seed
    const pick = (options: string[]) => options[seed % options.length]

    // Pattern 1: Person + Genre (whimsical variations)
    if (people.length > 0 && genres.length > 0) {
        const variations = [
            `${people[0].name}'s ${genres[0].name} Adventures`,
            `${genres[0].name} Nights with ${people[0].name}`,
            `${people[0].name}'s ${genres[0].name} Playground`,
            `When ${people[0].name} Gets ${genres[0].name}`,
            `${people[0].name}: ${genres[0].name} Extraordinaire`,
            `${people[0].name}'s ${genres[0].name} Masterclass`,
            `Peak ${genres[0].name} à la ${people[0].name}`,
        ]
        names.push(pick(variations))
    }

    // Pattern 2: Studio + Genre (brand-focused wit)
    if (studios.length > 0 && genres.length > 0) {
        const variations = [
            `${studios[0].name}'s ${genres[0].name} Vault`,
            `Pure ${genres[0].name} by ${studios[0].name}`,
            `${studios[0].name}'s ${genres[0].name} Gold`,
            `${genres[0].name} Classics: ${studios[0].name} Edition`,
            `${studios[0].name}'s ${genres[0].name} Hits`,
            `The ${studios[0].name} ${genres[0].name} Files`,
        ]
        names.push(pick(variations))
    }

    // Pattern 3: Multiple Genres (fusion names)
    if (genres.length >= 2) {
        const variations = [
            `${genres[0].name} Meets ${genres[1].name}`,
            `When ${genres[0].name} Gets ${genres[1].name}`,
            `${genres[0].name}-${genres[1].name} Fusion`,
            `${genres[0].name} with a Splash of ${genres[1].name}`,
            `Double Trouble: ${genres[0].name} + ${genres[1].name}`,
            `${genres[0].name} & ${genres[1].name} Magic`,
        ]
        names.push(pick(variations))
    }

    // Pattern 4: Person-focused (celebrate the talent)
    if (people.length > 0) {
        const variations = [
            `The ${people[0].name} Experience`,
            `Peak ${people[0].name}`,
            `${people[0].name}'s Greatest Hits`,
            `All Things ${people[0].name}`,
            `${people[0].name}: The Archives`,
            `${people[0].name}'s Hall of Fame`,
            `${people[0].name} Essentials`,
        ]
        names.push(pick(variations))
    }

    // Pattern 5: Studio-focused (brand personality)
    if (studios.length > 0) {
        const variations = [
            `${studios[0].name} Vault`,
            `Best of ${studios[0].name}`,
            `${studios[0].name} Classics`,
            `${studios[0].name}'s Finest`,
            `The ${studios[0].name} Collection`,
            `${studios[0].name} Treasures`,
        ]
        names.push(pick(variations))
    }

    // Pattern 6: Single genre (playful descriptors)
    if (genres.length === 1) {
        const variations = [
            `${genres[0].name} Paradise`,
            `Pure ${genres[0].name}`,
            `${genres[0].name} Gems`,
            `${genres[0].name} Essentials`,
            `${genres[0].name} Gold`,
            `${genres[0].name} Wonderland`,
            `Peak ${genres[0].name}`,
        ]
        names.push(pick(variations))
    }

    // Fallback (creative defaults)
    if (names.length === 0) {
        const variations = [
            `My Curated ${contentType}`,
            `Handpicked ${contentType}`,
            `Custom ${contentType} Mix`,
            `Unique ${contentType} Blend`,
            `Specially Selected ${contentType}`,
        ]
        names.push(pick(variations))
    }

    // Return top 3 unique names
    return [...new Set(names)].slice(0, 3)
}

/**
 * Generate insight about the selection
 */
function generateInsight(inputData: InputData, suggestions: Suggestion[]): string {
    const { entities } = inputData
    const people = entities.filter((e) => e.type === 'person')
    const genres = entities.filter((e) => e.type === 'genre')
    const studios = entities.filter((e) => e.type === 'company')

    if (people.length > 0 && genres.length > 0) {
        return `${people[0].name}'s ${genres[0].name.toLowerCase()} catalog curated for you`
    }

    if (studios.length > 0) {
        return `Exploring ${studios[0].name}'s finest work`
    }

    if (genres.length >= 2) {
        return `${genres[0].name} meets ${genres[1].name} – an interesting mix`
    }

    const tmdbSuggestions = suggestions.filter((s) => s.source === 'tmdb').length
    if (tmdbSuggestions > 0) {
        return `Found ${tmdbSuggestions} pattern${tmdbSuggestions > 1 ? 's' : ''} from your selections`
    }

    return 'Smart suggestions from your selections'
}

/**
 * Remove duplicate suggestions
 */
function deduplicateSuggestions(suggestions: Suggestion[]): Suggestion[] {
    const seen = new Set<string>()
    const unique: Suggestion[] = []

    for (const suggestion of suggestions) {
        const key = `${suggestion.type}-${JSON.stringify(suggestion.value)}`
        if (!seen.has(key)) {
            seen.add(key)
            unique.push(suggestion)
        }
    }

    return unique.sort((a, b) => b.confidence - a.confidence)
}
