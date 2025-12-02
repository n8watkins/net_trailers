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

    console.log('  📊 SEED DEBUG: Starting watch history seed')
    console.log(`     Total content items: ${content.length}`)
    console.log(`     Current time: ${new Date(now).toLocaleString()}`)

    // Create realistic watch history with MULTIPLE entries per day
    // Strategy: Group entries by specific calendar days, then assign random times within each day

    // Define our viewing schedule (days ago -> number of entries)
    // This ensures multiple entries land on the same calendar day
    const viewingSchedule: Array<{ daysAgo: number; entriesCount: number }> = [
        { daysAgo: 0, entriesCount: 8 }, // Today: 8 entries
        { daysAgo: 1, entriesCount: 6 }, // Yesterday: 6 entries
        { daysAgo: 2, entriesCount: 5 }, // 2 days ago: 5 entries
        { daysAgo: 3, entriesCount: 4 }, // 3 days ago: 4 entries
        { daysAgo: 5, entriesCount: 3 }, // 5 days ago: 3 entries
        { daysAgo: 7, entriesCount: 3 }, // 1 week ago: 3 entries
        { daysAgo: 10, entriesCount: 2 }, // 10 days ago: 2 entries
        { daysAgo: 14, entriesCount: 2 }, // 2 weeks ago: 2 entries
        { daysAgo: 20, entriesCount: 2 }, // ~3 weeks ago: 2 entries
        { daysAgo: 28, entriesCount: 2 }, // 4 weeks ago: 2 entries
        { daysAgo: 35, entriesCount: 1 }, // 5 weeks ago: 1 entry
        { daysAgo: 42, entriesCount: 1 }, // 6 weeks ago: 1 entry
        { daysAgo: 50, entriesCount: 1 }, // ~7 weeks ago: 1 entry
        { daysAgo: 58, entriesCount: 1 }, // ~8 weeks ago: 1 entry
    ]

    // Flatten schedule into individual entries with specific days
    const scheduledEntries: Array<{ daysAgo: number; entryIndex: number; entriesCount: number }> =
        []
    viewingSchedule.forEach((day) => {
        for (let i = 0; i < day.entriesCount; i++) {
            scheduledEntries.push({
                daysAgo: day.daysAgo,
                entryIndex: i,
                entriesCount: day.entriesCount,
            })
        }
    })

    console.log(`     Scheduled entries from viewingSchedule: ${scheduledEntries.length}`)

    // Add remaining entries as scattered older content
    const totalScheduled = scheduledEntries.length
    if (content.length > totalScheduled) {
        const remaining = content.length - totalScheduled
        console.log(`     Adding ${remaining} scattered entries for older dates`)
        for (let i = 0; i < remaining; i++) {
            // Scatter across older dates (60-120 days ago)
            const daysAgo = 60 + Math.floor(Math.random() * 60)
            scheduledEntries.push({ daysAgo, entryIndex: 0, entriesCount: 1 })
        }
    }

    console.log(`     Total scheduled entries: ${scheduledEntries.length}`)

    // Process all content with assigned timestamps
    console.log('  🔄 Processing entries and assigning timestamps...')
    for (let i = 0; i < content.length; i++) {
        const item = content[i]
        useWatchHistoryStore.getState().addWatchEntry(item.id, item.media_type, item)

        // ALL entries need timestamps (skip only the very first one which uses 'now')
        if (i > 0 && i <= scheduledEntries.length) {
            const schedule = scheduledEntries[i - 1] // Adjust index since we skip i=0
            const daysAgo = schedule.daysAgo
            const entryIndex = schedule.entryIndex

            // Start of the day (midnight)
            const startOfDay = new Date(now)
            startOfDay.setHours(0, 0, 0, 0)
            const dayStart = startOfDay.getTime() - daysAgo * 24 * 60 * 60 * 1000

            // Generate time within the day based on entry index
            // Multiple entries on same day get different times
            let watchedAt: number

            if (daysAgo === 0) {
                // Today: spread from morning (8am) to now
                const morningStart = dayStart + 8 * 60 * 60 * 1000
                const timeRange = now - morningStart
                const segment = timeRange / 8 // Divide into segments for each entry
                watchedAt = morningStart + segment * entryIndex + Math.random() * segment
            } else {
                // Other days: spread throughout waking hours (8am - 11pm = 15 hours)
                const wakingHours = 15
                const segment = wakingHours / Math.max(schedule.entriesCount || 1, 1) // Hours per entry
                const hour = 8 + segment * entryIndex + Math.random() * segment
                const minutes = Math.floor(Math.random() * 60)
                watchedAt = dayStart + hour * 60 * 60 * 1000 + minutes * 60 * 1000
            }

            // Update the timestamp of the entry we just added (at index 0)
            const history = useWatchHistoryStore.getState().history
            const justAddedEntry = history[0] // New entries are added to the START of the array
            if (justAddedEntry) {
                useWatchHistoryStore.setState({
                    history: history.map((entry) =>
                        entry.id === justAddedEntry.id ? { ...entry, watchedAt } : entry
                    ),
                })

                // Log every 10th entry to avoid spam
                if (i % 10 === 0 || i < 10) {
                    console.log(
                        `     Entry ${i}: ${daysAgo} days ago, index ${entryIndex}/${schedule.entriesCount} → ${new Date(watchedAt).toLocaleString()}`
                    )
                }
            }
        } else if (i === 0) {
            console.log(`     Entry 0: Using current time (${new Date(now).toLocaleString()})`)
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

    // Verify final state - group by date to confirm multiple entries per day
    const finalHistory = useWatchHistoryStore.getState().history
    const dateGroups = new Map<string, number>()
    finalHistory.forEach((entry) => {
        const date = new Date(entry.watchedAt).toLocaleDateString('en-US')
        dateGroups.set(date, (dateGroups.get(date) || 0) + 1)
    })

    console.log('  📊 FINAL VERIFICATION:')
    console.log(`     Total entries: ${finalHistory.length}`)
    console.log(`     Unique dates: ${dateGroups.size}`)
    console.log(`     Entries per date (first 10):`)
    Array.from(dateGroups.entries())
        .slice(0, 10)
        .forEach(([date, entries]) => {
            console.log(`       ${date}: ${entries} entries`)
        })

    console.log('  ✅ Watch history saved')
}
