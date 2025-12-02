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

    // Create more realistic watch history with multiple entries per day
    // Distribution: More recent activity, with varied times throughout each day
    for (let i = 0; i < content.length; i++) {
        const item = content[i]

        useWatchHistoryStore.getState().addWatchEntry(item.id, item.media_type, item)

        // Create realistic timestamp distribution
        // More entries in recent days, with multiple views per day
        if (i > 0) {
            let watchedAt: number

            // Distribution strategy:
            // - First 20%: Today (spread throughout the day)
            // - Next 30%: Last 3 days (2-4 entries per day)
            // - Next 30%: Last 2 weeks (1-2 entries per day)
            // - Last 20%: Last 2 months (scattered)

            const percentile = i / content.length

            if (percentile < 0.2) {
                // Today - spread throughout the day (morning to now)
                const hoursAgo = Math.random() * 16 // 0-16 hours ago
                watchedAt = now - hoursAgo * 60 * 60 * 1000
            } else if (percentile < 0.5) {
                // Last 3 days - multiple entries per day
                const daysAgo = 1 + Math.random() * 2 // 1-3 days ago
                const hourOfDay = Math.floor(Math.random() * 16) + 8 // 8am-11pm
                watchedAt = now - daysAgo * 24 * 60 * 60 * 1000 + hourOfDay * 60 * 60 * 1000
            } else if (percentile < 0.8) {
                // Last 2 weeks
                const daysAgo = 3 + Math.random() * 11 // 3-14 days ago
                const hourOfDay = Math.floor(Math.random() * 14) + 10 // 10am-11pm
                watchedAt = now - daysAgo * 24 * 60 * 60 * 1000 + hourOfDay * 60 * 60 * 1000
            } else {
                // Last 2 months - scattered
                const daysAgo = 14 + Math.random() * 46 // 14-60 days ago
                const hourOfDay = Math.floor(Math.random() * 12) + 10 // 10am-9pm
                watchedAt = now - daysAgo * 24 * 60 * 60 * 1000 + hourOfDay * 60 * 60 * 1000
            }

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
