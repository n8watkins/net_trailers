import { useCallback, useRef } from 'react'
import type { Content } from '../../typings'
import type { SearchFilters } from '../../stores/searchStore'
import { guestLog, guestError } from '../../utils/debugLogger'
import { applyFilters } from './useSearchFilters'

// TMDB hard limit: 500 pages maximum (10,000 results)
const TMDB_MAX_PAGE = 500
const RESULTS_PER_PAGE = 20

interface LoadResultsOptions {
    maxPages?: number
    loadAll?: boolean
}

interface LoadResultsResult {
    allResults: Content[]
    filtered: Content[]
    finalPage: number
    wasTruncated: boolean
    hasAllResults: boolean
}

/**
 * Hook for managing search pagination and bulk result loading
 *
 * Provides:
 * - Quick search loading (first N pages for filtering)
 * - Load all results (for dedicated search page)
 * - Proper abort handling for cancelled requests
 * - TMDB API pagination limits handling
 *
 * @param params - Configuration object
 * @returns Object with pagination functions
 */
export function useSearchPagination({
    query,
    childSafetyEnabled,
    currentResults,
    currentPage,
    totalResults,
    filters,
    onUpdate,
}: {
    query: string
    childSafetyEnabled: boolean
    currentResults: Content[]
    currentPage: number
    totalResults: number
    filters: SearchFilters
    onUpdate: (update: {
        results?: Content[]
        filteredResults?: Content[]
        currentPage?: number
        hasAllResults?: boolean
        isTruncated?: boolean
        isLoadingAll?: boolean
    }) => void
}) {
    const abortControllerRef = useRef<AbortController | undefined>(undefined)

    /**
     * Generic function to load multiple pages of results
     * Consolidates logic for both quick search and load all scenarios
     */
    const loadMultiplePages = useCallback(
        async (options: LoadResultsOptions = {}): Promise<LoadResultsResult | null> => {
            const { maxPages = Infinity, loadAll = false } = options

            // Cancel previous request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }

            const currentController = new AbortController()
            abortControllerRef.current = currentController

            try {
                const allResults = [...currentResults]
                let currentPageNum = currentPage + 1
                let wasTruncated = false

                const calculatedPages = Math.max(1, Math.ceil(totalResults / RESULTS_PER_PAGE))
                const targetPages = Math.min(maxPages, calculatedPages, TMDB_MAX_PAGE)

                const logPrefix = loadAll ? '[LoadAll]' : '[QuickSearch]'
                guestLog(`${logPrefix} Loading additional pages:`, {
                    totalResults,
                    calculatedPages,
                    targetPages,
                    startPage: currentPageNum,
                })

                // Load pages until we hit a limit
                while (
                    currentPageNum <= targetPages &&
                    (loadAll ? allResults.length < totalResults : currentPageNum <= maxPages)
                ) {
                    const url = `/api/search?query=${encodeURIComponent(query.trim())}&page=${currentPageNum}&childSafetyMode=${childSafetyEnabled}`
                    const response = await fetch(url, {
                        signal: currentController.signal,
                    })

                    if (!response.ok) {
                        guestError(
                            `${logPrefix} API error at page`,
                            currentPageNum,
                            response.statusText
                        )
                        wasTruncated = true
                        break
                    }

                    const data = await response.json()

                    // Short-circuit if API returns no results
                    if (!data.results || data.results.length === 0) {
                        guestLog(`${logPrefix} No more results at page`, currentPageNum)
                        break
                    }

                    allResults.push(...data.results)
                    currentPageNum++

                    // Short-circuit if we got fewer than 20 results (last page)
                    if (data.results.length < RESULTS_PER_PAGE) {
                        guestLog(
                            `${logPrefix} Received partial page, stopping at page`,
                            currentPageNum - 1
                        )
                        break
                    }
                }

                // Check if we stopped early due to limits
                if (!loadAll && currentPageNum > maxPages && allResults.length < totalResults) {
                    wasTruncated = true
                    guestLog(`${logPrefix} Truncated: Reached maxPages limit`)
                }

                if (currentPageNum > TMDB_MAX_PAGE && allResults.length < totalResults) {
                    wasTruncated = true
                    guestLog(`${logPrefix} Truncated: Hit TMDB 500-page limit`)
                }

                guestLog(
                    `${logPrefix} Loaded`,
                    allResults.length,
                    'total results across',
                    currentPageNum - currentPage - 1,
                    'pages',
                    wasTruncated ? '(TRUNCATED)' : ''
                )

                const filtered = await applyFilters(allResults, filters)

                return {
                    allResults,
                    filtered,
                    finalPage: currentPageNum - 1,
                    wasTruncated,
                    hasAllResults: allResults.length >= totalResults,
                }
            } catch (error) {
                if ((error as { name?: string }).name !== 'AbortError') {
                    const logPrefix = loadAll ? '[LoadAll]' : '[QuickSearch]'
                    guestError(`${logPrefix} Error:`, error)
                    return {
                        allResults: currentResults,
                        filtered: [],
                        finalPage: currentPage,
                        wasTruncated: true,
                        hasAllResults: false,
                    }
                }
                // AbortError is expected when cancelling - return null to indicate cancellation
                return null
            }
        },
        [query, childSafetyEnabled, currentResults, currentPage, totalResults, filters]
    )

    /**
     * Load first N pages for quick search filtering (lighter than loading all)
     * Default: 5 pages = 100 results
     */
    const loadQuickSearchResults = useCallback(
        async (maxPages: number = 5) => {
            onUpdate({ isLoadingAll: true })

            const result = await loadMultiplePages({ maxPages, loadAll: false })

            if (result) {
                onUpdate({
                    results: result.allResults,
                    filteredResults: result.filtered,
                    isLoadingAll: false,
                    hasAllResults: result.hasAllResults,
                    isTruncated: result.wasTruncated,
                    currentPage: result.finalPage,
                })
            } else {
                // Request was aborted
                onUpdate({ isLoadingAll: false })
            }
        },
        [loadMultiplePages, onUpdate]
    )

    /**
     * Load all remaining results (for /search page)
     * Loads until we have all results or hit TMDB's 500-page limit
     */
    const loadAllResults = useCallback(async () => {
        onUpdate({ isLoadingAll: true })

        const result = await loadMultiplePages({ loadAll: true })

        if (result) {
            onUpdate({
                results: result.allResults,
                filteredResults: result.filtered,
                hasAllResults: result.hasAllResults,
                isTruncated: result.wasTruncated,
                isLoadingAll: false,
                currentPage: result.finalPage,
            })
        } else {
            // Request was aborted
            onUpdate({ isLoadingAll: false })
        }
    }, [loadMultiplePages, onUpdate])

    /**
     * Cleanup function to abort any ongoing requests
     */
    const cancelRequests = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = undefined
        }
    }, [])

    return {
        loadQuickSearchResults,
        loadAllResults,
        cancelRequests,
    }
}
