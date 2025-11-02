/**
 * Certification Cache
 * In-memory cache for TMDB certification/rating data to reduce API calls
 */

interface CacheEntry<T> {
    data: T
    timestamp: number
    expiresAt: number
}

interface CacheStats {
    hits: number
    misses: number
    entries: number
    hitRate: number
}

/**
 * Generic in-memory cache with TTL (time-to-live)
 */
class CertificationCache {
    private movieCache = new Map<number, CacheEntry<string | null>>()
    private tvCache = new Map<number, CacheEntry<any[] | null>>()
    private readonly TTL: number = 1000 * 60 * 60 // 1 hour in milliseconds
    private stats = {
        movieHits: 0,
        movieMisses: 0,
        tvHits: 0,
        tvMisses: 0,
    }

    /**
     * Get cached movie certification
     * @param movieId - TMDB movie ID
     * @returns Certification string or null, or undefined if not in cache
     */
    getMovie(movieId: number): string | null | undefined {
        const entry = this.movieCache.get(movieId)
        if (!entry) {
            this.stats.movieMisses++
            return undefined
        }

        // Check if entry has expired
        if (Date.now() > entry.expiresAt) {
            this.movieCache.delete(movieId)
            this.stats.movieMisses++
            return undefined
        }

        this.stats.movieHits++
        return entry.data
    }

    /**
     * Set movie certification in cache
     * @param movieId - TMDB movie ID
     * @param certification - Certification string or null
     */
    setMovie(movieId: number, certification: string | null): void {
        this.movieCache.set(movieId, {
            data: certification,
            timestamp: Date.now(),
            expiresAt: Date.now() + this.TTL,
        })
    }

    /**
     * Get cached TV show ratings
     * @param tvId - TMDB TV show ID
     * @returns Array of ratings or null, or undefined if not in cache
     */
    getTV(tvId: number): any[] | null | undefined {
        const entry = this.tvCache.get(tvId)
        if (!entry) {
            this.stats.tvMisses++
            return undefined
        }

        // Check if entry has expired
        if (Date.now() > entry.expiresAt) {
            this.tvCache.delete(tvId)
            this.stats.tvMisses++
            return undefined
        }

        this.stats.tvHits++
        return entry.data
    }

    /**
     * Set TV show ratings in cache
     * @param tvId - TMDB TV show ID
     * @param ratings - Array of ratings or null
     */
    setTV(tvId: number, ratings: any[] | null): void {
        this.tvCache.set(tvId, {
            data: ratings,
            timestamp: Date.now(),
            expiresAt: Date.now() + this.TTL,
        })
    }

    /**
     * Clear all cached data
     */
    clear(): void {
        this.movieCache.clear()
        this.tvCache.clear()
        this.stats = {
            movieHits: 0,
            movieMisses: 0,
            tvHits: 0,
            tvMisses: 0,
        }
    }

    /**
     * Clear expired entries from both caches
     */
    clearExpired(): void {
        const now = Date.now()

        // Clear expired movie entries
        const movieEntries = Array.from(this.movieCache.entries())
        for (const [id, entry] of movieEntries) {
            if (now > entry.expiresAt) {
                this.movieCache.delete(id)
            }
        }

        // Clear expired TV entries
        const tvEntries = Array.from(this.tvCache.entries())
        for (const [id, entry] of tvEntries) {
            if (now > entry.expiresAt) {
                this.tvCache.delete(id)
            }
        }
    }

    /**
     * Get cache statistics
     */
    getStats(): {
        movies: CacheStats
        tv: CacheStats
        combined: CacheStats
    } {
        const movieTotal = this.stats.movieHits + this.stats.movieMisses
        const tvTotal = this.stats.tvHits + this.stats.tvMisses
        const combinedTotal = movieTotal + tvTotal

        return {
            movies: {
                hits: this.stats.movieHits,
                misses: this.stats.movieMisses,
                entries: this.movieCache.size,
                hitRate: movieTotal > 0 ? this.stats.movieHits / movieTotal : 0,
            },
            tv: {
                hits: this.stats.tvHits,
                misses: this.stats.tvMisses,
                entries: this.tvCache.size,
                hitRate: tvTotal > 0 ? this.stats.tvHits / tvTotal : 0,
            },
            combined: {
                hits: this.stats.movieHits + this.stats.tvHits,
                misses: this.stats.movieMisses + this.stats.tvMisses,
                entries: this.movieCache.size + this.tvCache.size,
                hitRate:
                    combinedTotal > 0
                        ? (this.stats.movieHits + this.stats.tvHits) / combinedTotal
                        : 0,
            },
        }
    }

    /**
     * Get cache size info
     */
    getSize(): { movies: number; tv: number; total: number } {
        return {
            movies: this.movieCache.size,
            tv: this.tvCache.size,
            total: this.movieCache.size + this.tvCache.size,
        }
    }
}

// Singleton instance
export const certificationCache = new CertificationCache()

// Periodic cleanup of expired entries (every 10 minutes)
if (typeof setInterval !== 'undefined') {
    setInterval(
        () => {
            certificationCache.clearExpired()
        },
        1000 * 60 * 10
    ) // 10 minutes
}

// Attach to window for debugging (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    ;(window as any).certificationCache = certificationCache
}
