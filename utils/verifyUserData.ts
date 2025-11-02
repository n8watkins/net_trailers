/**
 * Utility to verify user data is correctly isolated per user
 * Note: This uses a legacy data format for debugging purposes
 */

export function verifyUserData(userId: string | undefined, data: unknown) {
    // Type guard for legacy data format
    const typedData = data as {
        watchlist?: Array<{ id: number; title?: string; name?: string }>
        ratings?: unknown[]
        userLists?: { lists?: Array<{ id: string; name: string; items?: unknown[] }> }
    }

    console.log('🔍 [Data Verification] Checking user data isolation:', {
        currentUserId: userId,
        dataCheck: {
            hasWatchlist: !!typedData?.watchlist,
            watchlistCount: typedData?.watchlist?.length || 0,
            watchlistSample:
                typedData?.watchlist?.slice(0, 3).map((w) => ({
                    id: w.id,
                    title: w.title || w.name,
                })) || [],
            hasRatings: !!typedData?.ratings,
            ratingsCount: typedData?.ratings?.length || 0,
            hasLists: !!typedData?.userLists,
            listsCount: typedData?.userLists?.lists?.length || 0,
            customLists:
                typedData?.userLists?.lists?.map((l) => ({
                    id: l.id,
                    name: l.name,
                    items: l.items?.length || 0,
                })) || [],
        },
        timestamp: new Date().toISOString(),
    })

    // Return verification result
    return {
        userId,
        isAuthenticated: !!userId,
        hasData: !!(
            typedData?.watchlist?.length ||
            typedData?.ratings?.length ||
            typedData?.userLists?.lists?.length
        ),
        summary: {
            watchlist: typedData?.watchlist?.length || 0,
            ratings: typedData?.ratings?.length || 0,
            lists: typedData?.userLists?.lists?.length || 0,
            totalItems: (typedData?.watchlist?.length || 0) + (typedData?.ratings?.length || 0),
        },
    }
}

/**
 * Compare two users' data to ensure they're different
 */
export function compareUserData(user1Data: unknown, user2Data: unknown) {
    // Type guard for legacy data format
    const typed1 = user1Data as {
        watchlist?: Array<{ id: number }>
        userLists?: { lists?: Array<{ id: string }> }
    }
    const typed2 = user2Data as {
        watchlist?: Array<{ id: number }>
        userLists?: { lists?: Array<{ id: string }> }
    }

    const user1Watchlist = new Set(typed1?.watchlist?.map((w) => w.id) || [])
    const user2Watchlist = new Set(typed2?.watchlist?.map((w) => w.id) || [])

    const user1Lists = new Set(typed1?.userLists?.lists?.map((l) => l.id) || [])
    const user2Lists = new Set(typed2?.userLists?.lists?.map((l) => l.id) || [])

    const sharedWatchlist = Array.from(user1Watchlist).filter((id) => user2Watchlist.has(id))
    const sharedLists = Array.from(user1Lists).filter((id) => user2Lists.has(id))

    const result = {
        user1Summary: {
            watchlist: user1Watchlist.size,
            lists: user1Lists.size,
        },
        user2Summary: {
            watchlist: user2Watchlist.size,
            lists: user2Lists.size,
        },
        sharedContent: {
            watchlistItems: sharedWatchlist.length,
            lists: sharedLists.length,
        },
        isIsolated: sharedWatchlist.length === 0 && sharedLists.length === 0,
    }

    console.log('👥 [Data Comparison] Comparing two users data:', result)
    return result
}
