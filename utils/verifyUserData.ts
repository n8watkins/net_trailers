/**
 * Utility to verify user data is correctly isolated per user
 */

export function verifyUserData(userId: string | undefined, data: any) {
    console.log('🔍 [Data Verification] Checking user data isolation:', {
        currentUserId: userId,
        dataCheck: {
            hasWatchlist: !!data?.watchlist,
            watchlistCount: data?.watchlist?.length || 0,
            watchlistSample:
                data?.watchlist?.slice(0, 3).map((w: any) => ({
                    id: w.id,
                    title: w.title || w.name,
                })) || [],
            hasRatings: !!data?.ratings,
            ratingsCount: data?.ratings?.length || 0,
            hasLists: !!data?.userLists,
            listsCount: data?.userLists?.lists?.length || 0,
            customLists:
                data?.userLists?.lists?.map((l: any) => ({
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
            data?.watchlist?.length ||
            data?.ratings?.length ||
            data?.userLists?.lists?.length
        ),
        summary: {
            watchlist: data?.watchlist?.length || 0,
            ratings: data?.ratings?.length || 0,
            lists: data?.userLists?.lists?.length || 0,
            totalItems: (data?.watchlist?.length || 0) + (data?.ratings?.length || 0),
        },
    }
}

/**
 * Compare two users' data to ensure they're different
 */
export function compareUserData(user1Data: any, user2Data: any) {
    const user1Watchlist = new Set(user1Data?.watchlist?.map((w: any) => w.id) || [])
    const user2Watchlist = new Set(user2Data?.watchlist?.map((w: any) => w.id) || [])

    const user1Lists = new Set(user1Data?.userLists?.lists?.map((l: any) => l.id) || [])
    const user2Lists = new Set(user2Data?.userLists?.lists?.map((l: any) => l.id) || [])

    const sharedWatchlist = [...user1Watchlist].filter((id) => user2Watchlist.has(id))
    const sharedLists = [...user1Lists].filter((id) => user2Lists.has(id))

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
