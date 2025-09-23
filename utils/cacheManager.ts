import { searchCache, movieCache, mainPageCache } from './apiCache'

export class CacheManager {
    // Clear all caches
    static clearAll(): void {
        searchCache.clear()
        movieCache.clear()
        mainPageCache.clear()
    }

    // Clear specific cache patterns
    static clearSearchCache(): void {
        searchCache.clear()
    }

    static clearMovieCache(): void {
        movieCache.clear()
    }

    static clearMainPageCache(): void {
        mainPageCache.clear()
    }

    // Invalidate specific patterns
    static invalidateSearchPattern(pattern: string): void {
        searchCache.invalidatePattern(pattern)
    }

    static invalidateMoviePattern(pattern: string): void {
        movieCache.invalidatePattern(pattern)
    }

    // Get cache statistics for debugging
    static getStats() {
        return {
            search: searchCache.getStats(),
            movie: movieCache.getStats(),
            mainPage: mainPageCache.getStats(),
        }
    }

    // Cache preloading strategies
    static async preloadMainPageData(): Promise<void> {
        try {
            const baseUrl =
                typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

            // Check if main page data is already cached
            const cached = mainPageCache.get('main-page-content')
            if (cached) {
                return // Already cached
            }

            // Preload main page data in background
            const response = await fetch(`${baseUrl}/api/preload-main`)
            if (response.ok) {
                const data = await response.json()
                mainPageCache.set('main-page-content', data)
            }
        } catch (error) {}
    }

    // Smart cache warming for search
    static warmSearchCache(popularQueries: string[]): void {
        popularQueries.forEach((query) => {
            // Only warm cache if not already present
            const cached = searchCache.get('/api/search', { query, page: '1' })
            if (!cached) {
                // Trigger background search to warm cache
                fetch(`/api/search?query=${encodeURIComponent(query)}&page=1`)
                    .then((response) => response.json())
                    .then((data) => {
                        searchCache.set('/api/search', data, { query, page: '1' })
                    })
                    .catch(() => {}) // Silent fail for cache warming
            }
        })
    }

    // Cache size optimization
    static optimizeCaches(): void {
        const stats = this.getStats()

        // If any cache is getting large, clear old entries
        if (stats.search.size > 40) {
            // Keep only recent searches
            searchCache.clear()
        }

        if (stats.movie.size > 150) {
            // Keep only recent movie data
            movieCache.clear()
        }
    }

    // Cache health check
    static healthCheck(): boolean {
        try {
            // Test basic cache operations
            const testKey = 'health-check'
            const testData = { test: true }

            searchCache.set(testKey, testData)
            const retrieved = searchCache.get(testKey)
            searchCache.invalidate(testKey)

            return retrieved !== null
        } catch (error) {
            console.error('Cache health check failed:', error)
            return false
        }
    }
}

// Export for global access
if (typeof window !== 'undefined') {
    // Make cache manager available globally for debugging
    ;(window as any).cacheManager = CacheManager
}
