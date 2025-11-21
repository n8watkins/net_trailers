/**
 * Seed Watch Later (Watchlist) Content
 */

import { Content } from '../../typings'
import { getContentSlice } from './sampleContent'

export interface SeedWatchLaterOptions {
    userId: string
    count: number
    isGuest: boolean
    startIndex?: number
}

export async function seedWatchLaterContent(options: SeedWatchLaterOptions): Promise<void> {
    const { userId, count, isGuest, startIndex = 0 } = options

    if (count <= 0) {
        console.log('  ⏭️  Skipping watch later (count = 0)')
        return
    }

    console.log(`  📺 Adding ${count} items to Watch Later`)

    const { useAuthStore } = await import('../../stores/authStore')
    const { useGuestStore } = await import('../../stores/guestStore')

    const content = getContentSlice(startIndex, count)

    for (const item of content) {
        if (isGuest) {
            await useGuestStore.getState().addToWatchlist(item)
        } else {
            await useAuthStore.getState().addToWatchlist(item)
        }
    }
}
