/**
 * Seed Watch History
 */

import { Content } from '../../typings'
import { getContentSlice } from './sampleContent'

export interface SeedWatchHistoryOptions {
    userId: string
    count: number
    isGuest: boolean
    startIndex?: number
    shuffledContent?: Content[]
}

export async function seedWatchHistoryContent(options: SeedWatchHistoryOptions): Promise<void> {
    const { userId, count, isGuest, startIndex = 0, shuffledContent } = options

    if (count <= 0) {
        console.log('  ⏭️  Skipping watch history (count = 0)')
        return
    }

    console.log(`  🎬 Adding ${count} watch history items`)

    const { useWatchHistoryStore } = await import('../../stores/watchHistoryStore')

    // SESSION ISOLATION: Verify we're seeding for the correct user
    const currentSessionId = useWatchHistoryStore.getState().currentSessionId
    if (currentSessionId && currentSessionId !== userId) {
        console.error(
            `  ❌ Session isolation violation! Current session: ${currentSessionId}, attempting to seed for: ${userId}`
        )
        throw new Error(
            'Cannot seed watch history: session ID mismatch. Another user session is active.'
        )
    }

    // Clear existing and set session
    useWatchHistoryStore.getState().clearHistory()
    useWatchHistoryStore.setState({
        currentSessionId: userId,
        lastSyncedAt: null,
        syncError: null,
    })

    const content = getContentSlice(startIndex, count, shuffledContent)
    const now = Date.now()

    for (let i = 0; i < content.length; i++) {
        const item = content[i]
        const progress = Math.random() > 0.5 ? 100 : Math.floor(Math.random() * 90) + 10

        useWatchHistoryStore
            .getState()
            .addWatchEntry(item.id, item.media_type, item, progress, undefined, undefined)

        // Spread entries over days
        if (i > 0) {
            const watchedAt = now - i * 24 * 60 * 60 * 1000
            const history = useWatchHistoryStore.getState().history
            const lastEntry = history[history.length - 1]
            if (lastEntry) {
                useWatchHistoryStore.setState({
                    history: history.map((entry) =>
                        entry.id === lastEntry.id ? { ...entry, watchedAt } : entry
                    ),
                })
            }
        }
    }

    // Persist
    if (!isGuest) {
        const { saveWatchHistory } = await import('../../utils/firestore/watchHistory')
        await saveWatchHistory(userId, useWatchHistoryStore.getState().history)
    } else {
        useWatchHistoryStore.getState().saveGuestSession(userId)
    }

    useWatchHistoryStore.setState({
        currentSessionId: userId,
        lastSyncedAt: Date.now(),
        syncError: null,
    })

    console.log('  ✅ Watch history saved')
}
