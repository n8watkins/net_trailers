/**
 * Seed Liked Content
 */

import { Content } from '../../typings'
import { getContentSlice } from './sampleContent'

export interface SeedLikedOptions {
    userId: string
    count: number
    isGuest: boolean
    startIndex?: number
}

export async function seedLikedContent(options: SeedLikedOptions): Promise<void> {
    const { userId, count, isGuest, startIndex = 0 } = options

    if (count <= 0) {
        console.log('  ⏭️  Skipping liked content (count = 0)')
        return
    }

    console.log(`  ✅ Adding ${count} liked items`)

    const { useAuthStore } = await import('../../stores/authStore')
    const { useGuestStore } = await import('../../stores/guestStore')

    const content = getContentSlice(startIndex, count)

    for (const item of content) {
        if (isGuest) {
            await useGuestStore.getState().addLikedMovie(item)
        } else {
            await useAuthStore.getState().addLikedMovie(item)
        }
    }
}
