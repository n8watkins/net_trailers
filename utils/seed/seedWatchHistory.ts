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

    // FORCE CLEAR for seeding - we need to seed multiple users in sequence
    // Clear any existing session and history
    useWatchHistoryStore.getState().clearHistory()
    useWatchHistoryStore.setState({
        currentSessionId: userId,
        lastSyncedAt: null,
        syncError: null,
    })

    const now = Date.now()

    // Get content - cycle through available pool if count exceeds pool size
    // This allows duplicates which is realistic (people rewatch content)
    const availableContent =
        shuffledContent || (await import('./sampleContent')).getShuffledContent()
    const content: Content[] = []
    for (let i = 0; i < count; i++) {
        const index = (startIndex + i) % availableContent.length
        content.push(availableContent[index])
    }

    console.log('  📊 SEED DEBUG: Starting watch history seed')
    console.log(`     Requested: ${count} items`)
    console.log(`     Available pool: ${availableContent.length} items`)
    console.log(
        `     Generated: ${content.length} items (with ${count > availableContent.length ? 'duplicates' : 'no duplicates'})`
    )
    console.log(`     Current time: ${new Date(now).toLocaleString()}`)

    // Create realistic watch history with MULTIPLE entries per day
    // Strategy: 2 months of viewing history with more entries on recent days

    // Define viewing schedule - 2 months of realistic viewing history
    // Strategy: More entries on recent days, gradually decreasing over 60 days
    const viewingSchedule: Array<{ daysAgo: number; entriesCount: number }> = []

    // Past week (days 0-6): Heavy viewing (3-4 entries per day) = ~25 entries
    for (let day = 0; day <= 6; day++) {
        viewingSchedule.push({ daysAgo: day, entriesCount: day === 0 ? 4 : 3 })
    }

    // Week 2 (days 7-13): Moderate viewing (2 entries per day) = 14 entries
    for (let day = 7; day <= 13; day++) {
        viewingSchedule.push({ daysAgo: day, entriesCount: 2 })
    }

    // Weeks 3-4 (days 14-27): Light viewing (1-2 entries per day) = ~21 entries
    for (let day = 14; day <= 27; day++) {
        viewingSchedule.push({ daysAgo: day, entriesCount: day % 2 === 0 ? 2 : 1 })
    }

    // Weeks 5-8 (days 28-55): Sparse viewing (1 entry every 2 days) = ~14 entries
    for (let day = 28; day <= 55; day += 2) {
        viewingSchedule.push({ daysAgo: day, entriesCount: 1 })
    }

    // Older (days 56-60): Very sparse = 1 entry
    viewingSchedule.push({ daysAgo: 60, entriesCount: 1 })

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
