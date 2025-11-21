/**
 * Seed Hidden Content
 */

import { Content } from '../../typings'
import { getContentSlice } from './sampleContent'

export interface SeedHiddenOptions {
    userId: string
    count: number
    isGuest: boolean
    startIndex?: number
}

export async function seedHiddenContent(options: SeedHiddenOptions): Promise<void> {
    const { userId, count, isGuest, startIndex = 0 } = options

    if (count <= 0) {
        console.log('  ⏭️  Skipping hidden content (count = 0)')
        return
    }

    console.log(`  👁️ Adding ${count} hidden items`)

    const { useAuthStore } = await import('../../stores/authStore')
    const { useGuestStore } = await import('../../stores/guestStore')

    const content = getContentSlice(startIndex, count)

    for (const item of content) {
        if (isGuest) {
            await useGuestStore.getState().addHiddenMovie(item)
        } else {
            await useAuthStore.getState().addHiddenMovie(item)
        }
    }
}
