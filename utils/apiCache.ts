interface CacheEntry<T> {
    data: T
    timestamp: number
    expiresAt: number
}

interface CacheOptions {
    ttl?: number // Time to live in milliseconds (default: 5 minutes)
    maxSize?: number // Maximum number of entries (default: 100)
}

class ApiCache {
    private cache = new Map<string, CacheEntry<any>>()
    private defaultTTL = 5 * 60 * 1000 // 5 minutes
    private maxSize = 100

    constructor(options?: CacheOptions) {
        if (options?.ttl) this.defaultTTL = options.ttl
        if (options?.maxSize) this.maxSize = options.maxSize
    }

    private generateKey(url: string, params?: Record<string, any>): string {
        const paramStr = params ? JSON.stringify(params) : ''
        return `${url}:${paramStr}`
    }

    private isExpired(entry: CacheEntry<any>): boolean {
        return Date.now() > entry.expiresAt
    }

    private evictOldEntries(): void {
        // Remove expired entries
        const entries = Array.from(this.cache.entries())
        for (const [key, entry] of entries) {
            if (this.isExpired(entry)) {
                this.cache.delete(key)
            }
        }

        // Remove oldest entries if cache is too large
        if (this.cache.size > this.maxSize) {
            const allEntries = Array.from(this.cache.entries())
            allEntries.sort((a, b) => a[1].timestamp - b[1].timestamp)

            const entriesToRemove = allEntries.slice(0, this.cache.size - this.maxSize)
            entriesToRemove.forEach(([key]) => this.cache.delete(key))
        }
    }

    get<T>(url: string, params?: Record<string, any>): T | null {
        const key = this.generateKey(url, params)
        const entry = this.cache.get(key)

        if (!entry || this.isExpired(entry)) {
            this.cache.delete(key)
            return null
        }

        return entry.data as T
    }

    set<T>(url: string, data: T, params?: Record<string, any>, customTTL?: number): void {
        this.evictOldEntries()

        const key = this.generateKey(url, params)
        const ttl = customTTL || this.defaultTTL
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            expiresAt: Date.now() + ttl
        }

        this.cache.set(key, entry)
    }

    invalidate(url: string, params?: Record<string, any>): void {
        const key = this.generateKey(url, params)
        this.cache.delete(key)
    }

    invalidatePattern(pattern: string): void {
        const keys = Array.from(this.cache.keys())
        for (const key of keys) {
            if (key.includes(pattern)) {
                this.cache.delete(key)
            }
        }
    }

    clear(): void {
        this.cache.clear()
    }

    getStats(): { size: number; maxSize: number; entries: Array<{ key: string; timestamp: number; expiresAt: number }> } {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
                key,
                timestamp: entry.timestamp,
                expiresAt: entry.expiresAt
            }))
        }
    }
}

// Create different cache instances for different types of data
export const searchCache = new ApiCache({ ttl: 10 * 60 * 1000, maxSize: 50 }) // 10 minutes for search results
export const movieCache = new ApiCache({ ttl: 30 * 60 * 1000, maxSize: 200 }) // 30 minutes for movie data
export const mainPageCache = new ApiCache({ ttl: 60 * 60 * 1000, maxSize: 20 }) // 1 hour for main page content

// Cached fetch wrapper
export async function cachedFetch<T>(
    url: string,
    cache: ApiCache,
    params?: Record<string, any>,
    customTTL?: number
): Promise<T> {
    // Try to get from cache first
    const cached = cache.get<T>(url, params)
    if (cached) {
        return cached
    }

    // Build URL with params
    const searchParams = new URLSearchParams()
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                searchParams.append(key, String(value))
            }
        })
    }

    const fullUrl = params && searchParams.toString()
        ? `${url}?${searchParams.toString()}`
        : url

    // Fetch from API
    const response = await fetch(fullUrl)
    if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Cache the result
    cache.set(url, data, params, customTTL)

    return data
}