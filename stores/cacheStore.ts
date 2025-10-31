import { create } from 'zustand'
import { Content } from '../typings'
import { cacheLog, cacheError } from '../utils/debugLogger'

export interface MainPageData {
    trending: Content[]
    topRatedMovies: Content[]
    actionMovies: Content[]
    comedyMovies: Content[]
    horrorMovies: Content[]
    romanceMovies: Content[]
    documentaries: Content[]
    lastFetched: number
}

export interface CacheStatus {
    mainPageCached: boolean
    lastCacheUpdate: number
    cacheHits: number
    cacheMisses: number
}

export interface CacheState {
    mainPageData: MainPageData | null
    hasVisitedMainPage: boolean
    cacheStatus: CacheStatus
}

export interface CacheActions {
    setMainPageData: (data: MainPageData | null) => void
    setHasVisitedMainPage: (visited: boolean) => void
    recordCacheHit: () => void
    recordCacheMiss: () => void
    clearCache: () => void
}

export type CacheStore = CacheState & CacheActions

// Helper to load from sessionStorage
const loadMainPageData = (): MainPageData | null => {
    if (typeof window === 'undefined') return null

    try {
        const saved = sessionStorage.getItem('nettrailer-main-page-data')
        if (saved) {
            const parsed = JSON.parse(saved)
            // Check if data is less than 30 minutes old
            if (Date.now() - parsed.lastFetched < 30 * 60 * 1000) {
                cacheLog('📦 [CacheStore] Loaded cached main page data from sessionStorage')
                return parsed
            } else {
                // Clear expired data
                sessionStorage.removeItem('nettrailer-main-page-data')
                cacheLog('🗑️ [CacheStore] Cleared expired cache (>30 minutes old)')
                return null
            }
        }
    } catch (error) {
        cacheError('Failed to parse cached main page data:', error)
        sessionStorage.removeItem('nettrailer-main-page-data')
    }

    return null
}

// Helper to save to sessionStorage
const saveMainPageData = (data: MainPageData | null) => {
    if (typeof window === 'undefined') return

    try {
        if (data) {
            sessionStorage.setItem('nettrailer-main-page-data', JSON.stringify(data))
            cacheLog('💾 [CacheStore] Saved main page data to sessionStorage')
        } else {
            sessionStorage.removeItem('nettrailer-main-page-data')
            cacheLog('🗑️ [CacheStore] Cleared main page data from sessionStorage')
        }
    } catch (error) {
        cacheError('Failed to save cached main page data:', error)
    }
}

export const useCacheStore = create<CacheStore>((set, get) => ({
    // Initial state - load from sessionStorage
    mainPageData: loadMainPageData(),
    hasVisitedMainPage: false,
    cacheStatus: {
        mainPageCached: loadMainPageData() !== null,
        lastCacheUpdate: loadMainPageData()?.lastFetched || 0,
        cacheHits: 0,
        cacheMisses: 0,
    },

    // Actions
    setMainPageData: (data: MainPageData | null) => {
        // Save to sessionStorage
        saveMainPageData(data)

        // Update state
        set({
            mainPageData: data,
            cacheStatus: {
                mainPageCached: data !== null,
                lastCacheUpdate: data?.lastFetched || 0,
                cacheHits: get().cacheStatus.cacheHits,
                cacheMisses: get().cacheStatus.cacheMisses,
            },
        })
    },

    setHasVisitedMainPage: (visited: boolean) => {
        set({ hasVisitedMainPage: visited })
    },

    recordCacheHit: () => {
        set((state) => ({
            cacheStatus: {
                ...state.cacheStatus,
                cacheHits: state.cacheStatus.cacheHits + 1,
            },
        }))
        cacheLog('✅ [CacheStore] Cache hit recorded')
    },

    recordCacheMiss: () => {
        set((state) => ({
            cacheStatus: {
                ...state.cacheStatus,
                cacheMisses: state.cacheStatus.cacheMisses + 1,
            },
        }))
        cacheLog('❌ [CacheStore] Cache miss recorded')
    },

    clearCache: () => {
        saveMainPageData(null)
        set({
            mainPageData: null,
            hasVisitedMainPage: false,
            cacheStatus: {
                mainPageCached: false,
                lastCacheUpdate: 0,
                cacheHits: 0,
                cacheMisses: 0,
            },
        })
        cacheLog('🧹 [CacheStore] Cache cleared')
    },
}))
