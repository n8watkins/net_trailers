/**
 * Migration: Fix Collection Display Settings
 *
 * Updates all existing user collections to have proper display settings:
 * - Sets mediaType to 'both' (display on home page)
 * - Sets displayAsRow to true (enable display)
 *
 * This fixes collections created before the display settings were added.
 */

import { useAuthStore } from '../../stores/authStore'
import { useGuestStore } from '../../stores/guestStore'
import { useSessionStore } from '../../stores/sessionStore'

export async function fixCollectionDisplaySettings(): Promise<{
    success: boolean
    updated: number
    skipped: number
    errors: number
}> {
    console.log('🔧 Starting collection display settings migration...')

    const sessionType = useSessionStore.getState().sessionType
    const getUserId = useSessionStore.getState().getUserId
    const userId = getUserId()

    if (!userId) {
        console.error('❌ No user ID found - cannot migrate collections')
        return { success: false, updated: 0, skipped: 0, errors: 0 }
    }

    const isGuest = sessionType === 'guest'
    const store = isGuest ? useGuestStore.getState() : useAuthStore.getState()

    // Get all user collections
    const collections = store.userCreatedWatchlists || []

    if (collections.length === 0) {
        console.log('ℹ️  No collections found to migrate')
        return { success: true, updated: 0, skipped: 0, errors: 0 }
    }

    console.log(`📊 Found ${collections.length} collections to check`)

    let updated = 0
    let skipped = 0
    let errors = 0

    for (const collection of collections) {
        try {
            const updates: any = {}
            let needsUpdate = false

            // Check if mediaType needs to be set
            if (!collection.mediaType || collection.mediaType !== 'both') {
                console.log(`  📺 Collection "${collection.name}" - setting mediaType to 'both'`)
                updates.mediaType = 'both'
                needsUpdate = true
            }

            // Check if displayAsRow needs to be set
            if (collection.displayAsRow !== true) {
                console.log(`  👁️  Collection "${collection.name}" - enabling displayAsRow`)
                updates.displayAsRow = true
                needsUpdate = true
            }

            if (needsUpdate) {
                // Update the collection
                await store.updateList(collection.id, updates)
                console.log(`  ✅ Updated collection: ${collection.name}`)
                updated++
            } else {
                console.log(`  ⏭️  Collection "${collection.name}" - already has correct settings`)
                skipped++
            }

            // Small delay to avoid overwhelming the system
            await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (error) {
            console.error(`  ❌ Failed to update collection "${collection.name}":`, error)
            errors++
        }
    }

    console.log('\n📈 Migration Summary:')
    console.log(`  ✅ Updated: ${updated}`)
    console.log(`  ⏭️  Skipped: ${skipped}`)
    console.log(`  ❌ Errors: ${errors}`)

    if (errors === 0) {
        console.log('✨ Migration completed successfully!')
        return { success: true, updated, skipped, errors }
    } else {
        console.log('⚠️  Migration completed with errors')
        return { success: false, updated, skipped, errors }
    }
}

/**
 * Migration for system row preferences
 * Ensures all system collections are enabled by default
 */
export async function fixSystemRowPreferences(): Promise<{
    success: boolean
    message: string
}> {
    console.log('🔧 Checking system row preferences...')

    const sessionType = useSessionStore.getState().sessionType
    const getUserId = useSessionStore.getState().getUserId
    const userId = getUserId()

    if (!userId) {
        console.error('❌ No user ID found')
        return { success: false, message: 'No user ID found' }
    }

    const isGuest = sessionType === 'guest'

    if (isGuest) {
        console.log('ℹ️  Guest users use default system row settings')
        return { success: true, message: 'Guest users already have default settings' }
    }

    const { useCollectionPrefsStore } = await import('../../stores/collectionPrefsStore')
    const { SystemRowStorage } = await import('../systemRowStorage')

    // Get current preferences
    const systemRowPreferences =
        useCollectionPrefsStore.getState().systemRowPreferences.get(userId) || {}

    // Check if any preferences exist
    if (Object.keys(systemRowPreferences).length === 0) {
        console.log('ℹ️  No system row preferences found - using defaults (all enabled)')
        return { success: true, message: 'Using default settings (all enabled)' }
    }

    // Count disabled rows
    const disabledRows = Object.entries(systemRowPreferences).filter(
        ([_, pref]) => pref.enabled === false
    )

    if (disabledRows.length === 0) {
        console.log('✅ All system rows are already enabled')
        return { success: true, message: 'All system rows already enabled' }
    }

    console.log(`📊 Found ${disabledRows.length} disabled system rows`)
    console.log('ℹ️  You can enable them via Settings > Collections > Reset to Defaults')

    return {
        success: true,
        message: `${disabledRows.length} system rows are disabled. Use "Reset to Defaults" in settings to enable them.`,
    }
}
