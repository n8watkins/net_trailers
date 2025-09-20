import { atom } from 'recoil'
import { Content } from '../typings'

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

// Cache for main page data to avoid refetching when navigating back
export const mainPageDataState = atom<MainPageData | null>({
    key: 'mainPageDataState_v1',
    default: null,
    effects: [
        ({ setSelf, onSet }) => {
            // Load from sessionStorage on initialization (only for current session)
            if (typeof window !== 'undefined') {
                const saved = sessionStorage.getItem('nettrailer-main-page-data')
                if (saved) {
                    try {
                        const parsed = JSON.parse(saved)
                        // Check if data is less than 30 minutes old
                        if (Date.now() - parsed.lastFetched < 30 * 60 * 1000) {
                            setSelf(parsed)
                        } else {
                            // Clear expired data
                            sessionStorage.removeItem('nettrailer-main-page-data')
                        }
                    } catch (error) {
                        console.error('Failed to parse cached main page data:', error)
                        sessionStorage.removeItem('nettrailer-main-page-data')
                    }
                }
            }

            // Save to sessionStorage whenever it changes
            onSet((newValue) => {
                if (typeof window !== 'undefined') {
                    if (newValue) {
                        sessionStorage.setItem('nettrailer-main-page-data', JSON.stringify(newValue))
                    } else {
                        sessionStorage.removeItem('nettrailer-main-page-data')
                    }
                }
            })
        }
    ]
})

// Track if user has visited main page in this session
export const hasVisitedMainPageState = atom<boolean>({
    key: 'hasVisitedMainPageState_v1',
    default: false
})

// Cache status tracking
export interface CacheStatus {
    mainPageCached: boolean
    lastCacheUpdate: number
    cacheHits: number
    cacheMisses: number
}

export const cacheStatusState = atom<CacheStatus>({
    key: 'cacheStatusState_v2',
    default: {
        mainPageCached: false,
        lastCacheUpdate: 0,
        cacheHits: 0,
        cacheMisses: 0
    }
})